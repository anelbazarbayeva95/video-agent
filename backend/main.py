from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import os
import json
from dotenv import load_dotenv

from analyze import analyze_video

load_dotenv()

app = FastAPI(title="Video Analysis Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConfigRequest(BaseModel):
    name: str
    prompt: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze")
async def analyze(file: UploadFile = File(...), prompt: str = None):
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
