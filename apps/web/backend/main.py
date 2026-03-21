from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from moviepy import ImageClip
from PIL import Image
import uuid
import os
import json
from datetime import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # change to your frontend URL later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, "generated")
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
DATA_DIR = os.path.join(BASE_DIR, "data")
JOBS_FILE = os.path.join(DATA_DIR, "jobs.json")

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

if not os.path.exists(JOBS_FILE):
    with open(JOBS_FILE, "w", encoding="utf-8") as f:
        json.dump([], f)

app.mount("/generated", StaticFiles(directory=OUTPUT_DIR), name="generated")


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
        img = img.convert("RGB")
        img.save(image_path, "JPEG")


@app.get("/")
def root():
    return {"message": "Naijavid AI backend is running"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/languages")
def get_languages():
    return {
        "languages": [
            {"code": "en", "name": "English"},
            {"code": "yo", "name": "Yoruba"},
            {"code": "ig", "name": "Igbo"},
            {"code": "ha", "name": "Hausa"},
            {"code": "pcm", "name": "Nigerian Pidgin"},
        ]
    }


@app.get("/jobs")
def get_jobs():
    jobs = load_jobs()
    jobs = sorted(jobs, key=lambda x: x.get("createdAt", ""), reverse=True)
    return {"jobs": jobs}


@app.get("/jobs/{job_id}")
def get_job(job_id: str):
    jobs = load_jobs()
    for job in jobs:
        if job["id"] == job_id:
            return job
    return {"error": "Job not found"}


@app.post("/generate")
async def generate_video(
    image: UploadFile = File(...),
    prompt: str = Form(""),
    language: str = Form("en"),
    duration: int = Form(5),
):
    job_id = str(uuid.uuid4())

    original_ext = os.path.splitext(image.filename or "")[1].lower()
    if original_ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        original_ext = ".jpg"

    upload_path = os.path.join(UPLOAD_DIR, f"{job_id}{original_ext}")
    output_filename = f"{job_id}.mp4"
    output_path = os.path.join(OUTPUT_DIR, output_filename)

    with open(upload_path, "wb") as f:
        f.write(await image.read())

    try:
        ensure_rgb(upload_path)

        clip = ImageClip(upload_path, duration=max(3, min(duration, 15)))
        clip.write_videofile(output_path, fps=24, codec="libx264", audio=False)
        clip.close()

        video_url = f"http://127.0.0.1:8000/generated/{output_filename}"

        jobs = load_jobs()
        jobs.append(
            {
                "id": job_id,
                "prompt": prompt,
                "language": language,
                "duration": duration,
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
            "prompt": prompt,
            "language": language,
            "duration": duration,
        }

    except Exception as e:
        jobs = load_jobs()
        jobs.append(
            {
                "id": job_id,
                "prompt": prompt,
                "language": language,
                "duration": duration,
                "status": "failed",
                "error": str(e),
                "createdAt": datetime.utcnow().isoformat() + "Z",
            }
        )
        save_jobs(jobs)
        return {"id": job_id, "status": "failed", "error": str(e)}