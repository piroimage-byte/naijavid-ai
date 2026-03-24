import os
import traceback
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from generate import generate_video

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
GENERATED_DIR = os.path.join(BASE_DIR, "generated")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(GENERATED_DIR, exist_ok=True)
app.mount("/generated", StaticFiles(directory=GENERATED_DIR), name="generated")


class GenerateRequest(BaseModel):
    prompt: str
    duration: int = 5
    language: str = "English"
    watermark: str = "naijavid.ai"


@app.get("/")
def root():
    return {"message": "NaijaVid AI backend is running"}


@app.post("/generate")
def create_video(payload: GenerateRequest):
    prompt = payload.prompt.strip()

    if not prompt:
        return {
            "success": False,
            "error": "Prompt is required."
        }

    try:
        filename = generate_video(
            prompt=prompt,
            duration=payload.duration,
            language=payload.language,
            watermark=payload.watermark,
        )

        video_url = f"http://127.0.0.1:8000/generated/{filename}"

        return {
            "success": True,
            "filename": filename,
            "videoUrl": video_url,
        }

    except Exception as e:
        traceback.print_exc()
        return {
            "success": False,
            "error": f"{type(e).__name__}: {str(e)}"
        }