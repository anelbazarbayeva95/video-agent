# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Kadr** — a "Best Frame Intelligence" tool. Upload a video; the backend samples frames, Gemini ranks the strongest moments and explains why, and the frontend presents the ranked frames with an inline analysis panel. The single-purpose **best-frames flow is the product**; the older "asset pack" generators (stickers, thumbnail, story, expand/resize) still exist in code but are hidden from the primary UI behind feature flags.

## Commands

System dependency: **ffmpeg** must be on PATH (frame extraction shells out to `ffmpeg`/`ffprobe`).

Backend (`backend/`, FastAPI, Python 3.11/3.12):
```bash
cd backend && python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then set GEMINI_API_KEY
uvicorn main:app --reload --port 8000
python -m py_compile frames.py   # quick syntax check (no test runner configured)
python test_expand.py            # offline geometry test for expand.py (Gemini call mocked)
```

Frontend (`frontend/`, React + TS + Vite + Tailwind):
```bash
cd frontend && npm install
npm run dev        # http://localhost:5173
npm run build      # tsc -b && vite build  (this is the typecheck+build gate)
npm run lint       # eslint .
```

Both together: `./start.sh` (expects `backend/.venv` + `backend/.env`). Frontend talks to the backend via `VITE_API_URL` (see below).

## Architecture

**Backend** — `main.py` exposes `/health`, `/best-frames` (primary), and the dormant `/asset-pack` (streaming), `/sticker`, `/reframe`, `/expand`. The core is `frames.py::extract_best_frames`:
1. `ffmpeg` decodes the whole video once and samples up to `max_frames` (16) evenly, scaled to ≤1280px (single decode pass — per-timestamp seeking is deliberately avoided because it fails on many phone videos).
2. Each sampled frame is downscaled to a ~512px thumbnail (`_thumb`) and sent to `gemini-2.5-flash`, which groups scenes and scores frames in one call.
3. `_select_diverse` picks the top `count` across scenes (round-robin + aHash near-duplicate dedup).
4. Deterministic, pixel-computed metrics are attached (`_cv_metrics`: variance-of-Laplacian sharpness + mean-luminance exposure, **pure Pillow, no numpy/opencv**), plus aHash `uniqueness`, grounded `evidence[]` bullets, and `duration`/`analyzed`. Full-resolution frames are returned as base64.

`sticker.py` / `reframe.py` / `expand.py` / `asset_pack.py` are the older generative features — preserved, not part of the primary flow.

**Frontend** — `NoirLanding.tsx` (marketing) → `AssetPackApp.tsx` (the app; the name is legacy — it is now the frames-only "Best frame analysis" screen). `AssetPackApp` is a **two-pane inspector**: left = `<video>` + `SelectionTimeline` + `FrameAnalysis`; right = `RankedFrames` grid. A single `selected` index plus `videoRef` bind everything — clicking a card or a timeline marker seeks the video and updates the analysis panel. It calls `getBestFrames` (in `api.ts`) after `waitForServer()` (a graceful cold-start wait that shows "Starting the server…"). `AssetPackGrid.tsx` and `ProcessingTimeline.tsx` are the dormant asset-pack UI.

`api.ts` holds the single backend base URL (`VITE_API_URL` env override, falling back to the Render host) and the `BestFrame` type. `features.ts` has the flags: `ASSET_GENERATION` (false — hides stickers/thumbnail/story + the ZIP export) and `FRAME_EDITOR` (Expand/Resize in the lightbox; `AssetLightbox.tsx` also gates Expand behind `EXPAND_ENABLED`).

## Non-obvious gotchas

- **Tailwind preflight is disabled** (`tailwind.config.js` → `corePlugins.preflight: false`). So the browser's default styles are NOT reset: native `<button>` elements render a stray border unless you add `border-0`/inline `border:none`, and `border-*` width utilities only draw if a border style is present. Watch for this when adding controls.
- **The theme is light**, driven by semantic tokens, not raw colors: `ink` = white canvas (and text-on-accent), `ash` = light card, `bone` = dark body text/borders, `ember` = near-black CTA accent, `electric` (#2E6BFF) = the single signature color, reserved for ranking (logo, `#1` badge, metric bars, selected states). Prefer these tokens over hardcoded `white`/`black`.
- **Measured-vs-AI honesty is a hard design rule.** Only deterministically-computed values (the Pillow `metrics`) may be shown as numbers under "Measured metrics." Gemini's outputs — the `reason` and the `scores` (sharpness/face/composition) — are subjective judgments; label them "AI interpretation" and never render them as precise numeric scores. The overall score is surfaced as a **rank** (`#1`/`#2`), never a raw 0–100.

## Deploy (current setup)

- **Frontend → Vercel** (production = `main`). Set `VITE_API_URL` to the backend URL in Vercel env; the code also falls back to the live Render host.
- **Backend → Render** (Docker via `backend/Dockerfile`, `render.yaml` blueprint, free tier). `autoDeploy: false` — **deploy backend changes with Render's "Manual Deploy"** (frontend pushes must not redeploy the backend). CORS in `main.py` allows `*.vercel.app`.
- Free Render sleeps when idle; an UptimeRobot monitor pinging `/health` keeps it warm (`.github/workflows/keep-alive.yml` is a backup pinger). `GEMINI_API_KEY` is set as a Render env var, never committed.
