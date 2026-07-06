import asyncio
import base64

from frames import extract_best_frames
from sticker import generate_sticker
from reframe import smart_crop

# Asset Pack composition (defaults per the frontend spec): 5 best frames,
# 3 stickers, 1 thumbnail (16:9), 1 story (9:16). Every count is caller-
# configurable from 1-5; variations are cut from different top frames.
# Assets stream as they become ready so the UI reveals them incrementally.
MAX_VARIATIONS = 5


def _b64(data: bytes) -> str:
    return base64.b64encode(data).decode()


def _clamp(n, default):
    try:
        return max(1, min(int(n), MAX_VARIATIONS))
    except (TypeError, ValueError):
        return default


async def build_asset_pack(video_bytes, ext, prompt=None, count=5,
                           sticker_style="cutout", stickers=3,
                           thumbnails=1, stories=1):
    count = _clamp(count, 5)
    stickers = _clamp(stickers, 3)
    thumbnails = _clamp(thumbnails, 1)
    stories = _clamp(stories, 1)

    yield {"type": "status", "stage": "analyzing",
           "message": "Detecting scenes and scoring frames…"}

    frames = await asyncio.to_thread(extract_best_frames, video_bytes, ext, prompt, count)
    if not frames:
        yield {"type": "error", "message": "No frames could be extracted from the video"}
        return

    # Best frames arrive first so the Moment Map can render immediately.
    yield {"type": "frames", "frames": frames}

    def frame_bytes(i):
        # variation i comes from the i-th best frame, wrapping if fewer frames
        fr = frames[i % len(frames)]
        return base64.b64decode(fr["image_b64"]), fr

    # Thumbnails (16:9)
    for i in range(thumbnails):
        yield {"type": "status", "stage": "thumbnail",
               "message": f"Creating 16:9 thumbnail {i + 1}/{thumbnails}…"}
        data, fr = frame_bytes(i)
        try:
            thumb = await asyncio.to_thread(smart_crop, data, "16:9")
            yield {"type": "asset", "asset": {
                "kind": "thumbnail", "aspect": "16:9",
                "image_b64": _b64(thumb), "mime": "image/jpeg",
                "timestamp": fr["timestamp"],
            }}
        except Exception as e:
            yield {"type": "asset_error", "kind": "thumbnail", "message": str(e)}

    # Stories (9:16)
    for i in range(stories):
        yield {"type": "status", "stage": "story",
               "message": f"Creating 9:16 story {i + 1}/{stories}…"}
        data, fr = frame_bytes(i)
        try:
            story = await asyncio.to_thread(smart_crop, data, "9:16")
            yield {"type": "asset", "asset": {
                "kind": "story", "aspect": "9:16",
                "image_b64": _b64(story), "mime": "image/jpeg",
                "timestamp": fr["timestamp"],
            }}
        except Exception as e:
            yield {"type": "asset_error", "kind": "story", "message": str(e)}

    # Stickers from the top frames
    for i in range(stickers):
        yield {"type": "status", "stage": "sticker",
               "message": f"Removing background {i + 1}/{stickers}…"}
        data, fr = frame_bytes(i)
        try:
            png = await asyncio.to_thread(generate_sticker, data, sticker_style, "png")
            yield {"type": "asset", "asset": {
                "kind": "sticker",
                "image_b64": _b64(png), "mime": "image/png",
                "timestamp": fr["timestamp"], "label": fr.get("label"),
            }}
        except Exception as e:
            yield {"type": "asset_error", "kind": "sticker", "message": str(e)}

    yield {"type": "status", "stage": "done", "message": "Asset pack ready"}
    yield {"type": "done"}
