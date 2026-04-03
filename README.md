# PicEdit - AI 图片处理工具

一个基于 **BiRefNet** 的本地 AI 图片处理网站，支持抠图、高清化、缩图、加水印四项功能。

## 功能特性

| 功能 | 说明 | 速度 |
|------|------|------|
| 🎨 AI 抠图 | BiRefNet-general 本地推理，背景透明 | CPU ~50s / GPU ~3s |
| 🔍 高清化 | Lanczos 插值放大 2x / 4x | < 1s |
| ✂️ 缩图 | 按比例或指定尺寸缩放 | < 1s |
| 💧 水印 | 文字水印，支持中文，9宫格定位 | < 1s |

## 技术栈

- **前端**：React 18 + Vite + Tailwind CSS + lucide-react
- **后端**：FastAPI + Python 3.10+
- **AI 模型**：BiRefNet-general（HuggingFace: `ZhengPeng7/BiRefNet`）

## 快速开始

### 环境要求

- Python 3.10+
- Node.js 18+
- 磁盘空间：模型约 1GB

### 1. 克隆项目

```bash
git clone https://github.com/SheldonZhuang/PicEdit.git
cd PicEdit
```

### 2. 启动后端

```bash
# 安装依赖
pip install -r backend/requirements.txt

# 下载 BiRefNet 模型（约 1GB，仅首次需要）
cd backend
# 国内网络建议使用镜像：
set HF_ENDPOINT=https://hf-mirror.com   # Windows
# export HF_ENDPOINT=https://hf-mirror.com  # Mac/Linux
python download_model.py

# 启动服务
uvicorn main:app --reload --port 8000
```

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

访问 [http://localhost:5173](http://localhost:5173) 即可使用。

## 项目结构

```
PicEdit/
├── backend/
│   ├── main.py              # FastAPI 入口
│   ├── requirements.txt
│   ├── download_model.py    # BiRefNet 模型下载脚本
│   ├── models/
│   │   ├── model_manager.py # 模型单例懒加载
│   │   ├── birefnet_infer.py
│   │   └── upscale_infer.py
��   ├── routers/             # API 路由
│   │   ├── remove_bg.py
│   │   ├── upscale.py
│   │   ├── resize.py
│   │   └── watermark.py
│   └── services/
│       └── image_service.py
└── frontend/
    └── src/
        ├── App.jsx
        ├── api/picEditApi.js
        ├── components/
        └── hooks/
```

## API 文档

后端启动后访问 [http://localhost:8000/docs](http://localhost:8000/docs) 查看完整 Swagger 文档。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 服务状态 + 模型加载状态 |
| POST | `/api/remove-bg` | 抠图 |
| POST | `/api/upscale` | 高清化（scale=2\|4） |
| POST | `/api/resize` | 缩图（mode=ratio\|fixed） |
| POST | `/api/watermark` | 加水印 |

## 注意事项

- **CPU 模式**：抠图每张约 50 秒，首次需额外 30 秒加载模型，属正常现象
- **GPU 加速**：安装 CUDA 版 PyTorch 后抠图速度可提升至 3 秒以内
- 模型权重不含在仓库中，需运行 `download_model.py` 单独下载

## License

MIT
