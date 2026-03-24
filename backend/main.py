from pathlib import Path
from fastapi import FastAPI, HTTPException, Body, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from moviepy.editor import TextClip, ImageClip
import uuid
import os

app = FastAPI(title="Naijavid AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://naijavid-ai.vercel.app",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "generated_videos"
TEMP_DIR = BASE_DIR / "temp_uploads"

OUTPUT_DIR.mkdir(exist_ok=True)
TEMP_DIR.mkdir(exist_ok=True)


class GenerateRequest(BaseModel):
    prompt: str
    language: str
    duration: int
    watermark: str


@app.get("/")
def root():
    return {"message": "Naijavid AI backend is running", "status": "ok"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/generate")
def generate_video(payload: GenerateRequest = Body(...)):
    try:
        prompt = payload.prompt.strip()
        if not prompt:
            raise HTTPException(status_code=400, detail="Prompt is required.")

        duration_seconds = payload.duration if payload.duration > 0 else 5

        filename = f"{uuid.uuid4().hex}.mp4"
        filepath = OUTPUT_DIR / filename

        text = f"{prompt}\n\n{payload.language}\n\n{payload.watermark}"

        clip = TextClip(
            txt=text,
            fontsize=48,
            color="white",
            size=(720, 1280),
            method="caption",
        ).set_duration(duration_seconds)

        clip.write_videofile(str(filepath), fps=24, audio=False)

        video_url = f"https://naijavid-ai-new.onrender.com/video/{filename}"

        return {
            "success": True,
            "message": "Video generated successfully.",
            "video_url": video_url,
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/generate-from-image")
async def generate_from_image(file: UploadFile = File(...)):
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="Image file is required.")

        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in [".png", ".jpg", ".jpeg", ".webp"]:
            raise HTTPException(status_code=400, detail="Unsupported image format.")

        temp_name = f"{uuid.uuid4().hex}{ext}"
        temp_path = TEMP_DIR / temp_name

        with open(temp_path, "wb") as f:
            f.write(await file.read())

        output_name = f"{uuid.uuid4().hex}.mp4"
        output_path = OUTPUT_DIR / output_name

        clip = ImageClip(str(temp_path)).set_duration(5)
        clip = clip.resize(height=1280)

        if clip.w > 720:
            clip = clip.crop(x_center=clip.w / 2, width=720)
        else:
            clip = clip.resize(width=720)

        clip.write_videofile(str(output_path), fps=24, audio=False)

        try:
            os.remove(temp_path)
        except Exception:
            pass

        video_url = f"https://naijavid-ai-new.onrender.com/video/{output_name}"

        return {
            "success": True,
            "message": "Image video generated successfully.",
            "video_url": video_url,
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/video/{filename}")
def get_video(filename: str):
    filepath = OUTPUT_DIR / filename

    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Video not found.")

    return FileResponse(str(filepath), media_type="video/mp4")