# Template：AI 图片处理应用全栈脚手架

## 文件一：backend/models/birefnet_infer.py（完整可用）

```python
import cv2
import torch
import numpy as np
from PIL import Image
from torchvision import transforms

INPUT_SIZE = (1024, 1024)

_transform = transforms.Compose([
    transforms.Resize(INPUT_SIZE),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])


def _sample_bg_color(rgb: np.ndarray, s: int = 5) -> np.ndarray:
    H, W = rgb.shape[:2]
    corners = np.vstack([
        rgb[:s, :s].reshape(-1, 3),   rgb[:s, W-s:].reshape(-1, 3),
        rgb[H-s:, :s].reshape(-1, 3), rgb[H-s:, W-s:].reshape(-1, 3),
    ])
    return np.median(corners, axis=0)


def _flood_fill_background(binary: np.ndarray) -> np.ndarray:
    H, W = binary.shape
    padded = np.zeros((H + 2, W + 2), np.uint8)
    padded[1:H+1, 1:W+1] = binary
    flood = 255 - padded
    cv2.floodFill(flood, None, (0, 0), 128)
    true_bg = (flood == 128)[1:H+1, 1:W+1]
    result = binary.copy()
    result[true_bg] = 0
    return result


def _refine_mask(mask: np.ndarray, rgb_guide: np.ndarray) -> np.ndarray:
    H, W = mask.shape
    # 1. 低阈值二值化 + 开运算
    coarse = ((mask > 0.35) * 255).astype(np.uint8)
    open_k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    coarse = cv2.morphologyEx(coarse, cv2.MORPH_OPEN, open_k, iterations=1)
    # 2. 洪水填充 + 轮廓填充
    clean = _flood_fill_background(coarse)
    cnts, _ = cv2.findContours(clean, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    filled = np.zeros_like(clean)
    if cnts:
        cv2.drawContours(filled, cnts, -1, 255, thickness=cv2.FILLED)
    # 3. 边缘高斯（只在外轮廓环）
    edge_k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    edge_ring = (filled > 0) & (cv2.erode(filled, edge_k) == 0)
    blurred = cv2.GaussianBlur(filled.astype(np.float32), (5, 5), 1.0)
    result = filled.astype(np.float32)
    result[edge_ring] = blurred[edge_ring]
    # 4. 颜色感知清理
    guide = cv2.resize(rgb_guide, (W, H), interpolation=cv2.INTER_LINEAR)
    bg = _sample_bg_color(guide).astype(np.float32)
    dist = np.sqrt(((guide.astype(np.float32) - bg) ** 2).sum(axis=2))
    semi = (result > 0) & (result < 255)
    if semi.any():
        result[semi] *= np.clip((dist[semi] - 30) / 30, 0.0, 1.0)
    return result.clip(0, 255).astype(np.uint8)


def _post_resize_cleanup(alpha_np: np.ndarray, rgb_np: np.ndarray) -> np.ndarray:
    bg = _sample_bg_color(rgb_np).astype(np.float32)
    dist = np.sqrt(((rgb_np.astype(np.float32) - bg) ** 2).sum(axis=2))
    edge_k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))

    def _fill(arr):
        c, _ = cv2.findContours(arr, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        f = np.zeros_like(arr)
        if c:
            cv2.drawContours(f, c, -1, 255, thickness=cv2.FILLED)
        return f

    # 1. 二值化 + 洪水填充 + 轮廓填充
    binary = ((alpha_np > 127) * 255).astype(np.uint8)
    filled = _fill(_flood_fill_background(binary))
    # 2. 颜色验证去白残像
    filled[(filled > 0) & (dist < 40)] = 0
    filled = _fill(_flood_fill_background(filled))
    # 3. 自适应边缘抗锯齿
    num_labels, labels = cv2.connectedComponents(filled)
    result = filled.astype(np.float32)
    for lid in range(1, num_labels):
        shape = (labels == lid).astype(np.uint8) * 255
        edge = (shape > 0) & (cv2.erode(shape, edge_k) == 0)
        other = ((labels > 0) & (labels != lid)).astype(np.uint8) * 255
        bg_facing = edge & (cv2.dilate(other, edge_k) == 0)
        if bg_facing.any():
            result[bg_facing] = alpha_np[bg_facing].astype(np.float32)
    # 4. 颜色二次验证
    semi = (result > 0) & (result < 255)
    if semi.any():
        result[semi] *= np.clip((dist[semi] - 30) / 30, 0.0, 1.0)
    return result.clip(0, 255).astype(np.uint8)


def remove_background(pil_image: Image.Image, model) -> Image.Image:
    original_size = pil_image.size
    rgb_image = pil_image.convert("RGB")
    rgb_np = np.array(rgb_image)

    input_tensor = _transform(rgb_image).unsqueeze(0).float()
    with torch.no_grad():
        preds = model(input_tensor)
        pred = preds[-1] if isinstance(preds, (list, tuple)) else preds
        mask = pred.sigmoid().squeeze().cpu().numpy()

    refined = _refine_mask(mask, rgb_np)
    mask_pil = Image.fromarray(refined).resize(original_size, Image.LANCZOS)
    alpha_np = _post_resize_cleanup(np.array(mask_pil), rgb_np)

    result = rgb_image.convert("RGBA")
    result.putalpha(Image.fromarray(alpha_np))
    return result
```

