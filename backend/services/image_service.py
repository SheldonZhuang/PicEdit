import base64
import io
from PIL import Image
from config import MAX_FILE_SIZE_MB, ALLOWED_FORMATS


def validate_image(raw_bytes: bytes) -> Image.Image:
    """验证并解析图片，返回 PIL Image 对象"""
    if len(raw_bytes) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise ValueError(f"文件过大，最大支持 {MAX_FILE_SIZE_MB}MB")
    try:
        img = Image.open(io.BytesIO(raw_bytes))
        img.verify()  # 验证文件完整性
        # verify 后需重新打开
        img = Image.open(io.BytesIO(raw_bytes))
    except Exception:
        raise ValueError("无法解析图片文件，请确认文件未损坏")
    if img.format not in ALLOWED_FORMATS:
        raise ValueError(f"不支持的格式 {img.format}，请使用 PNG/JPEG/WEBP")
    return img


def pil_to_base64(pil_image: Image.Image, fmt: str = "PNG") -> str:
    """PIL Image 转 base64 data URI"""
    buffer = io.BytesIO()
    # JPEG 不支持透明通道，强制转换
    if fmt == "JPEG" and pil_image.mode in ("RGBA", "LA", "P"):
        pil_image = pil_image.convert("RGB")
    save_kwargs = {"optimize": True}
    if fmt == "JPEG":
        save_kwargs["quality"] = 92
    pil_image.save(buffer, format=fmt, **save_kwargs)
    b64 = base64.b64encode(buffer.getvalue()).decode()
    mime = "image/png" if fmt == "PNG" else "image/jpeg"
    return f"data:{mime};base64,{b64}"
