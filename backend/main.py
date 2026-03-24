from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field

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
GENERATED_DIR = BASE_DIR / "generated"
GENERATED_DIR.mkdir(exist_ok=True)

app.mount("/generated", StaticFiles(directory=str(GENERATED_DIR)), name="generated")


class GenerateRequest(BaseModel):
    model_config = ConfigDict(extra="allow", populate_by_name=True)

    prompt: Optional[str] = None
    text: Optional[str] = None
    language: Optional[str] = "English"
    duration: Optional[Any] = "5 seconds"
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
        prompt = (payload.prompt or payload.text or "").strip()

        if not prompt:
            raise HTTPException(status_code=400, detail="Prompt is required.")

        duration_value = payload.duration
        if isinstance(duration_value, (int, float)):
            duration_text = f"{int(duration_value)} seconds"
        else:
            duration_text = str(duration_value or "5 seconds")

        return {
            "success": True,
            "message": "Generation request received successfully.",
            "video_url": None,
            "data": {
                "prompt": prompt,
                "language": payload.language or "English",
                "duration": duration_text,
                "watermark": payload.watermark or "naijavid.ai",
            },
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Generation failed: {str(exc)}",
        )