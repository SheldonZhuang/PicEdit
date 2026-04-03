FROM python:3.11-slim

WORKDIR /app

# 系统依赖（Pillow / OpenCV 需要）
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libgl1 && \
    rm -rf /var/lib/apt/lists/*

# 1. 先单独安装 CPU-only torch + torchvision（官方源，版本精确匹配）
RUN pip install --no-cache-dir \
    torch==2.6.0 torchvision==0.21.0 \
    --index-url https://download.pytorch.org/whl/cpu

# 2. 再安装其余依赖
COPY backend/requirements-deploy.txt ./requirements-deploy.txt
RUN pip install --no-cache-dir -r requirements-deploy.txt

# 3. 复制后端代码
COPY backend/ ./backend/

WORKDIR /app/backend

# Railway 通过 $PORT 注入端口
CMD python download_model.py && uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
