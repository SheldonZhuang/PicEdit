from PIL import Image


def upscale_pil(pil_image: Image.Image, scale: int = 2) -> Image.Image:
    """PIL Lanczos 插值放大，快速（< 1秒），质量一般"""
    w, h = pil_image.size
    return pil_image.resize((w * scale, h * scale), Image.LANCZOS)