---

## 文件二：backend/models/model_manager.py

```python
import threading
import logging

logger = logging.getLogger(__name__)


class ModelManager:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                inst = super().__new__(cls)
                inst._birefnet = None
                inst._birefnet_loaded = False
                inst._load_lock = threading.Lock()
                cls._instance = inst
        return cls._instance

    @property
    def birefnet_ready(self):
        return self._birefnet_loaded

    def get_birefnet(self):
        if not self._birefnet_loaded:
            with self._load_lock:
                if not self._birefnet_loaded:
                    self._load_birefnet()
        return self._birefnet

    def _load_birefnet(self):
        import os
        from transformers import AutoModelForImageSegmentation
        from config import BIREFNET_DIR

        logger.info("加载 BiRefNet 模型，CPU 模式约 15-30 秒...")
        if not os.path.isdir(BIREFNET_DIR) or not os.listdir(BIREFNET_DIR):
            raise RuntimeError(f"模型文件不存在：{BIREFNET_DIR}\n请先运行 python download_model.py")

        self._birefnet = AutoModelForImageSegmentation.from_pretrained(
            BIREFNET_DIR, trust_remote_code=True, torch_dtype="auto"
        )
        self._birefnet = self._birefnet.float()  # CPU 必须 float32
        self._birefnet.eval()
        self._birefnet_loaded = True
        logger.info("BiRefNet 模型加载完成")


model_manager = ModelManager()
```

---

## 文件三：backend/services/image_service.py

```python
import base64
import io
from PIL import Image

MAX_FILE_SIZE_MB = 10
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}


def validate_image(contents: bytes) -> Image.Image:
    if len(contents) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise ValueError(f"文件大小超过 {MAX_FILE_SIZE_MB}MB 限制")
    try:
        img = Image.open(io.BytesIO(contents))
        img.verify()
        img = Image.open(io.BytesIO(contents))  # verify 后需重新打开
    except Exception:
        raise ValueError("无法解析图片，请上传有效的图片文件")
    if img.format not in ALLOWED_FORMATS:
        raise ValueError(f"不支持的格式 {img.format}，请上传 PNG/JPEG/WEBP")
    return img


def pil_to_base64(pil_image: Image.Image, fmt: str = "PNG") -> str:
    buf = io.BytesIO()
    if fmt == "JPEG" and pil_image.mode in ("RGBA", "P"):
        pil_image = pil_image.convert("RGB")
    kwargs = {"optimize": True}
    if fmt == "JPEG":
        kwargs["quality"] = 92
    pil_image.save(buf, format=fmt, **kwargs)
    b64 = base64.b64encode(buf.getvalue()).decode()
    mime = "image/png" if fmt == "PNG" else "image/jpeg"
    return f"data:{mime};base64,{b64}"
```

---

## 文件四：backend/main.py

```python
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import remove_bg, upscale, resize, watermark

app = FastAPI(title="ImageProcess API", version="1.0.0")

_raw = os.environ.get("ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,"
    "http://localhost:5174,http://127.0.0.1:5174,"
    "http://localhost:5175,http://127.0.0.1:5175,"
    "http://localhost:5176,http://127.0.0.1:5176")

app.add_middleware(CORSMiddleware,
    allow_origins=[o.strip() for o in _raw.split(",") if o.strip()],
    allow_methods=["GET", "POST"], allow_headers=["*"])

app.include_router(remove_bg.router)
app.include_router(upscale.router)
app.include_router(resize.router)
app.include_router(watermark.router)


@app.get("/health")
def health():
    from models.model_manager import model_manager
    return {"status": "ok", "models_loaded": {"birefnet": model_manager.birefnet_ready}}


@app.post("/api/warmup")
def warmup():
    import time
    from models.model_manager import model_manager
    t = time.time()
    model_manager.get_birefnet()
    return {"status": "ready", "load_time_seconds": round(time.time() - t, 2)}
```

