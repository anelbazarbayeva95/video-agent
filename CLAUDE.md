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
python test_expand.py            # offline geometry test for expand.py (Gemini mocked)
python test_frames.py            # offline frame-pipeline test (synthetic ffmpeg clip + Gemini mocked)
```
Both `test_*.py` are plain scripts (no pytest) that mock the Gemini call and **run without a `GEMINI_API_KEY`** — they are the only pre-deploy signal available in a sandbox that can't reach the live app. Run `test_frames.py` after any change to `frames.py`.

Frontend (`frontend/`, React + TS + Vite + Tailwind):
```bash
cd frontend && npm install
npm run dev        # http://localhost:5173
npm run build      # tsc -b && vite build  (this is the typecheck+build gate — must pass)
npm run lint       # eslint . (baseline currently has ~6 pre-existing errors; don't add new ones)
```

Both together: `./start.sh` (expects `backend/.venv` + `backend/.env`). Frontend talks to the backend via `VITE_API_URL` (see below).

## Architecture

**Backend** — `main.py` exposes `/health`, `/best-frames` (primary), and the dormant `/asset-pack` (streaming), `/sticker`, `/reframe`, `/expand`. The core is `frames.py::extract_best_frames`:
1. `ffmpeg` decodes the whole video once and samples up to `SAMPLE_FRAMES` (16) evenly, scaled to ≤1280px (single decode pass — per-timestamp seeking is deliberately avoided because it fails on many phone videos: non-zero start PTS, sparse keyframes → "no packets received"). `pick_video_stream` skips attached cover-art streams.
2. Each sampled frame is downscaled to a ~512px thumbnail (`_thumb`) and sent to `gemini-2.5-flash`, which groups scenes and scores frames in one call. Full-resolution frame bytes are kept separately for display + metrics.
3. `_select_diverse` picks the top `count` across scenes (round-robin + aHash near-duplicate dedup).
4. Deterministic, pixel-computed metrics are attached (`_cv_metrics`: variance-of-Laplacian sharpness + mean-luminance exposure, **pure Pillow, no numpy/opencv**), plus aHash `uniqueness`, grounded `evidence[]` bullets, and `duration`/`analyzed`. Full-resolution frames are returned as base64. Sharpness is min-max normalized across the returned set but **floored at `SHARPNESS_FLOOR` (15)** so the least-sharp good frame never renders as a bare 0.

`sticker.py` / `reframe.py` / `expand.py` / `asset_pack.py` are the older generative features — preserved, not part of the primary flow.

**Gemini client is lazy.** Every module that talks to Gemini (`frames`, `expand`, `sticker`, `reframe`) builds its client via a `get_client()` accessor, **not** at import time. This is load-bearing: `genai.Client(api_key=...)` raises `ValueError` when the key is missing, and `main.py` imports all four modules at startup — so an eager client would crash the whole app on boot (taking `/health` down with a persistent 503) whenever `GEMINI_API_KEY` is absent. Keep new Gemini usage behind `get_client()`; never construct a client at module scope.

**Frontend** — `NoirLanding.tsx` (marketing) → `AssetPackApp.tsx` (the app; the name is legacy — it is now the frames-only "Best frame analysis" screen). `AssetPackApp` is a **two-pane inspector**: left = `<video>` + `SelectionTimeline` + `FrameAnalysis`; right = `RankedFrames` grid. A single `selected` index plus `videoRef` bind everything — clicking a card or a timeline marker seeks the video and updates the analysis panel. It calls `getBestFrames` (in `api.ts`) after `waitForServer()` (a graceful cold-start wait that shows "Starting the Kadr server…"). `AssetPackGrid.tsx` and `ProcessingTimeline.tsx` are the dormant asset-pack UI.

`api.ts` holds the single backend base URL (`VITE_API_URL` env override, falling back to the Render host), the `BestFrame` type, and `frameSrc()`. `features.ts` has the flags: `ASSET_GENERATION` (false — hides stickers/thumbnail/story + the ZIP export) and `FRAME_EDITOR` (Expand/Resize in the lightbox; `AssetLightbox.tsx` also gates Expand behind `EXPAND_ENABLED`).

**A frame's image source is resolved through `frameSrc(f)`**, not `f.image_b64` directly: live results carry `image_b64` (base64 from the backend), while the sample demo carries `imageUrl` (a static asset URL). Any new place that renders a frame must use `frameSrc` so both paths work.

**Instant sample demo** — the "Try a sample clip" button (`AssetPackApp.loadSample`) renders a pre-analyzed reel from `sampleData.ts` (`SAMPLE_FRAMES`) with **no backend call**, so the portfolio link always shows an impressive result even when the free backend is cold. Its `imageUrl`s point at `public/screenshots/v02-*.jpg`. Sample mode has no video, so the selected frame is shown as the left-hand hero. The sample's `metrics` are **genuinely measured** (computed offline with the backend's own Pillow algorithm on those exact images) — see the honesty rule below; regenerate them if the images change, don't hand-write numbers.

## Non-obvious gotchas

- **Tailwind preflight is disabled** (`tailwind.config.js` → `corePlugins.preflight: false`). Browser default styles are NOT reset: native `<button>` elements render a stray border unless you add `border-0`/inline `border:none`, and `border-*` width utilities only draw if a border style is present.
- **The theme is light**, driven by semantic tokens, not raw colors: `ink` = white canvas (and text-on-accent), `ash` = light card, `bone` = dark body text/borders, `ember` = near-black CTA accent, `electric` (#2E6BFF) = the single signature color, reserved for ranking (logo, `#1` badge, metric bars, selected states). Prefer these tokens over hardcoded `white`/`black`.
- **Measured-vs-AI honesty is a hard design rule.** Only deterministically-computed values (the Pillow `metrics`) may be shown as numbers under "Measured metrics." Gemini's outputs — the `reason` and the `scores` (sharpness/face/composition) — are subjective judgments; label them "AI interpretation" and never render them as precise numeric scores. The overall score is surfaced as a **rank** (`#1`/`#2`), never a raw 0–100. This applies to the sample demo too: its measured metrics are real measurements of the sample images, never invented.

