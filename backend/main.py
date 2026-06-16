from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel
import os
import json
import tempfile
from dotenv import load_dotenv

from analyze import analyze_video
from trim import trim_video
from frames import extract_best_frames

load_dotenv()

app = FastAPI(title="Video Analysis Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "https://*.vercel.app"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze")
async def analyze(file: UploadFile = File(...), prompt: str = Form(None)):
    if not file.filename:
        raise HTTPException(400, "No filename")

    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ("mp4", "mov", "avi", "webm", "mkv"):
        raise HTTPException(400, "Supported formats: mp4, mov, avi, webm, mkv")

    contents = await file.read()

    async def stream():
        async for chunk in analyze_video(contents, ext, prompt):
            yield f"data: {json.dumps(chunk)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


@app.post("/trim")
async def trim(
    file: UploadFile = File(...),
    segments_to_remove: str = Form(...),
):
    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ("mp4", "mov", "avi", "webm", "mkv"):
        raise HTTPException(400, "Unsupported format")

    contents = await file.read()
    segments = json.loads(segments_to_remove)

    output_path = trim_video(contents, ext, segments)

    return FileResponse(
        output_path,
        media_type="video/mp4",
        filename="trimmed.mp4",
        background=None,
    )


@app.post("/best-frames")
async def best_frames(file: UploadFile = File(...), prompt: str = Form(None)):
    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ("mp4", "mov", "avi", "webm", "mkv"):
        raise HTTPException(400, "Unsupported format")

    contents = await file.read()
    try:
        frames = extract_best_frames(contents, ext, prompt)
        return {"frames": frames}
    except Exception as e:
        raise HTTPException(500, str(e))
