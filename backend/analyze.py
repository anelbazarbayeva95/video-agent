import os
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
        frames = extract_frames(tmp_path)
        yield {"type": "status", "message": f"Extracted {len(frames)} frames"}

        prompt = custom_prompt or "Analyze this video for editing opportunities."
        full_prompt = f"{prompt}\n\nAnalyze the frames and return the JSON analysis."

        contents = []
        for i, frame_b64 in enumerate(frames):
            contents.append(
                types.Part.from_bytes(
                    data=base64.b64decode(frame_b64),
                    mime_type="image/jpeg",
                )
            )

        contents.append(types.Part.from_text(text=full_prompt))

        yield {"type": "status", "message": "Sending to Gemini 2.0 Flash..."}

        response = client.models.generate_content(
            model="gemini-2.0-flash",
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
        yield {"type": "result", "data": analysis}

    except json.JSONDecodeError as e:
        yield {"type": "error", "message": f"Failed to parse Gemini response: {str(e)}"}
    except Exception as e:
        yield {"type": "error", "message": str(e)}
    finally:
        os.unlink(tmp_path)


def extract_frames(video_path: str, fps: float = 1.0) -> list[str]:
    probe = ffmpeg.probe(video_path)
    duration = float(probe["format"]["duration"])

    frames = []
    timestamps = [i / fps for i in range(int(duration * fps))]
    timestamps = timestamps[:30]

    for ts in timestamps:
        out, _ = (
            ffmpeg.input(video_path, ss=ts)
            .output("pipe:", vframes=1, format="image2", vcodec="mjpeg", s="640x360")
            .run(capture_stdout=True, capture_stderr=True, quiet=True)
        )
        frames.append(base64.b64encode(out).decode())

    return frames
