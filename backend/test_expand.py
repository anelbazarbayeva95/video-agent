"""Offline geometry tests for the stepwise outpaint in expand.py.

The Gemini call is mocked to echo its input canvas back, so these verify the
loop's geometry (convergence to the target aspect, capped per-step fill bands)
without needing GEMINI_API_KEY or the live model. Run: python test_expand.py
"""
import io
import sys
import types as _t
from unittest import mock

from PIL import Image

import expand


class _Part:
    def __init__(self, data):
        self.inline_data = _t.SimpleNamespace(data=data)
        self.text = None


def _echo_model(canvas_bytes_holder):
    """Return a fake generate_content that echoes the canvas it was given and
    records each step's canvas size so we can check the per-step growth cap."""
    def _fn(model, contents):
        jpeg = contents[0].inline_data.data
        img = Image.open(io.BytesIO(jpeg)).convert("RGB")
        canvas_bytes_holder.append(img.size)
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        return _t.SimpleNamespace(
            candidates=[_t.SimpleNamespace(content=_t.SimpleNamespace(parts=[_Part(buf.getvalue())]))]
        )
    return _fn


def _run(orig_size, cw, ch, ox, oy, long_side=1600):
    steps = []
    orig = Image.new("RGB", orig_size, (120, 90, 60))
    with mock.patch.object(expand.client.models, "generate_content", _echo_model(steps)):
        out = expand._generate(orig, cw, ch, ox, oy, long_side)
    img = Image.open(io.BytesIO(out)).convert("RGB")
    return img, steps


def _assert(cond, msg):
    if not cond:
        print(f"  FAIL: {msg}")
        return False
    print(f"  ok:   {msg}")
    return True


def _aspect_ok(img, cw, ch):
    return abs((img.size[0] / img.size[1]) - (cw / ch)) < 0.02


def main():
    ok = True

    # Case 1: portrait -> 16:9 (huge horizontal fill, the worst blur case).
    w, h = 1080, 1920
    ratio = 16 / 9
    cw, ch = expand._canvas_size(w, h, ratio)
    ox, oy = (cw - w) // 2, (ch - h) // 2
    img, steps = _run((w, h), cw, ch, ox, oy)
    ok &= _assert(_aspect_ok(img, cw, ch), f"portrait->16:9 aspect ({img.size} ~ {cw}x{ch})")
    ok &= _assert(max(img.size) <= 1600, f"portrait->16:9 downscaled to long_side ({img.size})")
    ok &= _assert(len(steps) >= 2, f"portrait->16:9 took multiple steps ({len(steps)})")

    # Each side's fill band per step is what governs quality: it must stay <=
    # STEP of the dimension. Both sides can grow, so total per-dimension growth
    # is bounded by 2*STEP. That per-side bound is the real cap we care about.
    prev = (w, h)
    step_ok = True
    for s in steps:
        gw = s[0] / prev[0] - 1
        gh = s[1] / prev[1] - 1
        if gw > 2 * expand.STEP + 0.01 or gh > 2 * expand.STEP + 0.01:
            step_ok = False
        prev = s
    ok &= _assert(step_ok, f"each side grows <= STEP={expand.STEP} per step (<= 2*STEP total/dim)")

    # Case 2: asymmetric free-form margins (right + bottom only).
    w, h = 1200, 800
    ox, oy = 0, 0
    cw, ch = w + round(w * 0.8), h + round(h * 0.6)
    img, steps = _run((w, h), cw, ch, ox, oy)
    ok &= _assert(_aspect_ok(img, cw, ch), f"asymmetric aspect ({img.size} ~ {cw}x{ch})")

    # Case 3: already-target (no-op) makes zero model calls.
    w, h = 1600, 900
    img, steps = _run((w, h), w, h, 0, 0)
    ok &= _assert(len(steps) == 0, f"no-op makes no model calls ({len(steps)})")

    print("\nALL PASSED" if ok else "\nSOME FAILED")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
