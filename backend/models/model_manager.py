import threading
import logging

logger = logging.getLogger(__name__)


class ModelManager:
    """BiRefNet 单例懒加载管理器，线程安全"""

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
    def birefnet_ready(self) -> bool:
        return self._birefnet_loaded

    def get_birefnet(self):
        if not self._birefnet_loaded:
            with self._load_lock:
                # double-check 防止重复加载
                if not self._birefnet_loaded:
                    self._load_birefnet()
        return self._birefnet

    def _load_birefnet(self):
        import os
        from transformers import AutoModelForImageSegmentation
        from config import BIREFNET_DIR

        logger.info("开始加载 BiRefNet 模型，CPU 模式约需 15-30 秒...")
        if not os.path.isdir(BIREFNET_DIR) or not os.listdir(BIREFNET_DIR):
            raise RuntimeError(
                f"BiRefNet 模型文件不存在：{BIREFNET_DIR}\n"
                "请先运行 python download_model.py 下载模型"
            )
        self._birefnet = AutoModelForImageSegmentation.from_pretrained(
            BIREFNET_DIR,
            trust_remote_code=True,
            torch_dtype="auto",
        )
        # CPU 不支持 float16，强制转为 float32
        self._birefnet = self._birefnet.float()
        self._birefnet.eval()
        self._birefnet_loaded = True
        logger.info("BiRefNet 模型加载完成")


model_manager = ModelManager()