## Deploy (current setup)

- **Frontend → Vercel** (production = `main`). Auto-deploys on push to `main`. Set `VITE_API_URL` to the backend URL in Vercel env; the code also falls back to the live Render host.
- **Backend → Render** (Docker via `backend/Dockerfile`, `render.yaml` blueprint, **free** tier, service `kadr-api` → `kadr-api.onrender.com`). CORS in `main.py` allows `*.vercel.app`.
  - **Auto-Deploy is Off — backend changes deploy manually:** Render → kadr-api → **Manual Deploy → Deploy latest commit**. A frontend merge to `main` does NOT ship backend changes.
  - **Render must build the `main` branch.** The service's Build → Branch was once left pointing at a feature branch, so merges to `main` silently never deployed. If a backend fix seems not to take effect, check Build → Branch first.
  - `GEMINI_API_KEY` is a Render env var (`sync: false` in `render.yaml`), never committed. With the lazy client, a missing key keeps `/health` green but analysis fails — so confirm it's set after touching the service.
- **Free-tier limits matter.** The instance is **0.1 CPU / 512 MB** and spins down when idle (~50s cold start). Its health check times out at 5s. Large uploads (e.g. 4K/UHD clips) can OOM or CPU-starve the instance mid-analysis and drop the connection ("Can't reach the Kadr server"); prefer 1080p, short clips for the live demo. An UptimeRobot ping to `/health` keeps it warm (`.github/workflows/keep-alive.yml` is a backup pinger).

## Working agreement

- Develop on a feature branch and open a PR to `main` (don't push to `main` directly).
- After a backend change is merged, remind the human to **Manual Deploy** in Render.
