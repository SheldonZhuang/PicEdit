FROM python:3.11-slim

WORKDIR /app

# 安装系统依赖（Pillow/OpenCV 需要）
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libgl1 && \
    rm -rf /var/lib/apt/lists/*

# 先复制依赖文件，利用 Docker 层缓存
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir einops kornia timm

# 复制后端代码
COPY backend/ ./backend/

WORKDIR /app/backend

# Railway 通过 $PORT 注入端口
CMD python download_model.py && uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
