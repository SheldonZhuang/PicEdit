"""
BiRefNet 模型下载脚本
运行前可设置镜像：set HF_ENDPOINT=https://hf-mirror.com
"""
import os
import sys

WEIGHTS_DIR = os.path.join(os.path.dirname(__file__), "weights", "birefnet")


def download():
    try:
        from huggingface_hub import snapshot_download
    except ImportError:
        print("请先安装 huggingface_hub：pip install huggingface_hub")
        sys.exit(1)

    # 已下载则跳过（Railway 重启时不重复下载）
    model_file = os.path.join(WEIGHTS_DIR, "model.safetensors")
    if os.path.isfile(model_file):
        print(f"模型已存在，跳过下载：{model_file}")
        return

    print(f"开始下载 BiRefNet-general 模型（约 1GB）...")
    print(f"目标目录：{WEIGHTS_DIR}")
    print("-" * 50)

    os.makedirs(WEIGHTS_DIR, exist_ok=True)
    snapshot_download(
        repo_id="ZhengPeng7/BiRefNet",
        local_dir=WEIGHTS_DIR,
        ignore_patterns=["*.md", "examples/*", "*.gitattributes"],
    )
    print(f"\n下载完成！模型保存在：{WEIGHTS_DIR}")


if __name__ == "__main__":
    download()
