import os
import glob
import shutil
import base64
import json
import tempfile
import ffmpeg
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

MAX_FRAMES_RETURNED = 18

FRAME_PROMPT = """You are a visual quality expert. You are given frames from a video, each labeled with its timestamp.

First, group the frames into scenes — contiguous stretches showing the same shot, setting, or action.
Then, for each scene, select the top 1-3 candidate frames that would work as a thumbnail, social post image, or hero photo.
Prioritize: sharp focus, good composition, faces clearly visible and expressive, good lighting, no motion blur, visually interesting moments.

Score every selected frame on these criteria, each 0-100:
- sharpness: focus quality and absence of motion blur
- face: how clearly visible, well-lit, and expressive faces are (null if no face in frame — do not penalize scenic shots)
- composition: framing, balance, lighting, visual interest
- score: overall quality as a standalone image, considering everything above

Return ONLY valid JSON with this structure:
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


def extract_best_frames(video_bytes: bytes, ext: str, custom_prompt: str = None) -> list[dict]:
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
        final_prompt = FRAME_PROMPT
        if custom_prompt:
            final_prompt = f"User's preference: {custom_prompt}\n\n{FRAME_PROMPT}"
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

        # Flatten scenes into a single candidate list carrying scene metadata
        candidates = []
        for scene_idx, scene in enumerate(result.get("scenes", []), start=1):
            for entry in scene.get("frames", []):
                candidates.append({
                    "timestamp": entry["timestamp"],
                    "reason": entry.get("reason", ""),
                    "score": entry.get("score"),
                    "scores": {
                        "sharpness": entry.get("sharpness"),
                        "face": entry.get("face"),
                        "composition": entry.get("composition"),
                    },
                    "scene": {
                        "index": scene_idx,
                        "label": scene.get("label", ""),
                        "start": scene.get("start"),
                        "end": scene.get("end"),
                    },
                })

        # Rank across the whole video, best first
        candidates.sort(key=lambda c: c["score"] or 0, reverse=True)
        candidates = candidates[:MAX_FRAMES_RETURNED]

        # Build a lookup of ts → frame bytes
        frame_map = {round(ts, 1): frame_bytes for ts, frame_bytes in raw_frames}

        # For each candidate, attach the actual image as base64
        for entry in candidates:
            closest_ts = min(frame_map.keys(), key=lambda x: abs(x - entry["timestamp"]))
            entry["image_b64"] = base64.b64encode(frame_map[closest_ts]).decode()

        return candidates

    finally:
        os.unlink(tmp_path)
