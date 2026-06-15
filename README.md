# Video Agent

Multimodal video analysis agent — upload a clip, get AI-generated cut suggestions, captions, and pacing notes on an interactive timeline.

Built with Gemini 2.0 Flash, FastAPI, and React.

## What it does

1. Upload any video (mp4, mov, avi, webm, mkv)
2. Gemini 2.0 Flash analyzes the frames
3. Results appear as an interactive timeline with segment markers and cut points
4. Click any segment to seek to that moment in the video
5. Save prompt configs and re-run on new clips in one click

## Stack

- **Frontend** — React 18 + TypeScript + Vite
- **Backend** — FastAPI (Python), streaming SSE responses
- **AI** — Gemini 2.0 Flash (multimodal, frame-by-frame analysis)
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

`POST /analyze` — accepts a video file + optional prompt, streams back SSE events:

```
data: {"type": "status", "message": "Extracted 12 frames"}
data: {"type": "status", "message": "Sending to Gemini 2.0 Flash..."}
data: {"type": "result", "data": { ...analysis }}
data: [DONE]
```
