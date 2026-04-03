import time
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from PIL import Image

from services.image_service import validate_image, pil_to_base64

router = APIRouter()


@router.post("/api/resize")
async def api_resize(
    file: UploadFile = File(...),
    mode: str = Form(...),          # "ratio" | "fixed"
    ratio: float = Form(None),      # mode=ratio 时必填，如 0.5
    width: int = Form(None),        # mode=fixed 时必填
    height: int = Form(None),       # mode=fixed 时必填
    keep_aspect: bool = Form(True), # mode=fixed 时是否保持宽高比
):
    start = time.time()
    contents = await file.read()
    try:
        pil_image = validate_image(contents)
    except ValueError as e:
        raise HTTPException(422, str(e))

    orig_w, orig_h = pil_image.size

    if mode == "ratio":
        if ratio is None or not (0.01 <= ratio <= 10):
            raise HTTPException(422, "ratio 必须在 0.01 ~ 10 之间")
        new_w = max(1, int(orig_w * ratio))
        new_h = max(1, int(orig_h * ratio))
    elif mode == "fixed":
        if width is None or height is None:
            raise HTTPException(422, "fixed 模式需要提供 width 和 height")
        if width <= 0 or height <= 0:
            raise HTTPException(422, "width/height 必须大于 0")
        if keep_aspect:
            pil_image.thumbnail((width, height), Image.LANCZOS)
            new_w, new_h = pil_image.size
        else:
            new_w, new_h = width, height
    else:
        raise HTTPException(422, "mode 只支持 'ratio' 或 'fixed'")

    result = pil_image.resize((new_w, new_h), Image.LANCZOS)
    fmt = "JPEG" if pil_image.format == "JPEG" else "PNG"

    return JSONResponse({
        "success": True,
        "image_base64": pil_to_base64(result, fmt),
        "original_size": [orig_w, orig_h],
        "output_size": list(result.size),
        "process_time_ms": int((time.time() - start) * 1000),
    })
