import os
import uuid
from pathlib import Path
from urllib.parse import quote

import firebase_admin
from firebase_admin import credentials, storage
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from backend.generate import (
    GENERATED_DIR,
    UPLOADS_DIR,
    MAX_DURATION_SECONDS,
    generate_image_video,
    generate_text_video,
)

# =========================================================
# APP
# =========================================================

app = FastAPI(
    title="NaijaVid AI Backend",
    version="0.3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# CONSTANTS
# =========================================================

MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024

ALLOWED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
}


# =========================================================
# FIREBASE ENVIRONMENT
# =========================================================

FIREBASE_PROJECT_ID = (
    os.getenv("FIREBASE_PROJECT_ID", "")
    .strip()
)

FIREBASE_CLIENT_EMAIL = (
    os.getenv("FIREBASE_CLIENT_EMAIL", "")
    .strip()
)

FIREBASE_PRIVATE_KEY = (
    os.getenv("FIREBASE_PRIVATE_KEY", "")
    .replace("\\n", "\n")
    .strip()
)

FIREBASE_STORAGE_BUCKET = (
    os.getenv(
        "FIREBASE_STORAGE_BUCKET",
        "naijavid-ai.firebasestorage.app",
    )
    .strip()
)


# =========================================================
# FIREBASE INITIALIZATION
# =========================================================

def init_firebase() -> None:
    if firebase_admin._apps:
        return

    if not FIREBASE_PROJECT_ID:
        raise RuntimeError(
            "Missing FIREBASE_PROJECT_ID"
        )

    if not FIREBASE_CLIENT_EMAIL:
        raise RuntimeError(
            "Missing FIREBASE_CLIENT_EMAIL"
        )

    if not FIREBASE_PRIVATE_KEY:
        raise RuntimeError(
            "Missing FIREBASE_PRIVATE_KEY"
        )

    credential_data = {
        "type": "service_account",
        "project_id": FIREBASE_PROJECT_ID,
        "private_key": FIREBASE_PRIVATE_KEY,
        "client_email": FIREBASE_CLIENT_EMAIL,
        "token_uri": "https://oauth2.googleapis.com/token",
    }

    cred = credentials.Certificate(
        credential_data
    )

    firebase_admin.initialize_app(
        cred,
        {
            "storageBucket":
                FIREBASE_STORAGE_BUCKET,
        },
    )


# =========================================================
# FIREBASE STORAGE UPLOAD
# =========================================================

def upload_video_to_firebase(
    file_path: Path,
) -> str:
    init_firebase()

    if not file_path.exists():
        raise RuntimeError(
            "Generated video file does not exist."
        )

    bucket = storage.bucket()

    remote_name = (
        f"generated-videos/"
        f"{uuid.uuid4().hex}.mp4"
    )

    blob = bucket.blob(remote_name)

    download_token = uuid.uuid4().hex

    blob.metadata = {
        "firebaseStorageDownloadTokens":
            download_token
    }

    blob.upload_from_filename(
        str(file_path),
        content_type="video/mp4",
    )

    blob.patch()

    encoded_path = quote(
        remote_name,
        safe="",
    )

    permanent_url = (
        "https://firebasestorage.googleapis.com/"
        f"v0/b/{FIREBASE_STORAGE_BUCKET}/o/"
        f"{encoded_path}"
        f"?alt=media&token={download_token}"
    )

    return permanent_url


# =========================================================
# REQUEST MODEL
# =========================================================

class GenerateRequest(BaseModel):
    prompt: str = Field(
        ...,
        min_length=3,
        max_length=500,
    )

    language: str = Field(
        ...,
        min_length=2,
        max_length=50,
    )

    duration: int = Field(
        ...,
        ge=1,
        le=MAX_DURATION_SECONDS,
    )

    watermark: str = Field(
        ...,
        min_length=1,
        max_length=100,
    )

    @field_validator(
        "prompt",
        "language",
        "watermark",
    )
    @classmethod
    def strip_text(
        cls,
        value: str,
    ) -> str:
        cleaned = value.strip()

        if not cleaned:
            raise ValueError(
                "Field cannot be empty."
            )

        return cleaned


# =========================================================
# HELPERS
# =========================================================

def cleanup_file(
    path: Path,
) -> None:
    try:
        if path.exists():
            path.unlink()
    except Exception:
        pass


