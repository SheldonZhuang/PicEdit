"""
模型下载脚本：BiRefNet（抠图）+ FSRCNN（超分辨率）
运行前可设置镜像：set HF_ENDPOINT=https://hf-mirror.com
"""
import os
import sys
import urllib.request
from pathlib import Path

BASE_DIR = Path(__file__).parent
BIREFNET_DIR = BASE_DIR / "weights" / "birefnet"
SUPERRES_DIR = BASE_DIR / "weights" / "superres"

FSRCNN_MODELS = {
    "FSRCNN_x2.pb": "https://raw.githubusercontent.com/Saafke/FSRCNN_Tensorflow/master/models/FSRCNN_x2.pb",
    "FSRCNN_x4.pb": "https://raw.githubusercontent.com/Saafke/FSRCNN_Tensorflow/master/models/FSRCNN_x4.pb",
}


def download_birefnet():
    try:
        from huggingface_hub import snapshot_download
    except ImportError:
        print("请先安装 huggingface_hub：pip install huggingface_hub")
        sys.exit(1)

    model_file = BIREFNET_DIR / "model.safetensors"
    if model_file.is_file():
        print(f"BiRefNet 模型已存在，跳过：{model_file}")
        return

    print("开始下载 BiRefNet-general 模型（约 1GB）...")
    BIREFNET_DIR.mkdir(parents=True, exist_ok=True)
    snapshot_download(
        repo_id="ZhengPeng7/BiRefNet",
        local_dir=str(BIREFNET_DIR),
        ignore_patterns=["*.md", "examples/*", "*.gitattributes"],
    )
    print(f"BiRefNet 下载完成：{BIREFNET_DIR}")


def download_fsrcnn():
    SUPERRES_DIR.mkdir(parents=True, exist_ok=True)
    for filename, url in FSRCNN_MODELS.items():
        dest = SUPERRES_DIR / filename
        if dest.is_file():
            print(f"FSRCNN 模型已存在，跳过：{dest}")
            continue
        print(f"下载 {filename}（约 40KB）...")
        try:
            urllib.request.urlretrieve(url, dest)
            print(f"  → 完成：{dest}")
        except Exception as e:
            print(f"  → 下载失败（{e}），高清化功能将回退到 Lanczos 插值")


if __name__ == "__main__":
    download_birefnet()
    download_fsrcnn()
