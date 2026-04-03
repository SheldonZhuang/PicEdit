import os

# 项目根目录
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 模型权重目录
WEIGHTS_DIR = os.path.join(BASE_DIR, "weights")
BIREFNET_DIR = os.path.join(WEIGHTS_DIR, "birefnet")

# 图片限制
MAX_FILE_SIZE_MB = 10
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}

# BiRefNet 推理参数
BIREFNET_INPUT_SIZE = (1024, 1024)
