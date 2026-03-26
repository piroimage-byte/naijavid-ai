import os
import uuid
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, field_validator

from generator import (
    GENERATED_DIR,
    UPLOADS_DIR,
    MAX_DURATION_SECONDS,
    generate_image_video,
    generate_text_video,
)


app = FastAPI(
    title="NaijaVid AI Backend",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=3, max_length=500)
    language: str = Field(..., min_length=2, max_length=50)
    duration: int = Field(..., ge=1, le=MAX_DURATION_SECONDS)
    watermark: str = Field(..., min_length=1, max_length=100)

    @field_validator("prompt", "language", "watermark")
    @classmethod
    def strip_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Field cannot be empty.")
        return value


def cleanup_file(path: Path) -> None:
    try:
        if path.exists():
            path.unlink()
    except Exception:
        pass


async def save_upload_file_streaming(upload: UploadFile, destination: Path) -> int:
    total_bytes = 0

    with open(destination, "wb") as buffer:
        while True:
            chunk = await upload.read(1024 * 1024)  # 1MB chunks
            if not chunk:
                break

            total_bytes += len(chunk)
            if total_bytes > MAX_UPLOAD_SIZE_BYTES:
                buffer.close()
                cleanup_file(destination)
                raise HTTPException(
                    status_code=413,
                    detail="Image is too large. Maximum upload size is 10MB.",
                )

            buffer.write(chunk)

    await upload.close()
    return total_bytes


def normalize_text(value: str, field_name: str, min_len: int = 1, max_len: int = 500) -> str:
    cleaned = (value or "").strip()
    if len(cleaned) < min_len:
        raise HTTPException(status_code=422, detail=f"{field_name} is required.")
    if len(cleaned) > max_len:
        raise HTTPException(status_code=422, detail=f"{field_name} is too long.")
    return cleaned


def build_video_url(request: Request, filename: str) -> str:
    return f"{str(request.base_url).rstrip('/')}/video/{filename}"


@app.get("/")
def root():
    return {
        "success": True,
        "message": "NaijaVid AI Backend is running.",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "naijavid-ai-backend",
    }


@app.post("/generate")
async def generate_video(data: GenerateRequest, request: Request):
    try:
        filename = generate_text_video(
            prompt=data.prompt,
            language=data.language,
            duration=data.duration,
            watermark=data.watermark,
        )

        return {
            "success": True,
            "message": "Video generated successfully.",
            "video_url": build_video_url(request, filename),
            "duration": min(data.duration, MAX_DURATION_SECONDS),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Video generation failed: {exc}")


@app.post("/generate-from-image")
async def generate_from_image(
    request: Request,
    image: UploadFile = File(...),
    prompt: str = Form(...),
    language: str = Form(...),
    duration: int = Form(...),
    watermark: str = Form(...),
):
    upload_path = None

    try:
        prompt = normalize_text(prompt, "Prompt", min_len=3, max_len=500)
        language = normalize_text(language, "Language", min_len=2, max_len=50)
        watermark = normalize_text(watermark, "Watermark", min_len=1, max_len=100)

        if duration < 1 or duration > MAX_DURATION_SECONDS:
            raise HTTPException(
                status_code=422,
                detail=f"Duration must be between 1 and {MAX_DURATION_SECONDS} seconds.",
            )

        ext = Path(image.filename or "").suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail="Only JPG, JPEG, PNG, and WEBP images are supported.",
            )

        upload_path = UPLOADS_DIR / f"{uuid.uuid4().hex}{ext}"
        await save_upload_file_streaming(image, upload_path)

        filename = generate_image_video(
            image_path=str(upload_path),
            prompt=prompt,
            language=language,
            duration=duration,
            watermark=watermark,
        )

        return {
            "success": True,
            "message": "Video generated successfully from image.",
            "video_url": build_video_url(request, filename),
            "duration": min(duration, MAX_DURATION_SECONDS),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Image-to-video generation failed: {exc}")
    finally:
        if upload_path is not None:
            cleanup_file(upload_path)


@app.get("/video/{filename}")
async def get_video(filename: str):
    file_path = GENERATED_DIR / filename

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Video not found.")

    return FileResponse(
        path=str(file_path),
        media_type="video/mp4",
        filename=filename,
    )