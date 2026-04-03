FROM python:3.11-slim

WORKDIR /app

# 系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libgl1 && \
    rm -rf /var/lib/apt/lists/*

# CPU-only torch（避免下载 2GB CUDA 版本）
RUN pip install --no-cache-dir \
    torch==2.6.0 torchvision==0.21.0 \
    --index-url https://download.pytorch.org/whl/cpu

# 其余 Python 依赖
COPY backend/requirements-deploy.txt ./requirements-deploy.txt
RUN pip install --no-cache-dir -r requirements-deploy.txt

# 复制后端代码
COPY backend/ ./backend/

WORKDIR /app/backend

# 构建阶段下载 BiRefNet 模型（Docker layer 缓存，再次构建自动跳过）
RUN python download_model.py

# 启动：Railway 通过 $PORT 注入端口
CMD uvicorn main:app --host 0.0.0.0 --port $PORT
