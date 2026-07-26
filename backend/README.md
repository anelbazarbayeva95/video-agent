---
title: Kadr API
emoji: 🎬
colorFrom: gray
colorTo: orange
sdk: docker
app_port: 7860
pinned: false
---

# Kadr API

FastAPI backend for **Kadr** — best-frame extraction, stickers, reframing,
expand/outpaint, and the streaming asset-pack pipeline. Powered by Gemini and
ffmpeg. This folder is self-contained and deploys as a Docker image.

## Deploy on Hugging Face Spaces (free, no credit card)

1. Create a new Space → **SDK: Docker** → **Blank**.
2. Push the contents of this `backend/` folder to the Space repo so that this
   `README.md` and the `Dockerfile` sit at the **repo root** (HF reads the
   front-matter above to configure the Space, and builds the Dockerfile).

   ```bash
   # from a clone of the Space repo
   git clone https://huggingface.co/spaces/<user>/<space> kadr-space
   cp -r /path/to/video-agent/backend/. kadr-space/
   cd kadr-space && git add . && git commit -m "Kadr API" && git push
   ```
3. In the Space's **Settings → Variables and secrets**, add a **secret** named
   `GEMINI_API_KEY` (get one at aistudio.google.com).
4. The Space builds and serves on port 7860. Its public URL is
   `https://<user>-<space>.hf.space`.

Note: free Spaces sleep after inactivity and cold-start on the next request —
the frontend health-checks before uploading and offers a Retry, so this is
handled gracefully.

## Point the frontend at it

The frontend reads its backend URL from `VITE_API_URL` (see `frontend/src/api.ts`).
In the Vercel project settings add an environment variable:

```
VITE_API_URL = https://<user>-<space>.hf.space
```

then redeploy. No code change needed to switch backends.

## Run locally

```bash
docker build -t kadr-api .
docker run -p 7860:7860 -e GEMINI_API_KEY=your_key kadr-api
# or, without Docker:
pip install -r requirements.txt && uvicorn main:app --reload
```