async def save_upload_file_streaming(
    upload: UploadFile,
    destination: Path,
) -> int:
    total_bytes = 0

    try:
        with open(
            destination,
            "wb",
        ) as buffer:
            while True:
                chunk = await upload.read(
                    1024 * 1024
                )

                if not chunk:
                    break

                total_bytes += len(chunk)

                if (
                    total_bytes
                    > MAX_UPLOAD_SIZE_BYTES
                ):
                    cleanup_file(
                        destination
                    )

                    raise HTTPException(
                        status_code=413,
                        detail=(
                            "Image is too large. "
                            "Maximum upload size "
                            "is 10MB."
                        ),
                    )

                buffer.write(chunk)

        return total_bytes

    finally:
        await upload.close()


def normalize_text(
    value: str,
    field_name: str,
    min_len: int = 1,
    max_len: int = 500,
) -> str:
    cleaned = (
        value or ""
    ).strip()

    if len(cleaned) < min_len:
        raise HTTPException(
            status_code=422,
            detail=(
                f"{field_name} is required."
            ),
        )

    if len(cleaned) > max_len:
        raise HTTPException(
            status_code=422,
            detail=(
                f"{field_name} is too long."
            ),
        )

    return cleaned


# =========================================================
# BASIC ROUTES
# =========================================================

@app.get("/")
def root():
    return {
        "success": True,
        "message":
            "NaijaVid AI Backend is running.",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service":
            "naijavid-ai-backend",
    }


# =========================================================
# TEXT TO VIDEO
# =========================================================

@app.post("/generate")
async def generate_video(
    data: GenerateRequest,
):
    local_video_path = None

    try:
        filename = generate_text_video(
            prompt=data.prompt,
            language=data.language,
            duration=data.duration,
            watermark=data.watermark,
        )

        local_video_path = (
            GENERATED_DIR / filename
        )

        permanent_video_url = (
            upload_video_to_firebase(
                local_video_path
            )
        )

        return {
            "success": True,
            "message": (
                "Video generated and "
                "uploaded successfully."
            ),
            "video_url":
                permanent_video_url,
            "duration":
                min(
                    data.duration,
                    MAX_DURATION_SECONDS,
                ),
        }

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Video generation failed: "
                f"{exc}"
            ),
        )

    finally:
        if (
            local_video_path
            is not None
        ):
            cleanup_file(
                local_video_path
            )


# =========================================================
# IMAGE TO VIDEO
# =========================================================

@app.post("/generate-from-image")
async def generate_from_image(
    image: UploadFile = File(...),
    prompt: str = Form(...),
    language: str = Form(...),
    duration: int = Form(...),
    watermark: str = Form(...),
):
    upload_path = None
    local_video_path = None

    try:
        prompt = normalize_text(
            prompt,
            "Prompt",
            min_len=3,
            max_len=500,
        )

        language = normalize_text(
            language,
            "Language",
            min_len=2,
            max_len=50,
        )

        watermark = normalize_text(
            watermark,
            "Watermark",
            min_len=1,
            max_len=100,
        )

        if (
            duration < 1
            or duration
            > MAX_DURATION_SECONDS
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    "Duration must be "
                    f"between 1 and "
                    f"{MAX_DURATION_SECONDS} "
                    "seconds."
                ),
            )

        ext = Path(
            image.filename or ""
        ).suffix.lower()

        if (
            ext
            not in ALLOWED_EXTENSIONS
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Only JPG, JPEG, PNG, "
                    "and WEBP images are "
                    "supported."
                ),
            )

        upload_path = (
            UPLOADS_DIR
            / f"{uuid.uuid4().hex}{ext}"
        )

        await save_upload_file_streaming(
            image,
            upload_path,
        )

        filename = generate_image_video(
            image_path=
                str(upload_path),
            prompt=prompt,
            language=language,
            duration=duration,
            watermark=watermark,
        )

        local_video_path = (
            GENERATED_DIR / filename
        )

        permanent_video_url = (
            upload_video_to_firebase(
                local_video_path
            )
        )

        return {
            "success": True,
            "message": (
                "Video generated from image "
                "and uploaded successfully."
            ),
            "video_url":
                permanent_video_url,
            "duration":
                min(
                    duration,
                    MAX_DURATION_SECONDS,
                ),
        }

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Image-to-video generation "
                f"failed: {exc}"
            ),
        )

    finally:
        if upload_path is not None:
            cleanup_file(
                upload_path
            )

        if (
            local_video_path
            is not None
        ):
            cleanup_file(
                local_video_path
            )