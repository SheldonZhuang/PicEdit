#!/bin/bash
set -e

echo "=== 检查/下载 BiRefNet 模型 ==="
python download_model.py

echo "=== 启动 FastAPI 服务 ==="
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
