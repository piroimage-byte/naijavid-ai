from pathlib import Path
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from moviepy.editor import TextClip
import os
import uuid

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
OUTPUT_DIR.mkdir(exist_ok=True)


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

        video_url = f"https://naijavid-ai.onrender.com/video/{filename}"

        return {
            "success": True,
            "message": "Video generated successfully.",
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