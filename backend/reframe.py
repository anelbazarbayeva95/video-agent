import io
import os
import json
from PIL import Image
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# aspect name -> (ratio w/h, output long-side pixels)
ASPECTS = {
    "16:9": (16 / 9, 1280),   # thumbnail
    "9:16": (9 / 16, 1920),   # story
    "1:1": (1.0, 1080),       # square post
}

BOX_PROMPT = """Detect the single most important subject in this image (a person, \
face, product, or the clear focal point). Return ONLY JSON:
{"box_2d": [ymin, xmin, ymax, xmax]}
with coordinates normalized to 0-1000. If there is no clear subject, return the \
region that best represents the image."""


def _subject_box(image_bytes: bytes, w: int, h: int):
    """Return the subject bounding box in pixels, or None on failure."""
    try:
        r = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                      types.Part.from_text(text=BOX_PROMPT)],
            config=types.GenerateContentConfig(temperature=0),
        )
        t = r.text.strip()
        if t.startswith("```"):
            t = t.split("```")[1]
            if t.startswith("json"):
                t = t[4:]
        data = json.loads(t.strip())
        if isinstance(data, list):
            data = data[0]
        ymin, xmin, ymax, xmax = data["box_2d"]
        x0 = max(0, min(w, round(xmin / 1000 * w)))
        y0 = max(0, min(h, round(ymin / 1000 * h)))
        x1 = max(0, min(w, round(xmax / 1000 * w)))
        y1 = max(0, min(h, round(ymax / 1000 * h)))
        if x1 <= x0 or y1 <= y0:
            return None
        return (x0, y0, x1, y1)
    except Exception:
        return None


def _crop_window(w: int, h: int, ratio: float, center):
    """Largest rectangle of the given aspect ratio that fits in WxH, centered on
    `center` (clamped to the image)."""
    if w / h > ratio:
        crop_h = h
        crop_w = round(h * ratio)
    else:
        crop_w = w
        crop_h = round(w / ratio)
    cx, cy = center
    x0 = round(cx - crop_w / 2)
    y0 = round(cy - crop_h / 2)
    x0 = max(0, min(x0, w - crop_w))
    y0 = max(0, min(y0, h - crop_h))
    return (x0, y0, x0 + crop_w, y0 + crop_h)


def smart_crop(image_bytes: bytes, aspect: str) -> bytes:
    """Crop an image to `aspect`, keeping the subject centered. Never upscales
    or expands the canvas (generative expansion is a future enhancement)."""
    if aspect not in ASPECTS:
        raise ValueError(f"Unknown aspect '{aspect}'. Options: {', '.join(ASPECTS)}")
    ratio, long_side = ASPECTS[aspect]

    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    w, h = img.size

    box = _subject_box(image_bytes, w, h)
    if box:
        cx = (box[0] + box[2]) / 2
        cy = (box[1] + box[3]) / 2
    else:
        cx, cy = w / 2, h / 2

    crop = img.crop(_crop_window(w, h, ratio, (cx, cy)))

    # Downscale to the target long side (never upscale).
    cw, ch = crop.size
    if max(cw, ch) > long_side:
        if cw >= ch:
            crop = crop.resize((long_side, round(ch * long_side / cw)))
        else:
            crop = crop.resize((round(cw * long_side / ch), long_side))

    buf = io.BytesIO()
    crop.save(buf, format="JPEG", quality=90)
    return buf.getvalue()
