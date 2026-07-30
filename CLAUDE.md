# CLAUDE.md — Kadr

Guidance for AI agents (and humans) working in this repo. Read this first.

## What Kadr is

**Kadr = "Best Frame Intelligence."** Upload a video → the backend samples
frames evenly across the clip → Gemini groups them into scenes, ranks the
strongest candidate frames, and explains *why* each stands out → the frontend
shows the ranked frames plus an inline analysis panel with **deterministic,
pure-Pillow metrics** (sharpness, exposure, uniqueness).

The product is **frames-only** today. The older asset-pack generators
(stickers, thumbnail, story, ZIP pack) still exist in the code and backend
routes but are hidden behind flags in `frontend/src/features.ts`
(`ASSET_GENERATION = false`). The per-frame Expand/Resize editor stays on
(`FRAME_EDITOR = true`).

## Architecture

- **Backend** — FastAPI (`backend/main.py`), Python 3.11, served by uvicorn.
  - `frames.py` — the core pipeline: ffmpeg samples frames → Gemini
    (`gemini-2.5-flash`) scores them → scene-diverse, de-duplicated selection →
    deterministic Pillow metrics. Entry point: `extract_best_frames()`.
  - `expand.py` — generative outpaint (stepwise). `reframe.py` — smart crop.
    `sticker.py`, `asset_pack.py` — legacy asset generation.
  - Route of record: `POST /best-frames` (multipart: `file`, optional `prompt`,
    `count`). `GET /health` is the keep-alive/readiness probe.
- **Frontend** — React 19 + Vite + TypeScript in `frontend/`. Backend base URL
  comes from `VITE_API_URL`, falling back to `https://kadr-api.onrender.com`
  (`src/api.ts`).

## Deployment

- **Frontend:** Vercel. Production = `main` branch → `video-agent-7rzs.vercel.app`.
  Auto-deploys on push to `main`.
- **Backend:** Render **free** Docker service `kadr-api.onrender.com`, defined by
  `render.yaml` (builds `backend/Dockerfile`). **`autoDeploy: false`** — backend
  changes do NOT deploy on push.
  - **Backend deploys are MANUAL:** after pushing backend changes, a human must
    click **Render → kadr-api → Manual Deploy → Deploy latest commit.**
  - `GEMINI_API_KEY` is set in the Render dashboard (`sync: false`), never in the
    repo.
  - The free instance spins down when idle and **cold-starts in ~50s.** An
    UptimeRobot ping to `/health` keeps it warm; the frontend also polls
    `/health` (`waitForServer`, "waking up" message) before uploading.

## Hard constraints

- **Free tier only.** No paid hosting.
- **Never show invented numbers ("measured vs AI" rule).** The metrics panel may
  only display values that were actually *measured* from pixels
  (`_cv_metrics` in `frames.py`) or *returned by Gemini*. Do not fabricate,
  interpolate, or hardcode plausible-looking scores anywhere in the UI.
- **The dev sandbox cannot reach the live app** (egress blocked) and has **no
  `GEMINI_API_KEY`**, so agents cannot test the deployed app end-to-end. Only the
  human can (Render Manual Deploy → upload a clip → share screenshots / Render
  logs). Agents CAN test backend logic locally by installing ffmpeg and
  **mocking the Gemini call** — see `test_frames.py` and `test_expand.py`.

## Commands

Backend (from `backend/`):
```bash
pip install -r requirements.txt          # deps (needs ffmpeg on PATH)
uvicorn main:app --reload                 # local dev server
python test_expand.py                     # offline outpaint geometry tests (mocked Gemini)
python test_frames.py                     # offline frame-pipeline test (mocked Gemini)
```

Frontend (from `frontend/`):
```bash
npm install
npm run dev        # Vite dev server (localhost:5173)
npm run build      # tsc -b && vite build
npm run lint
```

## The frame pipeline, in detail (`frames.py`)

- Sampling: one ffmpeg decode pass with an `fps` filter (NOT per-timestamp
  `-ss` seeking, which fails on phone videos with sparse keyframes / non-zero
  start PTS → "no packets received"). `pick_video_stream` skips attached cover
  art so ffmpeg doesn't map a packet-less thumbnail stream.
- **Lightweight/free-tier settings:** `SAMPLE_FRAMES = 16` frames are sampled,
  and each is downscaled to `GEMINI_THUMB = 512` px on its long side
  (`_gemini_thumb`) *before* upload to keep the request small. Full-resolution
  frame bytes are still used for display (`image_b64`) and metrics.
- Selection: Gemini returns scenes+frames; `_select_diverse` round-robins across
  scenes and drops near-duplicates (`_signature` aHash + mean-color,
  `_is_duplicate`).
- Metrics (`_cv_metrics`, pure Pillow): `sharpness` = variance of the Laplacian,
  min-max normalized across the returned set; `exposure` = mean luminance
  (0–255); `uniqueness` from aHash distance. `evidence[]` strings are grounded in
  these measured values.

## Gotchas

- Changing the frame pipeline is a **backend change** → requires a Render Manual
  Deploy to take effect; a green Vercel deploy does NOT include it.
- Sharpness is min-max normalized, so the least-sharp frame in a set can render
  as 0 (looks broken). Floor it or use a gentler scale so no good frame shows 0.
- CORS allows `localhost:5173/3000` and any `*.vercel.app` origin (`main.py`).
- When editing `frames.py`, run `python test_frames.py` (mocks Gemini) before
  pushing — it's the only pre-deploy signal available in the sandbox.

## Working agreement

- Work on a feature branch; open a PR to `main` (do not push directly to `main`).
- After merging backend changes, remind the human to **Manual Deploy** in Render.
</content>
