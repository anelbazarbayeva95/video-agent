import json

from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from dotenv import load_dotenv

from frames import extract_best_frames
from sticker import generate_sticker, STYLES
from reframe import smart_crop, ASPECTS
from asset_pack import build_asset_pack
from expand import expand as expand_image, expand_margins, ASPECTS as EXPAND_ASPECTS

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


@app.post("/asset-pack")
async def asset_pack(
    file: UploadFile = File(...),
    prompt: str = Form(None),
    count: int = Form(5),
    sticker_style: str = Form("cutout"),
    stickers: int = Form(3),
    thumbnails: int = Form(1),
    stories: int = Form(1),
):
    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ("mp4", "mov", "avi", "webm", "mkv"):
        raise HTTPException(400, "Unsupported format")
    if sticker_style not in STYLES:
        raise HTTPException(400, f"Unknown sticker style. Options: {', '.join(STYLES)}")

    contents = await file.read()

    async def stream():
        async for event in build_asset_pack(
            contents, ext, prompt, count, sticker_style,
            stickers=stickers, thumbnails=thumbnails, stories=stories,
        ):
            yield f"data: {json.dumps(event)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


@app.post("/expand")
async def expand(
    file: UploadFile = File(...),
    aspect: str = Form(None),
    left: float = Form(0.0),
    right: float = Form(0.0),
    top: float = Form(0.0),
    bottom: float = Form(0.0),
):
    """Two modes. Preset: pass `aspect` (16:9/9:16/...). Free-form: pass any of
    left/right/top/bottom as fractions of the image's width/height to drag each
    side out independently."""
    contents = await file.read()
    custom = any(v > 0 for v in (left, right, top, bottom))
    try:
        if custom:
            image = expand_margins(contents, left, right, top, bottom)
        else:
            if aspect not in EXPAND_ASPECTS:
                raise HTTPException(400, f"Unknown aspect. Options: {', '.join(EXPAND_ASPECTS)}")
            image = expand_image(contents, aspect)
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, str(e))
    return Response(
        content=image, media_type="image/jpeg",
        headers={"Content-Disposition": 'attachment; filename="expanded.jpg"'},
    )


@app.post("/reframe")
async def reframe(file: UploadFile = File(...), aspect: str = Form("16:9")):
    if aspect not in ASPECTS:
        raise HTTPException(400, f"Unknown aspect. Options: {', '.join(ASPECTS)}")

    contents = await file.read()
    try:
        image = smart_crop(contents, aspect)
    except Exception as e:
        raise HTTPException(500, str(e))

    return Response(
        content=image,
        media_type="image/jpeg",
        headers={"Content-Disposition": 'attachment; filename="reframe.jpg"'},
    )
