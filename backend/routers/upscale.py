import time
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse

from models.upscale_infer import upscale_pil
from services.image_service import validate_image, pil_to_base64

router = APIRouter()


@router.post("/api/upscale")
async def api_upscale(
    file: UploadFile = File(...),
    scale: int = Form(2),
):
    if scale not in (2, 4):
        raise HTTPException(422, "scale 只支持 2 或 4")
    start = time.time()

    contents = await file.read()
    try:
        pil_image = validate_image(contents)
    except ValueError as e:
        raise HTTPException(422, str(e))

    result = upscale_pil(pil_image, scale)
    fmt = "JPEG" if pil_image.format == "JPEG" else "PNG"

    return JSONResponse({
        "success": True,
        "image_base64": pil_to_base64(result, fmt),
        "original_size": list(pil_image.size),
        "output_size": list(result.size),
        "process_time_ms": int((time.time() - start) * 1000),
    })
