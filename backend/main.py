import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import remove_bg, upscale, resize, watermark

app = FastAPI(title="PicEdit API", version="1.0.0")

# CORS：允许本地开发 + Vercel 前端（通过环境变量 ALLOWED_ORIGINS 配置）
_raw_origins = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173"
)
allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(remove_bg.router)
app.include_router(upscale.router)
app.include_router(resize.router)
app.include_router(watermark.router)


@app.get("/health")
def health():
    from models.model_manager import model_manager
    return {
        "status": "ok",
        "models_loaded": {
            "birefnet": model_manager.birefnet_ready,
        },
    }


@app.post("/api/warmup")
def warmup():
    """手动触发 BiRefNet 模型预加载"""
    import time
    from models.model_manager import model_manager
    start = time.time()
    model_manager.get_birefnet()
    return {
        "model": "birefnet",
        "load_time_seconds": round(time.time() - start, 2),
        "status": "ready",
    }
