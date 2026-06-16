import os
import base64
import json
import tempfile
import ffmpeg
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

FRAME_PROMPT = """You are a visual quality expert. You are given frames from a video, each labeled with its timestamp.

Select the 6–10 best frames that would work as a thumbnail, social post image, or hero photo.
Prioritize: sharp focus, good composition, faces clearly visible and expressive, good lighting, no motion blur, visually interesting moments.

Return ONLY valid JSON with this structure:
{
  "best_frames": [
    {
      "timestamp": <number — must match one of the labeled frame timestamps exactly>,
      "reason": "<one short sentence: why this frame stands out>"
    }
  ]
}

Return between 6 and 10 entries. Order them from best to least good."""


def extract_best_frames(video_bytes: bytes, ext: str, custom_prompt: str = None) -> list[dict]:
    with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    try:
        probe = ffmpeg.probe(tmp_path)
        duration = float(probe["format"]["duration"])

        # Sample up to 40 frames evenly across full duration
        max_frames = 40
        if duration <= max_frames:
            timestamps = [float(i) for i in range(int(duration))]
        else:
            step = duration / max_frames
            timestamps = [step * i for i in range(max_frames)]

        # Extract frames
        raw_frames = []
        for ts in timestamps:
            out, _ = (
                ffmpeg.input(tmp_path, ss=ts)
                .output("pipe:", vframes=1, format="image2", vcodec="mjpeg", **{"q:v": "1"})
                .run(capture_stdout=True, capture_stderr=True, quiet=True)
            )
            raw_frames.append((ts, out))

        # Ask Gemini which frames are best
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
        best = result.get("best_frames", [])

        # Build a lookup of ts → frame bytes
        frame_map = {round(ts, 1): frame_bytes for ts, frame_bytes in raw_frames}

        # For each best frame, attach the actual image as base64
        output = []
        for entry in best:
            ts = entry["timestamp"]
            # Find the closest extracted frame
            closest_ts = min(frame_map.keys(), key=lambda x: abs(x - ts))
            frame_bytes = frame_map[closest_ts]
            output.append({
                "timestamp": ts,
                "reason": entry.get("reason", ""),
                "image_b64": base64.b64encode(frame_bytes).decode(),
            })

        return output

    finally:
        os.unlink(tmp_path)
