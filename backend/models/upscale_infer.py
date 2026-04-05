import cv2
import numpy as np
from PIL import Image
from pathlib import Path

MODEL_DIR = Path(__file__).parent.parent / "weights" / "superres"

# FSRCNN: 轻量 AI 超分辨率模型，CPU 下几秒完成，质量明显优于插值
_MODELS = {
    2: (MODEL_DIR / "FSRCNN_x2.pb", "fsrcnn", 2),
    4: (MODEL_DIR / "FSRCNN_x4.pb", "fsrcnn", 4),
}


def _build_sr(scale: int):
    """创建并加载 DNN 超分辨率对象，失败返回 None"""
    path, algo, s = _MODELS[scale]
    if not path.exists():
        return None
    try:
        sr = cv2.dnn_superres.DnnSuperResImpl_create()
        sr.readModel(str(path))
        sr.setModel(algo, s)
        return sr
    except Exception:
        return None


def upscale_pil(pil_image: Image.Image, scale: int = 2) -> Image.Image:
    """
    AI 超分辨率放大（FSRCNN）。
    若模型不可用则回退到 Lanczos 插值。
    透明通道（RGBA）单独处理后重新合并。
    """
    has_alpha = pil_image.mode == "RGBA"

    # 分离 alpha
    if has_alpha:
        r, g, b, a = pil_image.split()
        rgb_image = Image.merge("RGB", (r, g, b))
    else:
        rgb_image = pil_image.convert("RGB")

    sr = _build_sr(scale)

    if sr is not None:
        try:
            img_bgr = cv2.cvtColor(np.array(rgb_image), cv2.COLOR_RGB2BGR)
            out_bgr = sr.upsample(img_bgr)
            out_rgb = cv2.cvtColor(out_bgr, cv2.COLOR_BGR2RGB)
            result_rgb = Image.fromarray(out_rgb)
        except Exception:
            # 推理失败时回退
            w, h = rgb_image.size
            result_rgb = rgb_image.resize((w * scale, h * scale), Image.LANCZOS)
    else:
        w, h = rgb_image.size
        result_rgb = rgb_image.resize((w * scale, h * scale), Image.LANCZOS)

    # 重新合并 alpha
    if has_alpha:
        w, h = result_rgb.size
        a_upscaled = a.resize((w, h), Image.LANCZOS)
        result_rgb.putalpha(a_upscaled)

    return result_rgb
