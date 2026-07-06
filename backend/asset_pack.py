import asyncio
import base64

from frames import extract_best_frames
from sticker import generate_sticker
from reframe import smart_crop, detect_box

# Asset Pack composition (defaults per the frontend spec): 5 best frames,
# 3 stickers, 1 thumbnail (16:9), 1 story (9:16). Every count is caller-
# configurable from 1-5. Generation is CONCURRENT (bounded by a semaphore)
# and results stream in completion order, so a 4/4/4 pack takes a few
# generation rounds instead of ~20 sequential model calls. The subject box
# is detected once per source frame and shared by that frame's thumbnail
# and story crops.
MAX_VARIATIONS = 5
MAX_CONCURRENCY = 3  # stay under Gemini rate limits


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

    total = thumbnails + stories + stickers
    yield {"type": "status", "stage": "generating",
           "message": f"Generating {total} assets…"}

    sem = asyncio.Semaphore(MAX_CONCURRENCY)
    frame_data = [base64.b64decode(f["image_b64"]) for f in frames]

    # Detect each needed frame's subject box once; thumbnail + story reuse it.
    crop_indices = {i % len(frames) for i in range(max(thumbnails, stories))}
    boxes = {}

    async def find_box(idx):
        async with sem:
            try:
                boxes[idx] = await asyncio.to_thread(detect_box, frame_data[idx])
            except Exception:
                boxes[idx] = None

    await asyncio.gather(*(find_box(i) for i in crop_indices))

    async def make(kind, i):
        idx = i % len(frames)
        fr = frames[idx]
        try:
            async with sem:
                if kind == "sticker":
                    out = await asyncio.to_thread(
                        generate_sticker, frame_data[idx], sticker_style, "png")
                    asset = {"kind": "sticker", "image_b64": _b64(out),
                             "mime": "image/png", "timestamp": fr["timestamp"],
                             "label": fr.get("label")}
                else:
                    aspect = "16:9" if kind == "thumbnail" else "9:16"
                    out = await asyncio.to_thread(
                        smart_crop, frame_data[idx], aspect, boxes.get(idx))
                    asset = {"kind": kind, "aspect": aspect,
                             "image_b64": _b64(out), "mime": "image/jpeg",
                             "timestamp": fr["timestamp"]}
            return {"type": "asset", "asset": asset}
        except Exception as e:
            return {"type": "asset_error", "kind": kind, "message": str(e)}

    tasks = (
        [asyncio.create_task(make("thumbnail", i)) for i in range(thumbnails)]
        + [asyncio.create_task(make("story", i)) for i in range(stories)]
        + [asyncio.create_task(make("sticker", i)) for i in range(stickers)]
    )

    done_count = 0
    for fut in asyncio.as_completed(tasks):
        event = await fut
        yield event
        done_count += 1
        if done_count < total:
            yield {"type": "status", "stage": "generating",
                   "message": f"Generating assets… {done_count}/{total} ready"}

    yield {"type": "status", "stage": "done", "message": "Asset pack ready"}
    yield {"type": "done"}
