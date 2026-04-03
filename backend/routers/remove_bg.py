import time
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

from models.model_manager import model_manager
from models.birefnet_infer import remove_background
from services.image_service import validate_image, pil_to_base64

router = APIRouter()


@router.post("/api/remove-bg")
async def api_remove_bg(file: UploadFile = File(...)):
    start = time.time()

    contents = await file.read()
    try:
        pil_image = validate_image(contents)
    except ValueError as e:
        raise HTTPException(422, str(e))

    try:
        model = model_manager.get_birefnet()
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    except Exception as e:
        raise HTTPException(503, f"模型加载失败：{e}")

    try:
        result = remove_background(pil_image, model)
    except Exception as e:
        raise HTTPException(500, f"抠图处理失败：{e}")

    return JSONResponse({
        "success": True,
        "image_base64": pil_to_base64(result, "PNG"),
        "original_size": list(pil_image.size),
        "process_time_ms": int((time.time() - start) * 1000),
    })
