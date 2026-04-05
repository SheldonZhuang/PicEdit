import cv2
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


def _sample_bg_color(rgb: np.ndarray, sample_size: int = 5) -> np.ndarray:
    """从四个角采样背景颜色，取中位数"""
    H, W = rgb.shape[:2]
    s = sample_size
    corners = np.vstack([
        rgb[:s, :s].reshape(-1, 3),
        rgb[:s, W-s:].reshape(-1, 3),
        rgb[H-s:, :s].reshape(-1, 3),
        rgb[H-s:, W-s:].reshape(-1, 3),
    ])
    return np.median(corners, axis=0)   # shape (3,)


def _flood_fill_background(binary: np.ndarray) -> np.ndarray:
    """
    从四角洪水填充识别与图像边界相连的背景区域。
    binary: uint8 [H,W]，前景=255, 背景=0
    """
    H, W = binary.shape
    padded = np.zeros((H + 2, W + 2), dtype=np.uint8)
    padded[1:H+1, 1:W+1] = binary
    flood = 255 - padded
    cv2.floodFill(flood, None, (0, 0), 128)
    true_bg = (flood == 128)[1:H+1, 1:W+1]
    result = binary.copy()
    result[true_bg] = 0
    return result


def _refine_mask(mask: np.ndarray, rgb_guide: np.ndarray) -> np.ndarray:
    """
    四阶段掩码精炼：
      1. 低阈值二值化 + 洪水填充清除真正背景
      2. 轮廓填充消除内部孔洞，前景完全不透明
      3. 轻微高斯抗锯齿（仅作用于外轮廓边缘带）
      4. 颜色感知清理：边缘带中接近背景色的像素强制透明
    """
    H, W = mask.shape

    # ── 阶段一：低阈值二值化 + 噪点清理 ────────────────────
    coarse = ((mask > 0.35) * 255).astype(np.uint8)
    open_k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    coarse = cv2.morphologyEx(coarse, cv2.MORPH_OPEN, open_k, iterations=1)

    # ── 阶段二：洪水填充 + 轮廓填充 ────────────────────────
    clean  = _flood_fill_background(coarse)
    cnts, _ = cv2.findContours(clean, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    filled = np.zeros_like(clean)
    if cnts:
        cv2.drawContours(filled, cnts, -1, 255, thickness=cv2.FILLED)

    # ── 阶段三：高斯抗锯齿（仅边缘环）──────────────────────
    edge_k   = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    eroded   = cv2.erode(filled, edge_k, iterations=1)
    edge_ring = (filled > 0) & (eroded == 0)   # 外轮廓边缘带

    blurred = cv2.GaussianBlur(filled.astype(np.float32), (5, 5), 1.0)
    result  = filled.astype(np.float32)
    result[edge_ring] = blurred[edge_ring]

    # ── 阶段四：颜色感知清理 ────────────────────────────────
    # 采样背景色（对齐到 1024 分辨率）
    guide_resized = cv2.resize(rgb_guide, (W, H), interpolation=cv2.INTER_LINEAR)
    bg_color = _sample_bg_color(guide_resized).astype(np.float32)

    # 在边缘带内，计算每个像素与背景色的欧氏距离
    # 距离近（颜色接近背景）→ 强制透明；距离远（颜色接近前景）→ 保留
    edge_pixels = edge_ring  # 只处理边缘带

    if edge_pixels.sum() > 0:
        rgb_f = guide_resized.astype(np.float32)
        # 欧氏颜色距离，最大为 sqrt(3)*255 ≈ 441
        diff = rgb_f - bg_color[np.newaxis, np.newaxis, :]
        color_dist = np.sqrt((diff ** 2).sum(axis=2))   # [H, W]

        # 在边缘带中：
        # 距离 < 40（颜色与背景非常接近）→ 强制透明
        # 距离 > 80（颜色与背景差异明显）→ 保持原有高斯软值
        # 中间区域线性过渡
        dist_edge = color_dist[edge_pixels]
        alpha_edge = result[edge_pixels]

        # 线性调制：距离越近背景色，alpha 越低
        factor = np.clip((dist_edge - 40) / 40, 0.0, 1.0)  # 0→40: 0.0，80+: 1.0
        result[edge_pixels] = alpha_edge * factor

    return result.clip(0, 255).astype(np.uint8)


def _post_resize_cleanup(alpha_np: np.ndarray, rgb_np: np.ndarray) -> np.ndarray:
    """
    LANCZOS 缩放后在原始分辨率执行最终清理：
      1. 二值化(127) + 洪水填充 + 轮廓填充 → 实心前景二值掩码
      2. 颜色验证：把颜色接近背景的"前景"像素（背景色渗入）设为透明
      3. 自适应边缘抗锯齿：
           - 边缘像素若紧邻其他前景形状 → 保持 255（硬边，防光晕）
           - 边缘像素仅面向背景       → 使用原始 LANCZOS alpha（软边，防锯齿）
    """
    # ── 1. 二值化 + 洪水填充 + 轮廓填充 ─────────────────────
    binary = ((alpha_np > 127) * 255).astype(np.uint8)
    clean  = _flood_fill_background(binary)
    cnts, _ = cv2.findContours(clean, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    filled = np.zeros_like(clean)
    if cnts:
        cv2.drawContours(filled, cnts, -1, 255, thickness=cv2.FILLED)

    # ── 2. 颜色验证：去掉颜色接近背景的"前景"像素 ──────────
    bg_color = _sample_bg_color(rgb_np).astype(np.float32)
    diff     = rgb_np.astype(np.float32) - bg_color[np.newaxis, np.newaxis, :]
    color_dist = np.sqrt((diff ** 2).sum(axis=2))   # [H,W] 与背景色的欧氏距离

    # 颜色距离 < 40 且被标为前景 → 实际是背景色像素，强制透明
    bg_leak = (filled > 0) & (color_dist < 40)
    filled[bg_leak] = 0

    # ── 3. 自适应边缘抗锯齿 ──────────────────────────────────
    # 重新提取外轮廓边缘（颜色验证后可能改变了轮廓）
    cnts2, _ = cv2.findContours(filled, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    filled2 = np.zeros_like(filled)
    if cnts2:
        cv2.drawContours(filled2, cnts2, -1, 255, thickness=cv2.FILLED)

    edge_k   = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    eroded   = cv2.erode(filled2, edge_k, iterations=1)
    edge_ring = (filled2 > 0) & (eroded == 0)   # 外轮廓边缘带

    # 用连通域判断哪些边缘像素紧邻"其他前景形状"
    num_labels, labels = cv2.connectedComponents(filled2)
    # 膨胀所有前景 1px，用于检测"近邻是否有其他形状"
    all_fg_dilated = cv2.dilate(filled2, edge_k, iterations=1)

    result = filled2.astype(np.float32)
    for lid in range(1, num_labels):
        shape_mask   = (labels == lid).astype(np.uint8) * 255
        shape_eroded = cv2.erode(shape_mask, edge_k, iterations=1)
        shape_edge   = (shape_mask > 0) & (shape_eroded == 0)   # 本形状边缘

        # 其他前景形状膨胀后的区域
        other_fg = ((labels > 0) & (labels != lid)).astype(np.uint8) * 255
        other_dilated = cv2.dilate(other_fg, edge_k, iterations=1)

        # 仅面向背景的边缘（不与其他形状接触）
        bg_facing = shape_edge & (other_dilated == 0)

        # 仅面向背景的边缘：用原始 LANCZOS alpha（自然抗锯齿）
        if bg_facing.any():
            result[bg_facing] = alpha_np[bg_facing].astype(np.float32)

        # 面向其他形状的边缘：保持 255（硬边，防止产生光晕）
        # （result 已经是 255，无需额外操作）

    # 最后再做一次颜色验证，清理抗锯齿中混入的背景色软像素
    semi = (result > 0) & (result < 255)
    if semi.sum() > 0:
        factor = np.clip((color_dist[semi] - 30) / 30, 0.0, 1.0)
        result[semi] = result[semi] * factor

    return result.clip(0, 255).astype(np.uint8)


def remove_background(pil_image: Image.Image, model) -> Image.Image:
    """
    抠图：将背景设为透明
    输入: PIL RGB/RGBA Image
    输出: PIL RGBA Image（背景透明）
    """
    original_size = pil_image.size
    rgb_image = pil_image.convert("RGB")
    rgb_np    = np.array(rgb_image)

    input_tensor = _transform(rgb_image).unsqueeze(0).float()

    with torch.no_grad():
        preds = model(input_tensor)
        pred  = preds[-1] if isinstance(preds, (list, tuple)) else preds
        mask  = pred.sigmoid().squeeze().cpu().numpy()

    refined  = _refine_mask(mask, rgb_np)

    # LANCZOS 缩回原始尺寸
    mask_pil = Image.fromarray(refined).resize(original_size, Image.LANCZOS)

    # 缩放后再次颜色感知清理（消除插值产生的近背景色半透明像素）
    alpha_np = np.array(mask_pil)
    alpha_np = _post_resize_cleanup(alpha_np, rgb_np)
    mask_pil = Image.fromarray(alpha_np)

    result = rgb_image.convert("RGBA")
    result.putalpha(mask_pil)
    return result
