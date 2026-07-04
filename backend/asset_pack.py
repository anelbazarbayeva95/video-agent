import asyncio
import base64

from frames import extract_best_frames
from sticker import generate_sticker
from reframe import smart_crop

# Asset Pack composition (per the frontend spec):
#   5 best frames, 3 stickers (from the top frames), 1 thumbnail (16:9),
#   1 story (9:16). Assets are streamed as they become ready so the UI can
#   reveal them incrementally instead of waiting for the whole pipeline.
STICKER_COUNT = 3


def _b64(data: bytes) -> str:
    return base64.b64encode(data).decode()


async def build_asset_pack(video_bytes, ext, prompt=None, count=5, sticker_style="cutout"):
    yield {"type": "status", "stage": "analyzing",
           "message": "Detecting scenes and scoring frames…"}

    frames = await asyncio.to_thread(extract_best_frames, video_bytes, ext, prompt, count)
    if not frames:
        yield {"type": "error", "message": "No frames could be extracted from the video"}
        return

    # Best frames arrive first so the Moment Map can render immediately.
    yield {"type": "frames", "frames": frames}

    best_bytes = base64.b64decode(frames[0]["image_b64"])

    # Thumbnail (16:9)
    yield {"type": "status", "stage": "thumbnail", "message": "Creating 16:9 thumbnail…"}
    try:
        thumb = await asyncio.to_thread(smart_crop, best_bytes, "16:9")
        yield {"type": "asset", "asset": {
            "kind": "thumbnail", "aspect": "16:9",
            "image_b64": _b64(thumb), "mime": "image/jpeg",
            "timestamp": frames[0]["timestamp"],
        }}
    except Exception as e:
        yield {"type": "asset_error", "kind": "thumbnail", "message": str(e)}

    # Story (9:16)
    yield {"type": "status", "stage": "story", "message": "Creating 9:16 story…"}
    try:
        story = await asyncio.to_thread(smart_crop, best_bytes, "9:16")
        yield {"type": "asset", "asset": {
            "kind": "story", "aspect": "9:16",
            "image_b64": _b64(story), "mime": "image/jpeg",
            "timestamp": frames[0]["timestamp"],
        }}
    except Exception as e:
        yield {"type": "asset_error", "kind": "story", "message": str(e)}

    # Stickers from the top frames
    for i, fr in enumerate(frames[:STICKER_COUNT]):
        yield {"type": "status", "stage": "sticker",
               "message": f"Removing background {i + 1}/{min(STICKER_COUNT, len(frames))}…"}
        try:
            png = await asyncio.to_thread(
                generate_sticker, base64.b64decode(fr["image_b64"]), sticker_style, "png")
            yield {"type": "asset", "asset": {
                "kind": "sticker",
                "image_b64": _b64(png), "mime": "image/png",
                "timestamp": fr["timestamp"], "label": fr.get("label"),
            }}
        except Exception as e:
            yield {"type": "asset_error", "kind": "sticker", "message": str(e)}

    yield {"type": "status", "stage": "done", "message": "Asset pack ready"}
    yield {"type": "done"}
