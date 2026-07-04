# Kadr

AI image toolkit for video — upload a clip and Kadr pulls out its best frames: every frame ranked for sharpness, expression, and composition, ready to download as images or turn into stickers.

Built with Gemini, FastAPI, and React.

## What it does

1. Upload any video (mp4, mov, avi, webm, mkv)
2. AI groups the video into scenes and ranks every frame for sharpness, faces, and composition
3. Browse the best frames in a grid, preview full-size, and download your picks as JPEGs
4. Turn any frame into a die-cut sticker — cartoon, 3D, pixel art, or oil paint — exported as transparent PNG or WebP

## Stack

- **Frontend** — React 18 + TypeScript + Vite
- **Backend** — FastAPI (Python)
- **AI** — Gemini (multimodal frame scoring + image generation)
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

`POST /reframe` — accepts an image file + `aspect` (`16:9` thumbnail, `9:16` story, `1:1` square). Gemini detects the subject's bounding box and the image is cropped to that aspect keeping the subject centered (no upscaling or generative expansion). Returns a JPEG.

`POST /sticker` — accepts an image file + `style` + `format` (`png`, `webp`). Styles: `cutout` (faithful Apple-style subject lift, keeps real pixels — best for people/pets/products), `photo` (whole-frame rounded-corner photo sticker, no model call — best for scenes/landscapes), and `cartoon`, `3d`, `pixel`, `oil` (generative redraws). All get a white die-cut outline and are tight-cropped; generative and cutout outputs are chroma-keyed from a magenta background to real transparency. Returns the sticker image.
