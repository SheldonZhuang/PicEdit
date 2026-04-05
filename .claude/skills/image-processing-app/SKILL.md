---
name: image-processing-app
description: Use when building an AI image processing web app with React + FastAPI + BiRefNet/ML models. Covers full-stack architecture, BiRefNet integration, alpha mask post-processing pipeline (two-stage), adaptive anti-aliasing, CORS multi-port, Windows CPU constraints, and 9 named failure modes with fixes.
---

# AI 图片处理应用完整开发指南

## 适用场景

- AI 抠图 / 高清化 / 缩图 / 水印 等图片处理 SaaS
- React + FastAPI + 本地 ML 模型
- Windows CPU 无 GPU 环境（也适用 Linux GPU）

---

## 一、标准项目结构

```
ProjectName/
├── frontend/                         # React 18 + Vite + Tailwind
│   ├── src/
│   │   ├── api/picEditApi.js          # BASE_URL 读 VITE_API_URL
│   │   ├── context/LangContext.jsx    # 多语言 Context
│   │   ├── hooks/
│   │   │   ├── useImageUpload.js      # 文件状态管理
│   │   │   └── useProcessing.js       # API ���用 + 结果状态
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   ├── DropZone.jsx           # 上传 + 拖拽
│   │   │   ├── FeatureTabs.jsx
│   │   │   ├── ImagePreview.jsx       # 原图 vs 结果对比
│   │   │   ├── LoadingSpinner.jsx
│   │   │   ├── ErrorToast.jsx
│   │   │   └── panels/
│   │   │       ├── RemoveBgPanel.jsx
│   │   │       ├── UpscalePanel.jsx
│   │   │       ├── ResizePanel.jsx
│   │   │       └── WatermarkPanel.jsx
│   │   └── i18n/index.js              # 4 语言（中/EN/FR/ES）
│   └── .env.local                     # VITE_API_URL=http://localhost:8001
│
├── backend/                           # FastAPI + Python
│   ├── main.py                        # CORS + 路由注册
│   ├── config.py                      # 常量（路径/限制/参数）
│   ├── routers/
│   │   ├── remove_bg.py
│   │   ├── upscale.py
│   │   ├── resize.py
│   │   └── watermark.py
│   ├── models/
│   │   ├── birefnet_infer.py          # 两阶段后处理管线
│   │   ├── model_manager.py           # 单例懒加载
│   │   └── upscale_infer.py
│   ├── services/
│   │   └── image_service.py           # validate + pil_to_base64
│   └── weights/birefnet/              # 模型权重 ~424MB
│
├── Dockerfile                         # Railway 后端部署
└── vercel.json                        # Vercel 前端部署
```

---

## 二、系统架构（分层）

```
[用户] → React 组件层 → API层(picEditApi.js) → HTTP multipart/form-data
                                                         ↓
                                              FastAPI Router层
                                                  ├── validate_image()
                                                  ├── ModelManager(单例)
                                                  ├── 推理函数
                                                  └── pil_to_base64()
                                                         ↓
                                              JSON { success, image_base64, process_time_ms }
```

---

## 三、BiRefNet 集成

### 3.1 模型下载

```python
# download_model.py
from huggingface_hub import snapshot_download

snapshot_download(
    repo_id="ZhengPeng7/BiRefNet",      # general 版本
    local_dir="backend/weights/birefnet",
    ignore_patterns=["*.md", "examples/*", "*.gitattributes"],
)
# 镜像加速：HF_ENDPOINT=https://hf-mirror.com
```

### 3.2 模型加载（线程安全懒加载）

```python
class ModelManager:
    _instance = None
    _lock = threading.Lock()

    def get_birefnet(self):
        if not self._birefnet_loaded:
            with self._load_lock:
                if not self._birefnet_loaded:
                    self._birefnet = AutoModelForImageSegmentation.from_pretrained(
                        BIREFNET_DIR, trust_remote_code=True, torch_dtype="auto"
                    )
                    self._birefnet = self._birefnet.float()  # CPU 必须 float32
                    self._birefnet.eval()
                    self._birefnet_loaded = True
        return self._birefnet
```

### 3.3 预热端点（避免首次请求超时）

```python
@app.post("/api/warmup")
def warmup():
    model_manager.get_birefnet()
    return {"status": "ready"}
```

---

## 四、Alpha 掩码两阶段后处理管线（核心）

### 总体流程

