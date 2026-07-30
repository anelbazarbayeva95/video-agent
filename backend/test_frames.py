"""Offline test for the frame-sampling pipeline in frames.py.

Generates a tiny synthetic video with ffmpeg and mocks the Gemini call so the
sampling + selection logic can be verified without GEMINI_API_KEY. It checks
the lightweight-pipeline invariants: at most SAMPLE_FRAMES are sampled and the
images uploaded to Gemini are downscaled to the GEMINI_THUMB long side, while
the returned frames still carry full-resolution image bytes and metrics.
Run: python test_frames.py
"""
import io
import os
import sys
import json
import subprocess
import tempfile
import types as _t
from unittest import mock

from PIL import Image

os.environ.setdefault("GEMINI_API_KEY", "test-key")
import frames


def _make_video(path: str, seconds: int = 30, size=(1280, 720)):
    """A short test clip: a moving box on a color-cycling background."""
    w, h = size
    subprocess.run(
        ["ffmpeg", "-y", "-f", "lavfi", "-i",
         f"testsrc=duration={seconds}:size={w}x{h}:rate=15",
         "-pix_fmt", "yuv420p", path],
        check=True, capture_output=True,
    )


def _fake_gemini(seen_sizes):
    """Fake generate_content: record the size of every uploaded image, then
    return a valid scenes/frames JSON referencing the labeled timestamps."""
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
                 "face": None, "composition": 70,
                 "reason": "clear test frame"}
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

    with mock.patch.object(frames.client.models, "generate_content", _fake_gemini(seen)):
        result = frames.extract_best_frames(video_bytes, "mp4", count=5)

    ok &= _assert(len(seen) <= frames.SAMPLE_FRAMES,
                  f"sampled <= {frames.SAMPLE_FRAMES} frames to Gemini (got {len(seen)})")
    ok &= _assert(all(max(w, h) <= frames.GEMINI_THUMB for w, h in seen),
                  f"all Gemini thumbs <= {frames.GEMINI_THUMB}px long side "
                  f"(max seen {max((max(s) for s in seen), default=0)})")
    ok &= _assert(1 <= len(result) <= 5, f"returned 1..5 frames (got {len(result)})")

    if result:
        first = result[0]
        disp = Image.open(io.BytesIO(__import__("base64").b64decode(first["image_b64"])))
        ok &= _assert(max(disp.size) > frames.GEMINI_THUMB,
                      f"display image kept at full res ({disp.size})")
        ok &= _assert("metrics" in first and "sharpness" in first["metrics"],
                      "returned frames carry deterministic metrics")

    print("\nALL PASSED" if ok else "\nSOME FAILED")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
