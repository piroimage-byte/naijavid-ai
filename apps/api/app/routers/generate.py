import json
import os
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, File, Form, UploadFile
from moviepy import ImageClip
from PIL import Image

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
OUTPUT_DIR = os.path.join(BASE_DIR, "generated")
DATA_DIR = os.path.join(BASE_DIR, "data")
JOBS_FILE = os.path.join(DATA_DIR, "jobs.json")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

if not os.path.exists(JOBS_FILE):
    with open(JOBS_FILE, "w", encoding="utf-8") as f:
        json.dump([], f)


def load_jobs():
    try:
        with open(JOBS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def save_jobs(jobs):
    with open(JOBS_FILE, "w", encoding="utf-8") as f:
        json.dump(jobs, f, indent=2, ensure_ascii=False)


def ensure_rgb(image_path: str):
    img = Image.open(image_path)
    if img.mode != "RGB":
      rgb_path = os.path.splitext(image_path)[0] + ".jpg"
      img = img.convert("RGB")
      img.save(rgb_path, "JPEG")
      return rgb_path
    return image_path


def safe_duration(value: int) -> int:
    try:
        duration = int(value)
    except Exception:
        duration = 5

    if duration < 3:
        duration = 3

    if duration > 10:
        duration = 10

    return duration


def safe_language(value: Optional[str]) -> str:
    allowed = {"en", "yo", "ig", "ha", "pcm"}
    lang = (value or "en").strip().lower()
    return lang if lang in allowed else "en"


@router.post("/generate")
async def generate_video(
    image: UploadFile = File(...),
    prompt: str = Form(""),
    language: str = Form("en"),
    duration: int = Form(5),
):
    job_id = str(uuid.uuid4())
    clean_language = safe_language(language)
    clean_duration = safe_duration(duration)

    original_ext = os.path.splitext(image.filename or "")[1].lower()
    if original_ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        original_ext = ".jpg"

    upload_path = os.path.join(UPLOAD_DIR, f"{job_id}{original_ext}")
    output_filename = f"{job_id}.mp4"
    output_path = os.path.join(OUTPUT_DIR, output_filename)

    try:
        file_bytes = await image.read()

        if not file_bytes:
            return {
                "id": job_id,
                "status": "failed",
                "error": "Uploaded image is empty.",
            }

        with open(upload_path, "wb") as f:
            f.write(file_bytes)

        processed_image_path = ensure_rgb(upload_path)

        clip = ImageClip(processed_image_path, duration=clean_duration)
        clip.write_videofile(
            output_path,
            fps=24,
            codec="libx264",
            audio=False,
            logger=None,
        )
        clip.close()

        video_url = f"http://127.0.0.1:8000/generated/{output_filename}"

        jobs = load_jobs()
        jobs.append(
            {
                "id": job_id,
                "prompt": prompt.strip(),
                "language": clean_language,
                "duration": clean_duration,
                "videoUrl": video_url,
                "status": "completed",
                "createdAt": datetime.utcnow().isoformat() + "Z",
            }
        )
        save_jobs(jobs)

        return {
            "id": job_id,
            "status": "completed",
            "videoUrl": video_url,
            "prompt": prompt.strip(),
            "language": clean_language,
            "duration": clean_duration,
        }

    except Exception as e:
        jobs = load_jobs()
        jobs.append(
            {
                "id": job_id,
                "prompt": prompt.strip(),
                "language": clean_language,
                "duration": clean_duration,
                "status": "failed",
                "error": str(e),
                "createdAt": datetime.utcnow().isoformat() + "Z",
            }
        )
        save_jobs(jobs)

        return {
            "id": job_id,
            "status": "failed",
            "error": str(e),
        }