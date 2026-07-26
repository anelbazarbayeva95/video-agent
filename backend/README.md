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
ffmpeg. This folder is self-contained and deploys as a Docker image, so it runs
on any Docker host.

## Deploy on Render (free, no credit card) — recommended

The repo ships a `render.yaml` blueprint that builds this `Dockerfile`.

1. In Render → **New → Blueprint**, connect this GitHub repo. Render reads
   `render.yaml` and creates a free Docker web service (`kadr-api`).
   (Or **New → Web Service**, pick the repo, set **Root Directory** to
   `backend` and Runtime to **Docker**.)
2. In the service's **Environment**, add `GEMINI_API_KEY` (from aistudio.google.com).
3. Deploy. The public URL is `https://kadr-api.onrender.com` (or similar).

Health check: `GET /health`. Note the free tier is 512 MB RAM and cold-starts
after ~15 min idle — the frontend health-checks before uploading and offers a
Retry, so cold starts are handled gracefully.

## Alternatives

- **Koyeb** (free, no card): New service → Docker → this repo, Dockerfile path
  `backend/Dockerfile`, add the `GEMINI_API_KEY` env var.
- **Hugging Face Spaces**: the front-matter above configures a **Docker** Space,
  but Docker Spaces now require a paid HF plan; the free Static/Gradio SDKs don't
  fit a FastAPI service. Use only if you have a paid Space. If so: push this
  `backend/` folder to the Space repo (README + Dockerfile at root), add
  `GEMINI_API_KEY` as a secret; it serves on port 7860 at
  `https://<user>-<space>.hf.space`.

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
