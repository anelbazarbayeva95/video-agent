import os
import io
import glob
import shutil
import base64
import json
import tempfile
import ffmpeg
from PIL import Image, ImageFilter, ImageStat
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

DEFAULT_COUNT = 5          # best frames returned by default (the Asset Pack set)
MAX_COUNT = 24             # hard cap on a caller-requested count
DUP_HAMMING = 6            # aHash distance below which two frames are near-duplicates


def _signature(jpeg_bytes: bytes) -> tuple[int, tuple[int, int, int]]:
    """(average hash, mean RGB) fingerprint for near-duplicate detection."""
    im = Image.open(io.BytesIO(jpeg_bytes))
    rgb = im.convert("RGB").resize((8, 8))
    r = g = b = 0
    for pr, pg, pb in rgb.getdata():
        r += pr; g += pg; b += pb
    n = 64
    mean = (r // n, g // n, b // n)

    gray = list(rgb.convert("L").getdata())
    avg = sum(gray) / len(gray)
    bits = 0
    for i, p in enumerate(gray):
        if p > avg:
            bits |= 1 << i
    return bits, mean


def _cv_metrics(jpeg_bytes: bytes) -> dict:
    """Deterministic, pixel-based metrics — pure Pillow, no extra dependencies.

    sharpness_raw = variance of the Laplacian (a standard focus/blur measure;
    higher = sharper). exposure = mean luminance 0-255."""
    im = Image.open(io.BytesIO(jpeg_bytes)).convert("L")
    lap = im.filter(ImageFilter.Kernel((3, 3), [0, 1, 0, 1, -4, 1, 0, 1, 0], scale=1))
    return {
        "sharpness_raw": ImageStat.Stat(lap).var[0],
        "exposure": ImageStat.Stat(im).mean[0],
    }


def _is_duplicate(sig, seen: list) -> bool:
    """Duplicate only if both the hash and the mean color are close — so two
    different flat frames (e.g. distinct title cards) are not merged."""
    h, mean = sig
    for sh, smean in seen:
        if bin(h ^ sh).count("1") <= DUP_HAMMING:
            cdist = sum((a - b) ** 2 for a, b in zip(mean, smean)) ** 0.5
            if cdist <= 40:
                return True
    return False


def _moment_label(scores: dict, scene_label: str) -> str:
    """Rule-based moment type for the Moment Map (see frontend spec)."""
    face = scores.get("face")
    sharp = scores.get("sharpness") or 0
    comp = scores.get("composition") or 0
    if face is not None and face >= 55:
        return "Speaker Close-up"
    if sharp >= 70 and (face is None or face < 30):
        return "Clean Visual"
    if comp >= 70:
        return "Wide Scene"
    return scene_label or "Moment"


def _select_diverse(scenes_frames: list[list[dict]], count: int,
                    frame_map: dict) -> list[dict]:
    """Pick up to `count` frames preferring scene diversity, dropping near-dups.

    Round-robin across scenes (best frame of each scene first, then the next
    best of each, ...), skipping frames that visually duplicate an earlier pick.
    """
    def img_for(entry):
        ts = min(frame_map.keys(), key=lambda x: abs(x - entry["timestamp"]))
        return frame_map[ts]

    # scenes ordered by their strongest frame
    ordered = sorted(
        scenes_frames,
        key=lambda fs: max((f["score"] or 0) for f in fs) if fs else 0,
        reverse=True,
    )
    selected, seen = [], []
    round_idx = 0
    while len(selected) < count and any(len(fs) > round_idx for fs in ordered):
        for fs in ordered:
            if round_idx >= len(fs):
                continue
            entry = fs[round_idx]
            sig = _signature(img_for(entry))
            if _is_duplicate(sig, seen):
                continue
            selected.append(entry)
            seen.append(sig)
            if len(selected) >= count:
                break
        round_idx += 1
    return selected

FRAME_PROMPT_HEAD = """You are a visual quality expert. You are given frames from a video, each labeled with its timestamp.

First, group the frames into scenes — contiguous stretches showing the same shot, setting, or action.
Then select the strongest candidate frames that would work as a thumbnail, social post image, or hero photo.
Aim to surface about {count} visually DISTINCT strong frames in total across the whole video — a single scene may contribute several frames when they differ meaningfully (different composition, subject, expression, or moment). Return fewer than {count} only if the video genuinely lacks that many good, different moments; never pad the list with near-duplicates of a frame you already chose.
Prioritize: sharp focus, good composition, faces clearly visible and expressive, good lighting, no motion blur, visually interesting moments.

Score every selected frame on these criteria, each 0-100:
- sharpness: focus quality and absence of motion blur
- face: how clearly visible, well-lit, and expressive faces are (null if no face in frame — do not penalize scenic shots)
- composition: framing, balance, lighting, visual interest
- score: overall quality as a standalone image, considering everything above
"""

FRAME_PROMPT_SCHEMA = """Return ONLY valid JSON with this structure:
{
  "scenes": [
    {
      "label": "<short scene description, a few words>",
      "start": <number — scene start timestamp>,
      "end": <number — scene end timestamp>,
      "frames": [
        {
          "timestamp": <number — must match one of the labeled frame timestamps exactly>,
          "score": <0-100>,
          "sharpness": <0-100>,
          "face": <0-100 or null>,
          "composition": <0-100>,
          "reason": "<one short sentence: why this frame stands out>"
        }
      ]
    }
  ]
}

Order scenes chronologically, and frames within each scene from best to least good."""


def frame_prompt(count: int) -> str:
    """Build the scoring prompt, asking the model to aim for `count` distinct
    strong frames so a high requested count actually yields more candidates."""
    return FRAME_PROMPT_HEAD.format(count=count) + "\n" + FRAME_PROMPT_SCHEMA


def _stderr_tail(e: ffmpeg.Error) -> str:
    if getattr(e, "stderr", None):
        lines = [l for l in e.stderr.decode(errors="replace").splitlines() if l.strip()]
        return " | ".join(lines[-3:])[-400:]
    return "no stderr captured"


SCALE_FILTER = "scale='if(gt(iw,ih),min(1280,iw),-2)':'if(gt(iw,ih),-2,min(1280,ih))'"


def pick_video_stream(probe: dict):
    """Return the index of the real video stream, skipping attached cover art.

    Social/phone videos often embed a still thumbnail as a second video
    stream (disposition.attached_pic=1). Left to auto-selection, ffmpeg can
    map that packet-less stream and abort with 'no packets received', so we
    choose the largest genuine video stream explicitly.
    """
    vids = [s for s in probe.get("streams", []) if s.get("codec_type") == "video"]
    if not vids:
        return None
    real = [s for s in vids if s.get("disposition", {}).get("attached_pic", 0) != 1]
    pool = real or vids
    best = max(pool, key=lambda s: (s.get("width") or 0) * (s.get("height") or 0))
    return best.get("index")


def probe_summary(probe: dict) -> str:
    """Compact per-stream description for diagnostics on failure."""
    parts = []
    for s in probe.get("streams", []):
        if s.get("codec_type") == "video":
            d = s.get("disposition", {})
            parts.append(
                f"v#{s.get('index')} {s.get('codec_name')}/{s.get('pix_fmt')} "
                f"{s.get('width')}x{s.get('height')} "
                f"attached_pic={d.get('attached_pic')} nb_frames={s.get('nb_frames')}"
            )
        elif s.get("codec_type") in ("audio", "data", "subtitle"):
            parts.append(f"{s.get('codec_type')}#{s.get('index')} {s.get('codec_name')}")
    return "; ".join(parts) or "no streams"


def _sample_frames(video_path: str, interval: float, max_frames: int,
                   stream_index=None, diag: str = "") -> list[tuple[float, bytes]]:
    """Decode the whole video once, emitting one frame every `interval` seconds.

    Returns (timestamp, jpeg_bytes) pairs. Robust to seek-unfriendly inputs
    because it never seeks — it filters frames out of a single decode pass.
    """
    out_dir = tempfile.mkdtemp(prefix="frames_")
    fps_val = 1.0 / interval
    pattern = os.path.join(out_dir, "f_%04d.jpg")
    try:
        try:
            args = {"vf": f"fps={fps_val:.6f},{SCALE_FILTER}", "q:v": "2", "an": None}
            if stream_index is not None:
                args["map"] = f"0:{stream_index}"
            (
                ffmpeg.input(video_path)
                .output(pattern, **args)
                .run(capture_stdout=True, capture_stderr=True)
            )
        except ffmpeg.Error as e:
            raise RuntimeError(
                f"ffmpeg frame sampling failed: {_stderr_tail(e)} [streams: {diag}]"
            )

        files = sorted(glob.glob(os.path.join(out_dir, "f_*.jpg")))[:max_frames]
        frames = []
        for i, fp in enumerate(files):
            with open(fp, "rb") as fh:
                frames.append((round(i * interval, 1), fh.read()))
        return frames
    finally:
        shutil.rmtree(out_dir, ignore_errors=True)


def extract_best_frames(video_bytes: bytes, ext: str, custom_prompt: str = None,
                        count: int = DEFAULT_COUNT) -> list[dict]:
    count = max(1, min(count or DEFAULT_COUNT, MAX_COUNT))
    with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    try:
        try:
            probe = ffmpeg.probe(tmp_path)
        except ffmpeg.Error as e:
            raise RuntimeError(f"ffprobe failed: {_stderr_tail(e)}")

        duration = float(probe["format"].get("duration") or 0)
        if not duration:
            duration = max(
                (float(s["duration"]) for s in probe["streams"] if s.get("duration")),
                default=0,
            )
        if not duration:
            raise RuntimeError("Could not determine video duration")

        # Sample up to 40 frames evenly across the full duration in a single
        # decode pass. Per-timestamp input seeking (-ss before -i) is fast but
        # fails on many phone videos (non-zero start PTS, sparse keyframes),
        # yielding "no packets received"; decoding once with the fps filter is
        # slower but reliable.
        max_frames = 40
        if duration <= max_frames:
            interval = 1.0
        else:
            interval = duration / max_frames
        diag = probe_summary(probe)
        raw_frames = _sample_frames(
            tmp_path, interval, max_frames,
            stream_index=pick_video_stream(probe), diag=diag,
        )
        if not raw_frames:
            raise RuntimeError(f"No frames could be decoded from the video [streams: {diag}]")

        # Ask Gemini to group scenes and score candidate frames
        contents = []
        for ts, frame_bytes in raw_frames:
            contents.append(types.Part.from_text(text=f"[Frame at {ts:.1f}s]"))
            contents.append(types.Part.from_bytes(data=frame_bytes, mime_type="image/jpeg"))
        final_prompt = frame_prompt(count)
        if custom_prompt:
            final_prompt = f"User's preference: {custom_prompt}\n\n{final_prompt}"
        contents.append(types.Part.from_text(text=final_prompt))

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=types.GenerateContentConfig(temperature=0.2),
        )

        raw = response.text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        result = json.loads(raw)

        # Build a lookup of ts → frame bytes
        frame_map = {round(ts, 1): frame_bytes for ts, frame_bytes in raw_frames}

        # Group candidates by scene, each scene's frames sorted best-first
        scenes_frames = []
        for scene_idx, scene in enumerate(result.get("scenes", []), start=1):
            frames = []
            for entry in scene.get("frames", []):
                scores = {
                    "sharpness": entry.get("sharpness"),
                    "face": entry.get("face"),
                    "composition": entry.get("composition"),
                }
                frames.append({
                    "timestamp": entry["timestamp"],
                    "reason": entry.get("reason", ""),
                    "score": entry.get("score"),
                    "scores": scores,
                    "label": _moment_label(scores, scene.get("label", "")),
                    "scene": {
                        "index": scene_idx,
                        "label": scene.get("label", ""),
                        "start": scene.get("start"),
                        "end": scene.get("end"),
                    },
                })
            frames.sort(key=lambda f: f["score"] or 0, reverse=True)
            if frames:
                scenes_frames.append(frames)

        # Scene-diverse, de-duplicated selection of the top `count`
        selected = _select_diverse(scenes_frames, count, frame_map)
        selected.sort(key=lambda c: c["score"] or 0, reverse=True)

        # Deterministic metrics (pure Pillow) + grounded evidence, computed over
        # the selected set so sharpness reads relative to this clip and
        # uniqueness relative to the other picks. Also attach image bytes and the
        # video-level fields (duration, frames analyzed).
        jbs, raws, hashes = [], [], []
        for entry in selected:
            closest_ts = min(frame_map.keys(), key=lambda x: abs(x - entry["timestamp"]))
            jb = frame_map[closest_ts]
            jbs.append(jb)
            raws.append(_cv_metrics(jb))
            hashes.append(_signature(jb)[0])

        sharps = [m["sharpness_raw"] for m in raws]
        smin, smax = (min(sharps), max(sharps)) if sharps else (0, 0)

        def _norm(v, lo, hi):
            return 100 if hi <= lo else round((v - lo) / (hi - lo) * 100)

        for i, entry in enumerate(selected):
            m = raws[i]
            exposure = round(m["exposure"])
            others = [h for j, h in enumerate(hashes) if j != i]
            uniq = min((bin(hashes[i] ^ o).count("1") for o in others), default=64)  # 0-64

            evidence = []
            if len(selected) > 1 and m["sharpness_raw"] == smax:
                evidence.append("Sharpest of the selected frames")
            if exposure < 60:
                evidence.append(f"Dark exposure (avg brightness {exposure}/255)")
            elif exposure > 200:
                evidence.append(f"Bright, near-blown exposure (avg {exposure}/255)")
            else:
                evidence.append(f"Well-balanced exposure (avg {exposure}/255)")
            if len(selected) > 1:
                if uniq >= 20:
                    evidence.append("Visually distinct from the other picks")
                elif uniq <= 8:
                    evidence.append("Similar framing to another pick")

            entry["image_b64"] = base64.b64encode(jbs[i]).decode()
            entry["duration"] = round(duration, 2)
            entry["analyzed"] = len(raw_frames)
            entry["metrics"] = {
                "sharpness": _norm(m["sharpness_raw"], smin, smax),  # 0-100 relative to clip
                "sharpnessRaw": round(m["sharpness_raw"]),
                "exposure": exposure,                                 # 0-255 mean luminance
                "uniqueness": round(uniq / 64 * 100),                 # 0-100 distinctness
            }
            entry["evidence"] = evidence

        return selected

    finally:
        os.unlink(tmp_path)
