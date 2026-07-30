# Deploying the Kadr backend to Azure App Service (Web App for Containers)

This hosts the FastAPI + ffmpeg backend on **Azure App Service, B1 tier**, paid
from the **Azure for Students** $100 credit. Unlike the free Render tier, B1 is
**always-on (no cold start)** and has **~1.75 GB RAM**, so large uploads no
longer OOM.

The frontend stays on Vercel; only the backend moves. You point the frontend at
the new URL with one env var — no code change.

Cost: B1 ≈ **$13/month**, so the $100 credit lasts ~7 months.

---

## One-time setup (Azure portal)

1. **Create the Web App**
   - Portal → **Create a resource → Web App**.
   - Publish: **Container**. Operating System: **Linux**.
   - Name: **`kadr-api`** (this becomes `kadr-api.azurewebsites.net`; if taken,
     pick another name and update `WEBAPP_NAME` in
     `.github/workflows/deploy-azure.yml`).
   - Region: closest to you. Plan: create a new App Service Plan, size **B1**.
   - For the image source you can pick any placeholder for now (e.g. the quickstart
     image) — the GitHub Actions workflow overwrites it on first deploy.

2. **App settings** (Web App → **Settings → Environment variables / Configuration**)
   - `GEMINI_API_KEY` = your key (same value used on Render).
   - `WEBSITES_PORT` = `7860` (the port the container listens on; see the
     Dockerfile's `ENV PORT=7860`).
   - Save (the app restarts).

3. **Get the publish profile**
   - Web App → **Overview → Download publish profile**.
   - In GitHub: repo → **Settings → Secrets and variables → Actions → New
     repository secret**:
     - Name: `AZURE_WEBAPP_PUBLISH_PROFILE`
     - Value: paste the entire downloaded file's contents.

4. **Make the GHCR image pullable by Azure** (do this once, after the first
   workflow run pushes the image)
   - The workflow pushes to `ghcr.io/<owner>/kadr-api`. GHCR packages start
     **private**, and App Service pulls anonymously, so set the package to public:
     GitHub → your profile → **Packages → kadr-api → Package settings → Change
     visibility → Public**.
   - (Alternative if you want it private: add `DOCKER_REGISTRY_SERVER_URL`,
     `..._USERNAME`, `..._PASSWORD` app settings pointing at GHCR with a PAT that
     has `read:packages`.)

## Deploy

- Push to `main` under `backend/**`, or run the **"Deploy backend to Azure"**
  workflow manually from the **Actions** tab.
- The workflow builds `backend/Dockerfile`, pushes to GHCR, and tells the Web App
  to pull the new image tag.
- Verify: open `https://<your-app>.azurewebsites.net/health` → `{"status":"ok"}`.

## Point the frontend at Azure

- Vercel → project → **Settings → Environment Variables** → set
  `VITE_API_URL = https://<your-app>.azurewebsites.net` → redeploy the frontend.
- CORS already allows `*.vercel.app` (see `main.py`), so no backend change is
  needed. The code's built-in fallback still points at Render, so `VITE_API_URL`
  is what actually moves traffic to Azure.

## Notes / troubleshooting

- **Port mismatch** is the most common failure: if `/health` never comes up,
  confirm `WEBSITES_PORT=7860` is set and the container logs (Web App → **Log
  stream**) show `Uvicorn running on ... :7860`.
- **B1 has no free auto-sleep** — it runs 24/7, which is the point (no cold
  start), but it also spends credit 24/7. To pause spend, **Stop** the Web App
  from the portal when you're not showcasing; **Start** it before you share the
  link.
- This does **not** replace Render automatically. You can keep Render as a free
  fallback or delete the service once Azure is verified.
- Unlike Render, this deploy is **automatic** on push to `main` (backend paths).