```
BiRefNet 软掩码 (1024×1024, float32)
    │
    ▼ 阶段一：_refine_mask()
二值化(0.35) → 开运算去噪 → 洪水填充清除背景 → 轮廓填充 → 边缘高斯 → 颜色验证
    │
    ▼ LANCZOS 缩回原始尺寸（⚠️会重新引入软边缘）
    │
    ▼ 阶段二：_post_resize_cleanup()
二值化(127) → 洪水填充 → 轮廓填充 → 颜色验证去白残像 → 自适应抗锯齿
    │
    ▼ 合成 RGBA PNG
```

### 阶段一：`_refine_mask()`（1024×1024 空间）

```python
def _refine_mask(mask, rgb_guide):
    H, W = mask.shape

    # 1. 低阈值二值化（0.35 不是 0.5，保留更多弱前景）
    coarse = ((mask > 0.35) * 255).astype(np.uint8)
    open_k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    coarse = cv2.morphologyEx(coarse, cv2.MORPH_OPEN, open_k)  # 去噪

    # 2. 洪水填充 + 轮廓填充
    clean = _flood_fill_background(coarse)
    cnts, _ = cv2.findContours(clean, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    filled = np.zeros_like(clean)
    if cnts:
        cv2.drawContours(filled, cnts, -1, 255, thickness=cv2.FILLED)

    # 3. 边缘环高斯抗锯齿（仅外轮廓，不跨形状边界）
    edge_k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    edge_ring = (filled > 0) & (cv2.erode(filled, edge_k) == 0)
    blurred = cv2.GaussianBlur(filled.astype(np.float32), (5, 5), 1.0)
    result = filled.astype(np.float32)
    result[edge_ring] = blurred[edge_ring]

    # 4. 颜色感知清理（去接近背景色的软像素）
    guide = cv2.resize(rgb_guide, (W, H))
    bg = _sample_bg_color(guide).astype(np.float32)
    dist = np.sqrt(((guide.astype(np.float32) - bg) ** 2).sum(axis=2))
    semi = (result > 0) & (result < 255)
    result[semi] *= np.clip((dist[semi] - 30) / 30, 0, 1)

    return result.clip(0, 255).astype(np.uint8)
```

### 阶段二：`_post_resize_cleanup()`（原始分辨率）

```python
def _post_resize_cleanup(alpha_np, rgb_np):
    bg = _sample_bg_color(rgb_np).astype(np.float32)
    dist = np.sqrt(((rgb_np.astype(np.float32) - bg) ** 2).sum(axis=2))

    # 1. 二值化 + 洪水填充 + 轮廓填充
    binary = ((alpha_np > 127) * 255).astype(np.uint8)
    clean = _flood_fill_background(binary)
    filled = _contour_fill(clean)

    # 2. 颜色验证：去掉背景色渗入的"前景"像素（白色残像）
    filled[(filled > 0) & (dist < 40)] = 0
    filled = _contour_fill(_flood_fill_background(filled))  # 重建

    # 3. 自适应边缘抗锯齿（核心）
    edge_k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    num_labels, labels = cv2.connectedComponents(filled)
    result = filled.astype(np.float32)

    for lid in range(1, num_labels):
        shape = (labels == lid).astype(np.uint8) * 255
        shape_edge = (shape > 0) & (cv2.erode(shape, edge_k) == 0)
        other = ((labels > 0) & (labels != lid)).astype(np.uint8) * 255
        other_dilated = cv2.dilate(other, edge_k)

        # 仅面向背景的边缘用 LANCZOS 软 alpha（防锯齿）
        # 面向其他形状的边缘保持 255（防光晕）
        bg_facing = shape_edge & (other_dilated == 0)
        result[bg_facing] = alpha_np[bg_facing].astype(np.float32)

    # 4. 颜色二次验证
    semi = (result > 0) & (result < 255)
    result[semi] *= np.clip((dist[semi] - 30) / 30, 0, 1)
    return result.clip(0, 255).astype(np.uint8)
```

### 辅助函数

```python
def _sample_bg_color(rgb, s=5):
    """从四角采样背景色（中位数）"""
    H, W = rgb.shape[:2]
    corners = np.vstack([rgb[:s,:s], rgb[:s,W-s:], rgb[H-s:,:s], rgb[H-s:,W-s:]])
    return np.median(corners.reshape(-1, 3), axis=0)

def _flood_fill_background(binary):
    """从四角洪水填充，清除与边界连通的背景"""
    H, W = binary.shape
    padded = np.zeros((H+2, W+2), np.uint8)
    padded[1:H+1, 1:W+1] = binary
    flood = 255 - padded
    cv2.floodFill(flood, None, (0, 0), 128)
    true_bg = (flood == 128)[1:H+1, 1:W+1]
    result = binary.copy()
    result[true_bg] = 0
    return result
```