---

## 文件五：frontend/src/api/picEditApi.js

```javascript
const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

async function handleResponse(resp) {
  if (!resp.ok) {
    let msg = `HTTP ${resp.status}`
    try { const d = await resp.json(); msg = d.detail || msg } catch {}
    throw new Error(msg)
  }
  return resp.json()
}

export const removeBg = (file) => {
  const form = new FormData()
  form.append('file', file)
  return fetch(`${BASE_URL}/api/remove-bg`, { method: 'POST', body: form }).then(handleResponse)
}

export const upscale = (file, scale = 2) => {
  const form = new FormData()
  form.append('file', file)
  form.append('scale', String(scale))
  return fetch(`${BASE_URL}/api/upscale`, { method: 'POST', body: form }).then(handleResponse)
}

export const resize = (file, params) => {
  const form = new FormData()
  form.append('file', file)
  form.append('mode', params.mode)
  if (params.mode === 'ratio') form.append('ratio', String(params.ratio))
  else {
    form.append('width', String(params.width))
    form.append('height', String(params.height))
    form.append('keep_aspect', String(params.keepAspect))
  }
  return fetch(`${BASE_URL}/api/resize`, { method: 'POST', body: form }).then(handleResponse)
}

export const watermark = (file, params) => {
  const form = new FormData()
  form.append('file', file)
  Object.entries(params).forEach(([k, v]) => form.append(k, String(v)))
  return fetch(`${BASE_URL}/api/watermark`, { method: 'POST', body: form }).then(handleResponse)
}

export const checkHealth = () =>
  fetch(`${BASE_URL}/health`).then(handleResponse)
```

---

## 文件六：frontend/.env.local

```bash
VITE_API_URL=http://localhost:8001
```

---

## 文件七：质量验证脚本（test_quality.py）

```python
"""
用法: python test_quality.py <input_image> [output_dir]
验证标准: white_residue=0, semi_ratio<5%, 深灰背景无光晕
"""
import sys, numpy as np
from PIL import Image, ImageDraw, ImageFont


def verify(result_path: str, dark_out: str = None):
    img = Image.open(result_path).convert("RGBA")
    arr = np.array(img)
    alpha, rgb = arr[:, :, 3], arr[:, :, :3]
    total = alpha.size

    trans = (alpha == 0).sum()
    opaque = (alpha == 255).sum()
    semi = ((alpha > 0) & (alpha < 255)).sum()
    white = ((rgb[:,:,0]>200)&(rgb[:,:,1]>200)&(rgb[:,:,2]>200)&(alpha>0)).sum()

    print(f"尺寸: {img.size}")
    print(f"透明:{trans} | 不透明:{opaque} | 软边缘:{semi} ({semi/total:.1%})")
    print(f"白色残像: {white} px")

    if dark_out:
        bg = Image.new("RGBA", img.size, (50, 50, 50, 255))
        Image.alpha_composite(bg, img).save(dark_out)
        print(f"深灰背景图: {dark_out}")

    ok = white == 0 and semi / total < 0.05
    print("✓ 通过" if ok else "✗ 失败")
    return ok


if __name__ == "__main__":
    verify(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
```

---

## 决策树：后处理策略选择

```
图片背景类型？
  纯色背景（白/单色）→ 颜色验证 dist<40 + 洪水填充  ✓ 效果最好
  复杂背景（照片）  → 只用 BiRefNet 软掩码 + 轻量洪水填充

目标分辨率？
  小图 (<200px)   → 必须 _post_resize_cleanup
  中图 (200-800px) → 推荐 _post_resize_cleanup
  大图 (>800px)   → 可选，但建议保留

边缘质量要求？
  严格（产品图/几何）→ 自适应抗锯齿（bg_facing 软边）
  普通（人像/自然） → 仅 _refine_mask 的高斯边缘

多形状相邻？
  YES → 必须 connectedComponents + 自适应抗锯齿
  NO  → 简单高斯边缘即可
```
