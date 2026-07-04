import os
import glob
import shutil
import tempfile
import base64
import json
import ffmpeg
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

SYSTEM_PROMPT = """You are a professional video editor assistant. Analyze the provided video frames and return a structured JSON analysis.

You must return ONLY valid JSON with this exact structure:
{
  "duration_estimate": <number in seconds>,
  "overall_pacing": "<slow|medium|fast>",
  "summary": "<one sentence describing the video content>",
  "segments": [
    {
      "start": <seconds>,
      "end": <seconds>,
      "caption": "<what is happening in this segment>",
      "pacing_note": "<optional note about pacing or energy>",
      "cut_recommended": <true|false>,
      "cut_reason": "<why a cut is recommended here, or null>"
    }
  ],
  "overall_notes": "<general editing recommendations>"
}

Divide the video into 4-8 logical segments based on content changes, scene shifts, or pacing changes.
Be specific and actionable in your captions and notes."""


async def analyze_video(video_bytes: bytes, ext: str, custom_prompt: str = None):
    with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    try:
        frames, timestamps, duration = extract_frames(tmp_path)
        yield {"type": "status", "message": f"Extracted {len(frames)} frames"}

        prompt = custom_prompt or "Analyze this video for editing opportunities."
        full_prompt = (
            f"{prompt}\n\n"
            f"The video is {duration:.1f} seconds long. "
            f"Each frame below is labeled with its exact timestamp. "
            f"Use these timestamps when setting 'start' and 'end' values in the JSON — "
            f"segments must span the full {duration:.1f}s duration.\n\n"
            f"Analyze the frames and return the JSON analysis."
        )

        contents = []
        for i, (frame_b64, ts) in enumerate(zip(frames, timestamps)):
            contents.append(types.Part.from_text(text=f"[Frame at {ts:.1f}s]"))
            contents.append(
                types.Part.from_bytes(
                    data=base64.b64decode(frame_b64),
                    mime_type="image/jpeg",
                )
            )

        contents.append(types.Part.from_text(text=full_prompt))

        yield {"type": "status", "message": "Sending to Gemini 2.5 Flash..."}

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.2,
            ),
        )

        raw = response.text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        analysis = json.loads(raw)
        # Override duration_estimate with the real measured duration
        analysis["duration_estimate"] = duration
        yield {"type": "result", "data": analysis}

    except json.JSONDecodeError as e:
        yield {"type": "error", "message": f"Failed to parse Gemini response: {str(e)}"}
    except Exception as e:
        yield {"type": "error", "message": str(e)}
    finally:
        os.unlink(tmp_path)


def _stderr_tail(e: ffmpeg.Error) -> str:
    if getattr(e, "stderr", None):
        lines = [l for l in e.stderr.decode(errors="replace").splitlines() if l.strip()]
        return " | ".join(lines[-3:])[-400:]
    return "no stderr captured"


def extract_frames(video_path: str, max_frames: int = 40):
    try:
        probe = ffmpeg.probe(video_path)
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

    interval = 1.0 if duration <= max_frames else duration / max_frames

    # Decode once and sample with the fps filter. Avoids per-timestamp input
    # seeking, which fails on many phone videos ("no packets received").
    scale = "scale='if(gt(iw,ih),min(640,iw),-2)':'if(gt(iw,ih),-2,min(640,ih))'"
    out_dir = tempfile.mkdtemp(prefix="analyze_")
    pattern = os.path.join(out_dir, "f_%04d.jpg")
    try:
        try:
            (
                ffmpeg.input(video_path)
                .output(pattern, vf=f"fps={1.0 / interval:.6f},{scale}", **{"q:v": "2"})
                .run(capture_stdout=True, capture_stderr=True, quiet=True)
            )
        except ffmpeg.Error as e:
            raise RuntimeError(f"ffmpeg frame sampling failed: {_stderr_tail(e)}")

        files = sorted(glob.glob(os.path.join(out_dir, "f_*.jpg")))[:max_frames]
        if not files:
            raise RuntimeError("No frames could be decoded from the video")

        frames, timestamps = [], []
        for i, fp in enumerate(files):
            with open(fp, "rb") as fh:
                frames.append(base64.b64encode(fh.read()).decode())
            timestamps.append(round(i * interval, 1))
    finally:
        shutil.rmtree(out_dir, ignore_errors=True)

    return frames, timestamps, duration
