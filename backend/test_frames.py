"""Offline test for the frame-sampling pipeline in frames.py.

Generates a tiny synthetic video with ffmpeg and mocks the Gemini call so the
sampling + selection logic can be verified without GEMINI_API_KEY. It checks
the lightweight-pipeline invariants: at most `max_frames` are sampled and the
images uploaded to Gemini are downscaled thumbnails, while the returned frames
still carry full-resolution image bytes and deterministic metrics.
Run: python test_frames.py
"""
import io
import os
import sys
import json
import base64
import subprocess
import tempfile
import types as _t
from unittest import mock

from PIL import Image

import frames


def _make_video(path: str, seconds: int = 30, size=(1280, 720)):
    """A short synthetic test clip (moving pattern) via ffmpeg's testsrc."""
    w, h = size
    subprocess.run(
        ["ffmpeg", "-y", "-f", "lavfi", "-i",
         f"testsrc=duration={seconds}:size={w}x{h}:rate=15",
         "-pix_fmt", "yuv420p", path],
        check=True, capture_output=True,
    )


def _fake_generate(seen_sizes):
    """Record the size of every uploaded image, then return valid scenes JSON
    referencing the labeled timestamps."""
    def _fn(model, contents, config=None):
        timestamps = []
        for part in contents:
            data = getattr(part, "inline_data", None)
            if data is not None and getattr(data, "data", None):
                seen_sizes.append(Image.open(io.BytesIO(data.data)).size)
            text = getattr(part, "text", None)
            if text and text.startswith("[Frame at "):
                timestamps.append(float(text[len("[Frame at "):].rstrip("s]")))
        payload = {"scenes": [{
            "label": "test scene", "start": timestamps[0], "end": timestamps[-1],
            "frames": [
                {"timestamp": ts, "score": 90 - i * 5, "sharpness": 80,
                 "face": None, "composition": 70, "reason": "clear test frame"}
                for i, ts in enumerate(timestamps[:6])
            ],
        }]}
        return _t.SimpleNamespace(text=json.dumps(payload))
    return _fn


def _assert(cond, msg):
    print(("  ok:   " if cond else "  FAIL: ") + msg)
    return cond


def main():
    ok = True
    seen = []
    with tempfile.TemporaryDirectory() as d:
        vid = os.path.join(d, "clip.mp4")
        _make_video(vid, seconds=30)
        with open(vid, "rb") as fh:
            video_bytes = fh.read()

    fake = _t.SimpleNamespace(models=_t.SimpleNamespace(generate_content=_fake_generate(seen)))
    with mock.patch.object(frames, "get_client", lambda: fake):
        result = frames.extract_best_frames(video_bytes, "mp4", count=5)

    ok &= _assert(len(seen) <= 16, f"sampled <= 16 frames to Gemini (got {len(seen)})")
    ok &= _assert(all(max(s) <= 512 for s in seen),
                  f"Gemini thumbs downscaled to <= 512px long side "
                  f"(max seen {max((max(s) for s in seen), default=0)})")
    ok &= _assert(1 <= len(result) <= 5, f"returned 1..5 frames (got {len(result)})")

    if result:
        first = result[0]
        disp = Image.open(io.BytesIO(base64.b64decode(first["image_b64"])))
        ok &= _assert(max(disp.size) > 512, f"display image kept at full res ({disp.size})")
        ok &= _assert("metrics" in first and "sharpness" in first["metrics"],
                      "returned frames carry deterministic metrics")

    print("\nALL PASSED" if ok else "\nSOME FAILED")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