---

## 五、九大陷阱与解决方案

| # | 症状 | 根���原因 | 解决方案 |
|---|------|---------|---------|
| 1 | 相邻形状接触区颜色溢出 | Guided Filter radius 过大，跨越形状间隙 | 改用洪水填充+轮廓填充，完全不用 GF |
| 2 | 前景色光晕（蓝色/红色环）| 高斯模糊产生有色半透明软边缘 | 只对"背景朝向"边缘用 LANCZOS 软值 |
| 3 | 圆形/曲线边缘锯齿 | 纯二值化无抗锯齿 | 自适应：背景朝向边缘用 LANCZOS 软 alpha |
| 4 | 白色亮斑（间隙中的白点）| 背景色像素 LANCZOS alpha>127，被轮廓填充纳入前景 | 轮廓填充后做颜色验证 `dist<40→0` |
| 5 | LANCZOS 缩放后边缘变脏 | 插值在 0/255 边界产生中间值 | 缩放后必须执行 `_post_resize_cleanup` |
| 6 | Guided Filter 二次二值化破坏软边 | threshold@128 摧毁 GF 所有精细工作 | 移除第二次硬二值化 |
| 7 | Windows DLL 加载失败内存错误 | BiRefNet 占 2-4GB RAM，多进程重复加载超限 | 不用 `--reload`，单进程，用 `/warmup` 预热 |
| 8 | CORS 随 Vite 换端口失效 | ALLOWED_ORIGINS 写死固定端口 | 列出 5173~5176 全部备用端口 |
| 9 | 小图（<200px）效果差 | 1024→小尺寸缩放比大，LANCZOS 模糊严重 | 强制执行 post_resize_cleanup，binary+flood fill |

---

## 六、CORS 多端口配置

```python
# backend/main.py
_raw = os.environ.get("ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,"
    "http://localhost:5174,http://127.0.0.1:5174,"
    "http://localhost:5175,http://127.0.0.1:5175,"
    "http://localhost:5176,http://127.0.0.1:5176")

app.add_middleware(CORSMiddleware,
    allow_origins=[o.strip() for o in _raw.split(",") if o.strip()],
    allow_methods=["GET", "POST"], allow_headers=["*"])
```

```bash
# frontend/.env.local（后端端口非默认时）
VITE_API_URL=http://localhost:8001
```

---

## 七、API 协议规范

**请求**：`POST /api/{feature}`，`multipart/form-data`

| 路由 | 额外参数 |
|------|---------|
| `/api/remove-bg` | 无 |
| `/api/upscale` | `scale: 2\|4` |
| `/api/resize` | `mode: ratio\|fixed`, `ratio\|width+height+keep_aspect` |
| `/api/watermark` | `text, position, font_size, opacity, color, margin` |

**响应**：JSON

```json
{
  "success": true,
  "image_base64": "data:image/png;base64,iVBORw0...",
  "original_size": [1920, 1080],
  "process_time_ms": 35000
}
```

---

## 八、性能基准（Windows CPU，16GB RAM）

| 操作 | 时间 | 内存 |
|------|------|------|
| 模型首次加载 | 10-30s | ~2-4GB |
| BiRefNet 推理 | 30-40s | 峰值 +1GB |
| 后处理全流程 | <1s | 忽略 |
| 高清化 FSRCNN | <2s | 忽略 |
| 缩图/水印 | <0.5s | 忽略 |

---

## 九、质量验证脚本

```python
def verify_alpha_quality(result_rgba_path):
    """运行后应：semi < 总像素5%，white_residue = 0"""
    img = Image.open(result_rgba_path).convert("RGBA")
    arr = np.array(img)
    alpha, rgb = arr[:,:,3], arr[:,:,:3]

    total = alpha.size
    trans = (alpha == 0).sum()
    opaque = (alpha == 255).sum()
    semi = ((alpha > 0) & (alpha < 255)).sum()

    # 白色残像检测
    white = (rgb[:,:,0]>200)&(rgb[:,:,1]>200)&(rgb[:,:,2]>200)&(alpha>0)

    print(f"透明:{trans} 不透明:{opaque} 软边缘:{semi} ({semi/total:.1%})")
    print(f"白色残像: {white.sum()} 个")
    assert white.sum() == 0, "存在白色残像！"
    assert semi / total < 0.05, f"软边缘过多：{semi/total:.1%}"
    print("✓ 质量验证通过")
```
