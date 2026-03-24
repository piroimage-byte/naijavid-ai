from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from generate import create_video

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


@app.get("/")
def root():
    return {"message": "Naijavid AI backend is running", "status": "ok"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/generate")
async def generate_video(request: Request):
    try:
        payload: dict[str, Any] = await request.json()

        prompt = str(
            payload.get("prompt")
            or payload.get("text")
            or payload.get("script")
            or payload.get("idea")
            or ""
        ).strip()

        if not prompt:
            raise HTTPException(status_code=400, detail="Prompt is required.")

        language = str(payload.get("language") or "English").strip()

        duration_raw = (
            payload.get("duration")
            or payload.get("length")
            or payload.get("seconds")
            or "5 seconds"
        )

        if isinstance(duration_raw, (int, float)):
            duration_seconds = int(duration_raw)
        else:
            duration_text = str(duration_raw).strip().lower()
            digits = "".join(ch for ch in duration_text if ch.isdigit())
            duration_seconds = int(digits) if digits else 5

        if duration_seconds <= 0:
            duration_seconds = 5

        watermark = str(payload.get("watermark") or "naijavid.ai").strip()

        filename = create_video(
            prompt=prompt,
            duration_seconds=duration_seconds,
            watermark=watermark,
            language=language,
        )

        if not filename:
            raise HTTPException(status_code=500, detail="Video generation failed.")

        video_url = f"https://naijavid-ai.onrender.com/generated/{filename}"

        return {
            "success": True,
            "message": "Video generated successfully.",
            "video_url": video_url,
            "data": {
                "prompt": prompt,
                "language": language,
                "duration_seconds": duration_seconds,
                "watermark": watermark,
            },
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Generation failed: {str(exc)}",
        )