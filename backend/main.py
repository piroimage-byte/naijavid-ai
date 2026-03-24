from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

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
            duration = f"{int(duration_raw)} seconds"
        else:
            duration = str(duration_raw).strip() or "5 seconds"

        watermark = str(payload.get("watermark") or "naijavid.ai").strip()

        return {
            "success": True,
            "message": "Generation request received successfully.",
            "video_url": None,
            "data": {
                "prompt": prompt,
                "language": language,
                "duration": duration,
                "watermark": watermark,
                "raw_payload": payload,
            },
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Generation failed: {str(exc)}",
        )