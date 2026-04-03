import time
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from PIL import Image, ImageDraw, ImageFont

from services.image_service import validate_image, pil_to_base64

router = APIRouter()

POSITION_MAP = {
    "top-left":      lambda w, h, tw, th, m: (m, m),
    "top-center":    lambda w, h, tw, th, m: ((w - tw) // 2, m),
    "top-right":     lambda w, h, tw, th, m: (w - tw - m, m),
    "center":        lambda w, h, tw, th, m: ((w - tw) // 2, (h - th) // 2),
    "bottom-left":   lambda w, h, tw, th, m: (m, h - th - m),
    "bottom-center": lambda w, h, tw, th, m: ((w - tw) // 2, h - th - m),
    "bottom-right":  lambda w, h, tw, th, m: (w - tw - m, h - th - m),
}


def hex_to_rgba(hex_color: str, opacity: float) -> tuple:
    hex_color = hex_color.lstrip("#")
    r, g, b = int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)
    return (r, g, b, int(opacity * 255))


@router.post("/api/watermark")
async def api_watermark(
    file: UploadFile = File(...),
    text: str = Form(...),
    position: str = Form("bottom-right"),
    font_size: int = Form(36),
    opacity: float = Form(0.5),
    color: str = Form("#FFFFFF"),
    margin: int = Form(20),
):
    if position not in POSITION_MAP:
        raise HTTPException(422, f"position 不合法，支持：{list(POSITION_MAP.keys())}")
    if not (0 <= opacity <= 1):
        raise HTTPException(422, "opacity 范围 0.0 ~ 1.0")
    if font_size < 8 or font_size > 300:
        raise HTTPException(422, "font_size 范围 8 ~ 300")

    start = time.time()
    contents = await file.read()
    try:
        pil_image = validate_image(contents)
    except ValueError as e:
        raise HTTPException(422, str(e))

    # 转 RGBA 以支持透明水印
    base = pil_image.convert("RGBA")
    w, h = base.size

    # 创建透明水印层
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # 字体（尝试系统字体，失败则用默认）
    font = None
    font_paths = [
        "C:/Windows/Fonts/msyh.ttc",     # 微软雅黑（支持中文）
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/simhei.ttf",   # 黑体
    ]
    for fp in font_paths:
        try:
            font = ImageFont.truetype(fp, font_size)
            break
        except Exception:
            continue
    if font is None:
        font = ImageFont.load_default()

    # 计算文字边界框
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]

    # 计算位置
    pos_fn = POSITION_MAP[position]
    x, y = pos_fn(w, h, text_w, text_h, margin)

    fill_color = hex_to_rgba(color, opacity)
    draw.text((x, y), text, font=font, fill=fill_color)

    # 合并水印层
    result = Image.alpha_composite(base, overlay)

    # 输出格式
    orig_format = pil_image.format or "PNG"
    fmt = "JPEG" if orig_format == "JPEG" else "PNG"

    return JSONResponse({
        "success": True,
        "image_base64": pil_to_base64(result, fmt),
        "original_size": [w, h],
        "process_time_ms": int((time.time() - start) * 1000),
    })
