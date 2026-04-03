import torch
import numpy as np
from PIL import Image
from torchvision import transforms
from config import BIREFNET_INPUT_SIZE

_transform = transforms.Compose([
    transforms.Resize(BIREFNET_INPUT_SIZE),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225]),
])


def remove_background(pil_image: Image.Image, model) -> Image.Image:
    """
    抠图：将背景设为透明
    输入: PIL RGB/RGBA Image
    输出: PIL RGBA Image（背景透明）
    """
    original_size = pil_image.size  # (width, height)
    rgb_image = pil_image.convert("RGB")

    # 1. 预处理
    input_tensor = _transform(rgb_image).unsqueeze(0).float()  # [1, 3, 1024, 1024] float32

    # 2. 推理（CPU，无 autocast）
    with torch.no_grad():
        preds = model(input_tensor)
        # BiRefNet 返回多尺度预测列表，取最后一个
        if isinstance(preds, (list, tuple)):
            pred = preds[-1]
        else:
            pred = preds
        mask = pred.sigmoid().squeeze().cpu().numpy()  # [1024, 1024]

    # 3. 还原到原始尺寸
    mask_pil = Image.fromarray((mask * 255).astype(np.uint8))
    mask_pil = mask_pil.resize(original_size, Image.LANCZOS)

    # 4. 合成 RGBA（前景保留，背景透明）
    result = rgb_image.convert("RGBA")
    result.putalpha(mask_pil)
    return result
