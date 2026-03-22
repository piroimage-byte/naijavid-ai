import os
import uuid
from pathlib import Path

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

app = FastAPI(title="Naijavid AI Backend")


def get_allowed_origins() -> list[str]:
    raw = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,https://naijavid-ai.vercel.app",
    )
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/generated", StaticFiles(directory=str(GENERATED_DIR)), name="generated")
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")


@app.get("/")
async def root():
    return {
        "message": "Naijavid AI backend is running",
        "status": "ok",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


def save_upload_file(upload: UploadFile, destination: Path) -> None:
    with destination.open("wb") as buffer:
        while True:
            chunk = upload.file.read(1024 * 1024)
            if not chunk:
                break
            buffer.write(chunk)


@app.post("/generate")
async def generate_video(
    image: UploadFile = File(...),
    duration: int = Form(5),
    fps: int = Form(24),
):
    if not image.filename:
        raise HTTPException(status_code=400, detail="Image file is required.")

    if duration < 1 or duration > 30:
        raise HTTPException(status_code=400, detail="Duration must be between 1 and 30 seconds.")

    if fps < 12 or fps > 60:
        raise HTTPException(status_code=400, detail="FPS must be between 12 and 60.")

    content_type = (image.content_type or "").lower()
    allowed_types = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
    if content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, PNG, and WEBP images are allowed.",
        )

    file_ext = Path(image.filename).suffix.lower() or ".png"
    if file_ext not in {".jpg", ".jpeg", ".png", ".webp"}:
        file_ext = ".png"

    job_id = str(uuid.uuid4())
    input_path = UPLOADS_DIR / f"{job_id}{file_ext}"
    output_path = GENERATED_DIR / f"{job_id}.mp4"

    try:
        save_upload_file(image, input_path)

        clip = (
            ImageClip(str(input_path))
            .with_duration(duration)
        )

        clip.write_videofile(
            str(output_path),
            fps=fps,
            codec="libx264",
            audio=False,
        )
        clip.close()

        public_base_url = os.getenv("PUBLIC_BACKEND_URL", "").strip()
        if public_base_url:
            video_url = f"{public_base_url.rstrip('/')}/generated/{output_path.name}"
        else:
            video_url = f"/generated/{output_path.name}"

        return {
            "success": True,
            "jobId": job_id,
            "duration": duration,
            "fps": fps,
            "videoUrl": video_url,
            "filename": output_path.name,
        }

    except Exception as exc:
        if output_path.exists():
            output_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Video generation failed: {str(exc)}") from exc

    finally:
        try:
            image.file.close()
        except Exception:
            pass


@app.delete("/generated/{filename}")
async def delete_generated_file(filename: str):
    safe_name = Path(filename).name
    file_path = GENERATED_DIR / safe_name

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found.")

    file_path.unlink(missing_ok=True)

    return {
        "success": True,
        "message": "Generated file deleted successfully.",
    }