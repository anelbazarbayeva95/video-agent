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
            out, err = (
                ffmpeg.input(tmp_path, ss=ts)
                .output("pipe:", vframes=1, format="image2", vcodec="mjpeg", **{"q:v": "1"})
                .run(capture_stdout=True, capture_stderr=True)
            )
            if not out:
                raise RuntimeError(f"ffmpeg produced no output at {ts}s: {err.decode()}")
            raw_frames.append((ts, out))

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
