import io
import os
from collections import deque
from statistics import median
from PIL import Image
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

STYLES = {
    "original": "Keep the subject photorealistic and unchanged from the source image.",
    "cartoon": "Redraw the subject as a bold-outline, flat-color cartoon illustration.",
    "3d": "Re-render the subject as a glossy 3D animated-movie character with soft studio lighting.",
    "pixel": "Redraw the subject as retro 16-bit pixel art with a limited color palette.",
    "oil": "Repaint the subject as a textured oil painting with visible brushstrokes.",
}

STICKER_PROMPT = """Cut out the main subject of this image and turn it into a die-cut sticker.
{style}
Add a thick white sticker outline around the subject.
Place the sticker centered on a solid, uniform, pure magenta background (hex #FF00FF).
The magenta must fill every pixel not covered by the sticker — no shadows, no gradients, no text, no extra elements."""


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
            # edge pixel: feather alpha by distance from the bg color
            alpha = int(255 * (d - KEY_HARD) / span)
            px[x, y] = (p[0], p[1], p[2], min(p[3], alpha))
    return img


def generate_sticker(image_bytes: bytes, style: str = "original", fmt: str = "png") -> bytes:
    if style not in STYLES:
        raise ValueError(f"Unknown style '{style}'. Options: {', '.join(STYLES)}")
    if fmt not in ("png", "webp"):
        raise ValueError("Format must be png or webp")

    prompt = STICKER_PROMPT.format(style=STYLES[style])
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
    buf = io.BytesIO()
    img.save(buf, format=fmt.upper())
    return buf.getvalue()
