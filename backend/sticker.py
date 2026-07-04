import io
import os
from collections import deque
from statistics import median
from PIL import Image, ImageFilter
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

IMAGE_MODEL = "gemini-2.5-flash-image"

# Chroma key: the model is told to paint the background magenta, but the shade
# it actually produces drifts, so we sample the real background color from the
# image border and flood-fill from the edges (only the connected background
# region is keyed, protecting similar colors inside the subject).
KEY_HARD = 60    # distance to sampled bg color below this -> background
KEY_SOFT = 120   # feather band at the subject edge

# "cutout" is a faithful Apple-style subject lift (real pixels preserved).
# The others regenerate the subject in a chosen art style. All produce a
# magenta background that is keyed out; the white die-cut outline and the
# tight crop are added by us afterward (not by the model).
STYLES = {
    "cutout": None,  # handled by CUTOUT_PROMPT below
    "cartoon": "Redraw the subject as a bold-outline, flat-color cartoon illustration.",
    "3d": "Re-render the subject as a glossy 3D animated-movie character with soft studio lighting.",
    "pixel": "Redraw the subject as retro 16-bit pixel art with a limited color palette.",
    "oil": "Repaint the subject as a textured oil painting with visible brushstrokes.",
}

# Faithful lift: keep the real subject exactly, only swap the background.
CUTOUT_PROMPT = """Isolate the main subject in this photo. Keep the subject EXACTLY as-is — \
identical pixels, same details, colors, textures, and edges. Do NOT stylize, redraw, \
crop, or alter the subject in any way. Replace ONLY the background with a solid, uniform, \
pure magenta (#FF00FF) that fills every pixel not covered by the subject. \
No shadows, no gradients, no outline, no text."""

# Stylized redraw: regenerate the subject in an art style on magenta.
STYLE_PROMPT = """Redraw the main subject of this image as a sticker. {style}
Place the subject centered on a solid, uniform, pure magenta (#FF00FF) background that fills \
every pixel not covered by the subject. No white outline, no shadow, no gradient, no text — \
just the subject on flat magenta."""

# White die-cut outline thickness, as a fraction of the subject's longer side.
OUTLINE_FRAC = 0.04


def _key_out_background(png_bytes: bytes) -> Image.Image:
    """Convert the solid background to transparency with soft edges."""
    img = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
    px = img.load()
    w, h = img.size

    # Sample the background color from the border ring
    ring = [px[x, y][:3] for x in range(0, w, 8) for y in (0, h - 1)]
    ring += [px[x, y][:3] for y in range(0, h, 8) for x in (0, w - 1)]
    bg = tuple(median(c[i] for c in ring) for i in range(3))

    def dist(p):
        return ((p[0] - bg[0]) ** 2 + (p[1] - bg[1]) ** 2 + (p[2] - bg[2]) ** 2) ** 0.5

    # Flood fill from the edges: transparent where connected to the border
    # and close to the bg color; feathered alpha in the soft band at the edge.
    visited = bytearray(w * h)
    queue = deque()
    for x in range(w):
        queue.append((x, 0))
        queue.append((x, h - 1))
    for y in range(h):
        queue.append((0, y))
        queue.append((w - 1, y))

    span = KEY_SOFT - KEY_HARD
    while queue:
        x, y = queue.popleft()
        idx = y * w + x
        if visited[idx]:
            continue
        visited[idx] = 1
        p = px[x, y]
        d = dist(p)
        if d > KEY_SOFT:
            continue
        if d <= KEY_HARD:
            px[x, y] = (p[0], p[1], p[2], 0)
            if x > 0: queue.append((x - 1, y))
            if x < w - 1: queue.append((x + 1, y))
            if y > 0: queue.append((x, y - 1))
            if y < h - 1: queue.append((x, y + 1))
        else:
            # edge pixel: feather alpha and despill the background color cast
            # (e.g. pull the magenta tint out of the fringe) so the border of
            # the cutout doesn't glow pink.
            alpha = int(255 * (d - KEY_HARD) / span)
            r, g, b = p[0], p[1], p[2]
            spill = (r + b) // 2 - g
            if bg[0] > bg[1] and bg[2] > bg[1] and spill > 0:  # magenta-ish bg
                r = max(0, r - spill)
                b = max(0, b - spill)
            px[x, y] = (r, g, b, min(p[3], alpha))
    return img


def _add_die_cut(img: Image.Image, outline_frac: float = OUTLINE_FRAC) -> Image.Image:
    """Add a white die-cut outline around the subject and tight-crop to it."""
    alpha = img.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        return img

    sw, sh = bbox[2] - bbox[0], bbox[3] - bbox[1]
    outline = max(4, round(outline_frac * max(sw, sh)))
    pad = outline + 4

    x0 = max(0, bbox[0] - pad)
    y0 = max(0, bbox[1] - pad)
    x1 = min(img.width, bbox[2] + pad)
    y1 = min(img.height, bbox[3] + pad)
    subj = img.crop((x0, y0, x1, y1))

    # Dilate the subject silhouette to form the white outline ring.
    binary = subj.getchannel("A").point(lambda p: 255 if p >= 110 else 0)
    dilated = binary
    for _ in range(max(1, outline // 2)):
        dilated = dilated.filter(ImageFilter.MaxFilter(5))

    base = Image.new("RGBA", subj.size, (0, 0, 0, 0))
    white = Image.new("RGBA", subj.size, (255, 255, 255, 255))
    base = Image.composite(white, base, dilated)  # white where dilated
    base.alpha_composite(subj)                    # real subject on top

    final = base.getchannel("A").getbbox()
    return base.crop(final) if final else base


def generate_sticker(image_bytes: bytes, style: str = "cutout", fmt: str = "png") -> bytes:
    if style not in STYLES:
        raise ValueError(f"Unknown style '{style}'. Options: {', '.join(STYLES)}")
    if fmt not in ("png", "webp"):
        raise ValueError("Format must be png or webp")

    if style == "cutout":
        prompt = CUTOUT_PROMPT
    else:
        prompt = STYLE_PROMPT.format(style=STYLES[style])

    response = client.models.generate_content(
        model=IMAGE_MODEL,
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
            types.Part.from_text(text=prompt),
        ],
    )

    image_out = None
    for part in response.candidates[0].content.parts:
        if part.inline_data and part.inline_data.data:
            image_out = part.inline_data.data
            break
    if image_out is None:
        raise RuntimeError("Model returned no image")

    img = _key_out_background(image_out)
    img = _add_die_cut(img)
    buf = io.BytesIO()
    img.save(buf, format=fmt.upper())
    return buf.getvalue()
