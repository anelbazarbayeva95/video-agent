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

EXPAND_PROMPT = """This image has a sharp real photo in the center and a blurred \
placeholder filling the border area. Regenerate ONLY the blurred border so the \
scene continues naturally outward from the center — same setting, subject, style, \
lighting, and perspective, as if the camera had captured a wider view. Keep the \
sharp central region exactly as it is. Output the full image at the same dimensions."""


def _canvas_size(w, h, ratio):
    """Smallest canvas of `ratio` that fully contains the original."""
    if w / h < ratio:          # too tall -> add width
        return round(h * ratio), h
    return w, round(w / ratio)  # too wide -> add height


def expand(image_bytes: bytes, aspect: str) -> bytes:
    if aspect not in ASPECTS:
        raise ValueError(f"Unknown aspect '{aspect}'. Options: {', '.join(ASPECTS)}")
    ratio, long_side = ASPECTS[aspect]

    orig = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    w, h = orig.size
    cw, ch = _canvas_size(w, h, ratio)
    if (cw, ch) == (w, h):
        # already the target ratio; nothing to expand
        return image_bytes
    ox, oy = (cw - w) // 2, (ch - h) // 2

    # Blurred "cover" of the original as border context, sharp original on top.
    bg = orig.resize((cw, ch)).filter(ImageFilter.GaussianBlur(28))
    canvas = bg.copy()
    canvas.paste(orig, (ox, oy))

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

    result = Image.open(io.BytesIO(out)).convert("RGB").resize((cw, ch))

    # Hard-restore the real photo in the center with a feathered seam so the
    # generated border blends but the original pixels are exact.
    mask = Image.new("L", (cw, ch), 0)
    feather = max(8, min(w, h) // 40)
    inner = Image.new("L", (w, h), 255)
    mask.paste(inner, (ox, oy))
    mask = mask.filter(ImageFilter.GaussianBlur(feather))
    # ensure the very center is fully original
    core = Image.new("L", (w - 2 * feather, h - 2 * feather), 255)
    mask.paste(core, (ox + feather, oy + feather))
    full_orig = Image.new("RGB", (cw, ch))
    full_orig.paste(orig, (ox, oy))
    result = Image.composite(full_orig, result, mask)

    if max(cw, ch) > long_side:
        if cw >= ch:
            result = result.resize((long_side, round(ch * long_side / cw)))
        else:
            result = result.resize((round(cw * long_side / ch), long_side))

    out_buf = io.BytesIO()
    result.save(out_buf, format="JPEG", quality=92)
    return out_buf.getvalue()
