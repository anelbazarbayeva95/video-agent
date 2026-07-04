from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from dotenv import load_dotenv

from frames import extract_best_frames
from sticker import generate_sticker, STYLES

load_dotenv()

app = FastAPI(title="Kadr API")

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


@app.post("/best-frames")
async def best_frames(
    file: UploadFile = File(...),
    prompt: str = Form(None),
    count: int = Form(5),
):
    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ("mp4", "mov", "avi", "webm", "mkv"):
        raise HTTPException(400, "Unsupported format")

    contents = await file.read()
    try:
        frames = extract_best_frames(contents, ext, prompt, count=count)
        return {"frames": frames}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/sticker")
async def sticker(
    file: UploadFile = File(...),
    style: str = Form("cutout"),
    format: str = Form("png"),
):
    if style not in STYLES:
        raise HTTPException(400, f"Unknown style. Options: {', '.join(STYLES)}")
    if format not in ("png", "webp"):
        raise HTTPException(400, "Format must be png or webp")

    contents = await file.read()
    try:
        image = generate_sticker(contents, style, format)
    except Exception as e:
        raise HTTPException(500, str(e))

    return Response(
        content=image,
        media_type=f"image/{format}",
        headers={"Content-Disposition": f'attachment; filename="sticker.{format}"'},
    )
