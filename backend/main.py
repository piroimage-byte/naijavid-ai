from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

app = FastAPI(title="Naijavid AI Backend")

# CORS
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

# Generated files folder
BASE_DIR = Path(__file__).resolve().parent
GENERATED_DIR = BASE_DIR / "generated"
GENERATED_DIR.mkdir(exist_ok=True)

app.mount("/generated", StaticFiles(directory=str(GENERATED_DIR)), name="generated")


class GenerateRequest(BaseModel):
    prompt: str
    language: str = "English"
    duration: str = "5 seconds"
    watermark: Optional[str] = "naijavid.ai"


@app.get("/")
def root():
    return {"message": "Naijavid AI backend is running", "status": "ok"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/generate")
def generate_video(payload: GenerateRequest):
    try:
        prompt = payload.prompt.strip()

        if not prompt:
            raise HTTPException(status_code=400, detail="Prompt is required.")

        # Demo response for now.
        # Replace this section later with your real video generation logic.
        return {
            "success": True,
            "message": "Generation request received successfully.",
            "video_url": None,
            "data": {
                "prompt": payload.prompt,
                "language": payload.language,
                "duration": payload.duration,
                "watermark": payload.watermark,
            },
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(exc)}")