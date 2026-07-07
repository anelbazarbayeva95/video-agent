import io
import os
from PIL import Image, ImageFilter
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
IMAGE_MODEL = "gemini-2.5-flash-image"

# aspect -> (ratio w/h, output long side)
ASPECTS = {
    "16:9": (16 / 9, 1600),
    "9:16": (9 / 16, 1600),
    "1:1": (1.0, 1280),
    "4:5": (4 / 5, 1280),
}

EXPAND_PROMPT = """Outpaint this image to fill the whole frame. The center is a \
real photo; the hazy/streaked areas around it are empty canvas you must replace \
with newly generated content. Extend the scene outward so it looks like a single \
wider photograph taken from the same spot — invent plausible surroundings that \
match the lighting, shadows, colors, textures, perspective, and depth of field. \
The generated areas must be fully detailed and photographic, never blurred or \
streaked, and must blend into the center with no visible seam or brightness step. \
Preserve the central subject exactly — same people, same faces and identity, same \
pose, clothing, and expression; do not alter, duplicate, or move them. Output one \
seamless photograph."""


def _canvas_size(w, h, ratio):
    if w / h < ratio:
        return round(h * ratio), h
    return w, round(w / ratio)


def _edge_smear(orig, cw, ch, ox, oy):
    """Fill the expansion area by stretching the original's edge pixels outward,
    giving the model real color/structure to continue instead of flat blur."""
    w, h = orig.size
    canvas = Image.new("RGB", (cw, ch))
    # base: stretch whole image to cover, softly blurred so leftover streaks
    # the model doesn't repaint read as haze, not hard smears
    canvas.paste(orig.resize((cw, ch)).filter(ImageFilter.GaussianBlur(12)), (0, 0))
    strip = max(2, min(w, h) // 50)
    if ox > 0:  # left / right extensions
        left = orig.crop((0, 0, strip, h)).resize((ox, h))
        right = orig.crop((w - strip, 0, w, h)).resize((cw - ox - w, h))
        canvas.paste(left, (0, oy))
        canvas.paste(right, (ox + w, oy))
    if oy > 0:  # top / bottom extensions
        top = orig.crop((0, 0, w, strip)).resize((w, oy))
        bot = orig.crop((0, h - strip, w, h)).resize((w, ch - oy - h))
        canvas.paste(top, (ox, 0))
        canvas.paste(bot, (ox, oy + h))
    canvas.paste(orig, (ox, oy))
    return canvas


def expand(image_bytes: bytes, aspect: str) -> bytes:
    if aspect not in ASPECTS:
        raise ValueError(f"Unknown aspect '{aspect}'. Options: {', '.join(ASPECTS)}")
    ratio, long_side = ASPECTS[aspect]

    orig = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    w, h = orig.size
    cw, ch = _canvas_size(w, h, ratio)
    if (cw, ch) == (w, h):
        return image_bytes
    ox, oy = (cw - w) // 2, (ch - h) // 2

    canvas = _edge_smear(orig, cw, ch, ox, oy)
    buf = io.BytesIO()
    canvas.save(buf, format="JPEG", quality=92)

    resp = client.models.generate_content(
        model=IMAGE_MODEL,
        contents=[types.Part.from_bytes(data=buf.getvalue(), mime_type="image/jpeg"),
                  types.Part.from_text(text=EXPAND_PROMPT)],
    )
    out = None
    for part in resp.candidates[0].content.parts:
        if part.inline_data and part.inline_data.data:
            out = part.inline_data.data
            break
    if out is None:
        raise RuntimeError("Model returned no image")

    # The model output is internally seamless; compositing the original back
    # over it re-introduces a visible tone-step band, so we trust the model's
    # frame (the prompt pins the central subject to stay unchanged).
    result = Image.open(io.BytesIO(out)).convert("RGB").resize((cw, ch))

    if max(cw, ch) > long_side:
        if cw >= ch:
            result = result.resize((long_side, round(ch * long_side / cw)))
        else:
            result = result.resize((round(cw * long_side / ch), long_side))

    out_buf = io.BytesIO()
    result.save(out_buf, format="JPEG", quality=92)
    return out_buf.getvalue()
