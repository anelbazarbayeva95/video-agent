# Kadr

AI image toolkit for video — upload a clip and Kadr pulls out its best frames: every frame ranked for sharpness, expression, and composition, ready to download as images. Editing tools (cut suggestions, trims, captions) are built in for when you need them.

Built with Gemini, FastAPI, and React.

## What it does

1. Upload any video (mp4, mov, avi, webm, mkv)
2. AI ranks every frame for sharpness, expression, and composition
3. Browse the best frames in a grid, preview full-size, and download your picks as JPEGs
4. Turn any frame into a die-cut sticker — cartoon, 3D, pixel art, or oil paint — exported as transparent PNG or WebP
5. Optionally run scene analysis: an interactive timeline with segment markers, cut recommendations, and pacing notes
6. Export a trimmed MP4 or .srt captions from the same panel
7. Save prompt configs and re-run on new clips in one click

## Stack

- **Frontend** — React 18 + TypeScript + Vite
- **Backend** — FastAPI (Python), streaming SSE responses
- **AI** — Gemini (multimodal, frame-by-frame analysis)
- **Video processing** — ffmpeg-python (frame extraction)

## Setup

**Requirements:** Python 3.12, Node 18+, ffmpeg

```bash
# 1. Clone
git clone <repo-url>
cd video-agent

# 2. Backend
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Add your GEMINI_API_KEY to .env (get one at aistudio.google.com)

# 3. Frontend
cd ../frontend
npm install

# 4. Run
cd ..
./start.sh
```

Open `http://localhost:5173`

## API

`POST /best-frames` — accepts a video file + optional prompt. AI groups the video into scenes, picks the top candidate frames per scene, and returns them ranked as base64 JPEGs with metadata: timestamp, overall score, sub-scores (sharpness, face, composition), and scene info.

`POST /analyze` — accepts a video file + optional prompt, streams back SSE events:

```
data: {"type": "status", "message": "Extracted 12 frames"}
data: {"type": "status", "message": "Sending to Gemini..."}
data: {"type": "result", "data": { ...analysis }}
data: [DONE]
```

`POST /sticker` — accepts an image file + `style` (`original`, `cartoon`, `3d`, `pixel`, `oil`) + `format` (`png`, `webp`). The Gemini image model renders the subject as a die-cut sticker on a solid background, which is then chroma-keyed to real transparency. Returns the sticker image.

`POST /trim` — accepts a video file + segments to remove, returns a trimmed MP4.
