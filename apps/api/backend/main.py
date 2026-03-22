from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from moviepy import ImageClip
import os
import uuid
import shutil

app = FastAPI(title="NaijaVid AI Backend")

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

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
OUTPUT_DIR = os.path.join(BASE_DIR, "generated")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

app.mount("/generated", StaticFiles(directory=OUTPUT_DIR), name="generated")


@app.get("/")
def root():
    return {"message": "NaijaVid AI backend is running"}


@app.post("/generate")
async def generate_video(image: UploadFile = File(...)):
    temp_input_path = None
    output_path = None

    try:
        if not image.filename:
            return JSONResponse(
                status_code=400,
                content={"error": "No file uploaded."},
            )

        ext = os.path.splitext(image.filename)[1].lower()
        if ext not in [".jpg", ".jpeg", ".png"]:
            return JSONResponse(
                status_code=400,
                content={"error": "Only JPG and PNG images are supported."},
            )

        file_id = str(uuid.uuid4())
        temp_input_path = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")
        output_path = os.path.join(OUTPUT_DIR, f"{file_id}.mp4")

        with open(temp_input_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)

        clip = ImageClip(temp_input_path, duration=10)
        clip.write_videofile(output_path, fps=24, audio=False)
        clip.close()

        return {
            "success": True,
            "id": file_id,
            "videoUrl": f"http://127.0.0.1:8000/generated/{file_id}.mp4",
            "duration": 10,
        }

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)},
        )

    finally:
        try:
            if image:
                image.file.close()
        except Exception:
            pass

        try:
            if temp_input_path and os.path.exists(temp_input_path):
                os.remove(temp_input_path)
        except Exception:
            pass