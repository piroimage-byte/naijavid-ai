import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routers.generate import router as generate_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, "generated")

os.makedirs(OUTPUT_DIR, exist_ok=True)

app.mount("/generated", StaticFiles(directory=OUTPUT_DIR), name="generated")


@app.get("/")
def root():
    return {"message": "NaijaVid AI backend is running"}


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


app.include_router(generate_router)