import os
import uuid
from pathlib import Path
from typing import List

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from moviepy import ImageClip

BASE_DIR = Path(__file__).resolve().parent
UPLOADS_DIR = BASE_DIR / "uploads"
GENERATED_DIR = BASE_DIR / "generated"
DATA_DIR = BASE_DIR / "data"

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
GENERATED_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Naijavid AI Backend", version="0.1.0")


def parse_allowed_origins() -> List[str]:
    raw = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,https://naijavid-ai.vercel.app",
    )
    return [item.strip() for item in raw.split(",") if item.strip()]


app.add_middleware(
    CORSMiddleware,
    allow_origins=parse_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/generated", StaticFiles(directory=str(GENERATED_DIR)), name="generated")
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")


@app.get("/")
async def root():
    return {"message": "Naijavid AI backend is running", "status": "ok"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


def save_upload_file(upload: UploadFile, destination: Path) -> None:
    with destination.open("wb") as file_obj:
        while True:
            chunk = upload.file.read(1024 * 1024)
            if not chunk:
                break
            file_obj.write(chunk)


def create_image_clip(image_path: str, duration: int):
    clip = ImageClip(image_path)

    if hasattr(clip, "with_duration"):
        clip = clip.with_duration(duration)
    else:
        clip = clip.set_duration(duration)

    return clip


@app.post("/generate")
async def generate_video(
    image: UploadFile = File(...),
    duration: int = Form(10),
    fps: int = Form(24),
    title: str = Form(""),
):
    if not image.filename:
        raise HTTPException(status_code=400, detail="Image file is required.")

    if duration < 1 or duration > 30:
        raise HTTPException(
            status_code=400,
            detail="Duration must be between 1 and 30 seconds.",
        )

    if fps < 12 or fps > 60:
        raise HTTPException(
            status_code=400,
            detail="FPS must be between 12 and 60.",
        )

    content_type = (image.content_type or "").lower()
    allowed_content_types = {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
    }
    if content_type not in allowed_content_types:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, PNG, and WEBP images are allowed.",
        )

    suffix = Path(image.filename).suffix.lower() or ".png"
    if suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
        suffix = ".png"

    job_id = str(uuid.uuid4())
    input_path = UPLOADS_DIR / f"{job_id}{suffix}"
    output_path = GENERATED_DIR / f"{job_id}.mp4"

    try:
        save_upload_file(image, input_path)

        clip = create_image_clip(str(input_path), duration)
        clip.write_videofile(
            str(output_path),
            fps=fps,
            codec="libx264",
            audio=False,
            logger=None,
        )
        clip.close()

        public_backend_url = os.getenv(
            "PUBLIC_BACKEND_URL",
            "https://naijavid-ai.onrender.com",
        ).rstrip("/")

        video_url = f"{public_backend_url}/generated/{output_path.name}"

        return {
            "success": True,
            "jobId": job_id,
            "title": title,
            "duration": duration,
            "fps": fps,
            "filename": output_path.name,
            "videoUrl": video_url,
        }

    except Exception as exc:
        if output_path.exists():
            output_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=500,
            detail=f"Video generation failed: {str(exc)}",
        ) from exc

    finally:
        try:
            image.file.close()
        except Exception:
            pass


@app.delete("/generated/{filename}")
async def delete_generated_file(filename: str):
    safe_filename = Path(filename).name
    file_path = GENERATED_DIR / safe_filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found.")

    file_path.unlink(missing_ok=True)

    return {
        "success": True,
        "message": "Generated file deleted successfully.",
    }