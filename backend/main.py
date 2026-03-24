from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from moviepy.editor import TextClip
import uuid
import os

app = FastAPI()

# ✅ CORS (already working but keep it)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ folder to store videos
OUTPUT_DIR = "generated_videos"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ✅ request schema
class GenerateRequest(BaseModel):
    prompt: str
    language: str
    duration: int
    watermark: str


@app.get("/")
def root():
    return {"message": "Naijavid AI backend running"}


@app.post("/generate")
def generate_video(payload: GenerateRequest):
    try:
        if not payload.prompt:
            raise HTTPException(status_code=400, detail="Prompt is required")

        # unique file name
        filename = f"{uuid.uuid4()}.mp4"
        filepath = os.path.join(OUTPUT_DIR, filename)

        # 🎬 SIMPLE VIDEO GENERATION (TEXT → VIDEO)
        clip = TextClip(
            txt=payload.prompt,
            fontsize=50,
            color="white",
            size=(720, 1280),
            method="caption"
        ).set_duration(payload.duration)

        clip.write_videofile(filepath, fps=24)

        # ✅ return URL
        video_url = f"https://naijavid-ai.onrender.com/video/{filename}"

        return {
            "success": True,
            "message": "Video generated successfully",
            "video_url": video_url,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ✅ serve video files
from fastapi.responses import FileResponse

@app.get("/video/{filename}")
def get_video(filename: str):
    filepath = os.path.join(OUTPUT_DIR, filename)

    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Video not found")

    return FileResponse(filepath, media_type="video/mp4")