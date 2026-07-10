import io
import math
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

LONG_SIDE = 1600          # cap on the generated canvas's longer side
MAX_MARGIN = 1.5          # cap each side's drag at 150% of the dimension

EXPAND_PROMPT = """Outpaint this image to fill the whole frame. The center is a \
real photo; the soft, blurred areas around it are a rough guide for empty canvas \
that you must repaint with newly generated, sharp, photographic content. Extend \
the scene outward so it looks like a single wider photograph taken from the same \
spot — invent plausible surroundings that match the lighting, shadows, colors, \
textures, perspective, and depth of field. The generated areas must be fully \
detailed and in focus, never blurred, streaked, or smudged, and must blend into \
the center with no visible seam or brightness step. IMPORTANT: the guide may \
contain faint mirrored or duplicated copies of the people or objects — do NOT \
keep them; the surroundings must contain only natural background (sky, foliage, \
ground, scenery), no repeated or reflected subjects. Preserve the central subject \
exactly — same people, same faces and identity, same pose, clothing, and \
expression; do not alter, duplicate, or move them. Output one seamless \
photograph."""


def _canvas_size(w, h, ratio):
    if w / h < ratio:
        return round(h * ratio), h
    return w, round(w / ratio)


def _mirror_fill(orig, cw, ch, ox, oy):
    """Fill the expansion area with a seamless mirror-reflection of the image,
    then soften it. Reflection gives the model real, continuous texture/color to
    refine (no stretched streaks), and works for any expansion size by tiling.
    The crisp original is pasted back on top so only the subject stays sharp."""
    w, h = orig.size
    flips = {
        (0, 0): orig,
        (1, 0): orig.transpose(Image.FLIP_LEFT_RIGHT),
        (0, 1): orig.transpose(Image.FLIP_TOP_BOTTOM),
        (1, 1): orig.transpose(Image.FLIP_LEFT_RIGHT).transpose(Image.FLIP_TOP_BOTTOM),
    }
    canvas = Image.new("RGB", (cw, ch))
    i0, i1 = math.ceil(ox / w), math.ceil((cw - ox - w) / w)
    j0, j1 = math.ceil(oy / h), math.ceil((ch - oy - h) / h)
    for i in range(-i0, i1 + 1):
        for j in range(-j0, j1 + 1):
            canvas.paste(flips[(abs(i) % 2, abs(j) % 2)], (ox + i * w, oy + j * h))

    # Soften the reflected plane just enough to read as an unfinished guide the
    # model repaints (a light blur ~12px reliably triggers regeneration; heavier
    # blur reads as real bokeh and gets echoed back). Then restore the sharp
    # original so only the subject stays crisp.
    canvas = canvas.filter(ImageFilter.GaussianBlur(12))
    canvas.paste(orig, (ox, oy))
    return canvas


def _generate(orig, cw, ch, ox, oy, long_side):
    """Mirror-fill the expansion area, let the model outpaint it seamlessly, and
    return the result downscaled to `long_side` as JPEG bytes."""
    canvas = _mirror_fill(orig, cw, ch, ox, oy)
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


def expand(image_bytes: bytes, aspect: str) -> bytes:
    """Preset: expand symmetrically to a named aspect ratio."""
    if aspect not in ASPECTS:
        raise ValueError(f"Unknown aspect '{aspect}'. Options: {', '.join(ASPECTS)}")
    ratio, long_side = ASPECTS[aspect]

    orig = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    w, h = orig.size
    cw, ch = _canvas_size(w, h, ratio)
    # Growth under ~2% means the frame is already this aspect — nothing to add.
    if cw <= w * 1.02 and ch <= h * 1.02:
        raise ValueError(f"This frame is already {aspect} — nothing to expand. Try the other ratio or Custom.")
    ox, oy = (cw - w) // 2, (ch - h) // 2
    return _generate(orig, cw, ch, ox, oy, long_side)


def expand_margins(image_bytes: bytes, left=0.0, right=0.0, top=0.0, bottom=0.0) -> bytes:
    """Free-form: extend each side by a fraction of its dimension.

    left/right are fractions of the original width, top/bottom of the height
    (e.g. right=0.5 adds 50% more width on the right). Sides can differ, so the
    canvas can grow asymmetrically."""
    left = max(0.0, min(MAX_MARGIN, left))
    right = max(0.0, min(MAX_MARGIN, right))
    top = max(0.0, min(MAX_MARGIN, top))
    bottom = max(0.0, min(MAX_MARGIN, bottom))

    orig = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    w, h = orig.size
    ox, oy = round(w * left), round(h * top)
    cw = w + ox + round(w * right)
    ch = h + oy + round(h * bottom)
    if (cw, ch) == (w, h):
        return image_bytes
    return _generate(orig, cw, ch, ox, oy, LONG_SIDE)
