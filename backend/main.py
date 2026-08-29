import base64
import json
import os
import uuid
from pathlib import Path
from urllib.parse import quote

import firebase_admin
from firebase_admin import credentials, storage
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from generate import (
    GENERATED_DIR,
    UPLOADS_DIR,
    MAX_DURATION_SECONDS,
    generate_image_video,
    generate_multi_image_video,
    generate_text_video,
)


# =========================================================
# APP
# =========================================================

app = FastAPI(
    title="NaijaVid AI Backend",
    version="0.4.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# SETTINGS
# =========================================================

MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024
MAX_MULTI_IMAGES = 5
MIN_MULTI_IMAGES = 2

ALLOWED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
}

FIREBASE_STORAGE_BUCKET = os.getenv(
    "FIREBASE_STORAGE_BUCKET",
    "naijavid-ai.firebasestorage.app",
).strip()


# =========================================================
# FIREBASE ADMIN
# =========================================================

def init_firebase() -> None:
    if firebase_admin._apps:
        return

    encoded_service_account = os.getenv(
        "FIREBASE_SERVICE_ACCOUNT_BASE64",
        "",
    ).strip()

    if not encoded_service_account:
        raise RuntimeError(
            "Missing FIREBASE_SERVICE_ACCOUNT_BASE64"
        )

    try:
        decoded_json = base64.b64decode(
            encoded_service_account
        ).decode("utf-8")

        service_account = json.loads(
            decoded_json
        )

    except Exception as exc:
        raise RuntimeError(
            f"Invalid Firebase service account Base64: {exc}"
        ) from exc

    required_fields = [
        "project_id",
        "private_key",
        "client_email",
    ]

    for field in required_fields:
        if not service_account.get(field):
            raise RuntimeError(
                f"Firebase service account is missing {field}"
            )

    cred = credentials.Certificate(
        service_account
    )

    firebase_admin.initialize_app(
        cred,
        {
            "storageBucket": FIREBASE_STORAGE_BUCKET,
        },
    )


# =========================================================
# FIREBASE STORAGE
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
        f"generated-videos/{uuid.uuid4().hex}.mp4"
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

    return (
        "https://firebasestorage.googleapis.com/"
        f"v0/b/{FIREBASE_STORAGE_BUCKET}/o/"
        f"{encoded_path}"
        f"?alt=media&token={download_token}"
    )


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

    aspect_ratio: str = Field(
        default="16:9",
        pattern=r"^(16:9|9:16|1:1)$",
    )

    motion_style: str = Field(
        default="cinematic",
        pattern=r"^(cinematic|zoom_in|pan_left|pan_right|static)$",
    )

    caption_style: str = Field(
        default="clean",
        pattern=r"^(clean|bold|subtitle)$",
    )

    caption_position: str = Field(
        default="bottom",
        pattern=r"^(top|center|bottom)$",
    )

    show_caption: bool = True

    show_watermark: bool = True

    watermark_position: str = Field(
        default="bottom_right",
        pattern=r"^(top_left|top_right|bottom_left|bottom_right)$",
    )

    watermark_opacity: int = Field(
        default=70,
        ge=20,
        le=100,
    )

    background_music: str = Field(
        default="none",
        pattern=r"^(none|worship|cinematic|corporate|documentary|emotional|upbeat)$",
    )

    music_volume: int = Field(
        default=15,
        ge=0,
        le=30,
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

                if total_bytes > MAX_UPLOAD_SIZE_BYTES:
                    cleanup_file(
                        destination
                    )

                    raise HTTPException(
                        status_code=413,
                        detail=(
                            "Image is too large. "
                            "Maximum upload size is 10MB."
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
            detail=f"{field_name} is required.",
        )

    if len(cleaned) > max_len:
        raise HTTPException(
            status_code=422,
            detail=f"{field_name} is too long.",
        )

    return cleaned


# =========================================================
# BASIC ROUTES
# =========================================================

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
            aspect_ratio=data.aspect_ratio,
            motion_style=data.motion_style,
            caption_style=data.caption_style,
            caption_position=data.caption_position,
            show_caption=data.show_caption,
            show_watermark=data.show_watermark,
            watermark_position=data.watermark_position,
            watermark_opacity=data.watermark_opacity,
            background_music=data.background_music,
            music_volume=data.music_volume,
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
                "Video generated and uploaded successfully."
            ),
            "video_url": permanent_video_url,
            "duration": min(
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
                f"Video generation failed: {exc}"
            ),
        )

    finally:
        if local_video_path is not None:
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
    aspect_ratio: str = Form("16:9"),
    motion_style: str = Form("cinematic"),
    caption_style: str = Form("clean"),
    caption_position: str = Form("bottom"),
    show_caption: bool = Form(True),
    show_watermark: bool = Form(True),
    watermark_position: str = Form("bottom_right"),
    watermark_opacity: int = Form(70),
    background_music: str = Form("none"),
    music_volume: int = Form(15),
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
            or duration > MAX_DURATION_SECONDS
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Duration must be between 1 and "
                    f"{MAX_DURATION_SECONDS} seconds."
                ),
            )

        if aspect_ratio not in {"16:9", "9:16", "1:1"}:
            raise HTTPException(
                status_code=422,
                detail="Aspect ratio must be 16:9, 9:16, or 1:1.",
            )

        if motion_style not in {
            "cinematic",
            "zoom_in",
            "pan_left",
            "pan_right",
            "static",
        }:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Camera motion must be cinematic, zoom_in, "
                    "pan_left, pan_right, or static."
                ),
            )

        if caption_style not in {"clean", "bold", "subtitle"}:
            raise HTTPException(
                status_code=422,
                detail="Caption style must be clean, bold, or subtitle.",
            )

        if caption_position not in {"top", "center", "bottom"}:
            raise HTTPException(
                status_code=422,
                detail="Caption position must be top, center, or bottom.",
            )

        if watermark_position not in {
            "top_left",
            "top_right",
            "bottom_left",
            "bottom_right",
        }:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Watermark position must be top_left, top_right, "
                    "bottom_left, or bottom_right."
                ),
            )

        if watermark_opacity < 20 or watermark_opacity > 100:
            raise HTTPException(
                status_code=422,
                detail="Watermark opacity must be between 20 and 100.",
            )

        if background_music not in {
            "none",
            "worship",
            "cinematic",
            "corporate",
            "documentary",
            "emotional",
            "upbeat",
        }:
            raise HTTPException(
                status_code=422,
                detail="Unsupported background music selection.",
            )

        if music_volume < 0 or music_volume > 30:
            raise HTTPException(
                status_code=422,
                detail="Music volume must be between 0 and 30.",
            )

        ext = Path(
            image.filename or ""
        ).suffix.lower()

        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Only JPG, JPEG, PNG, and WEBP "
                    "images are supported."
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
            image_path=str(upload_path),
            prompt=prompt,
            language=language,
            duration=duration,
            watermark=watermark,
            aspect_ratio=aspect_ratio,
            motion_style=motion_style,
            caption_style=caption_style,
            caption_position=caption_position,
            show_caption=show_caption,
            show_watermark=show_watermark,
            watermark_position=watermark_position,
            watermark_opacity=watermark_opacity,
            background_music=background_music,
            music_volume=music_volume,
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
            "video_url": permanent_video_url,
            "duration": min(
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
                f"Image-to-video generation failed: {exc}"
            ),
        )

    finally:
        if upload_path is not None:
            cleanup_file(
                upload_path
            )

        if local_video_path is not None:
            cleanup_file(
                local_video_path
            )


# =========================================================
# MULTIPLE IMAGES TO VIDEO
# =========================================================

@app.post("/generate-from-images")
async def generate_from_images(
    images: list[UploadFile] = File(...),
    prompt: str = Form(...),
    language: str = Form(...),
    duration: int = Form(...),
    watermark: str = Form(...),
    aspect_ratio: str = Form("16:9"),
    motion_style: str = Form("cinematic"),
    caption_style: str = Form("clean"),
    caption_position: str = Form("bottom"),
    show_caption: bool = Form(True),
    show_watermark: bool = Form(True),
    watermark_position: str = Form("bottom_right"),
    watermark_opacity: int = Form(70),
    background_music: str = Form("none"),
    music_volume: int = Form(15),
    scene_transition: str = Form("crossfade"),
):
    upload_paths: list[Path] = []
    local_video_path = None

    try:
        if len(images) < MIN_MULTI_IMAGES or len(images) > MAX_MULTI_IMAGES:
            raise HTTPException(
                status_code=422,
                detail="Please upload between 2 and 5 images.",
            )

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

        if duration < 1 or duration > MAX_DURATION_SECONDS:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Duration must be between 1 and "
                    f"{MAX_DURATION_SECONDS} seconds."
                ),
            )

        if scene_transition not in {
            "none",
            "fade",
            "crossfade",
            "slide_left",
            "slide_right",
            "zoom",
        }:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Scene transition must be none, fade, crossfade, "
                    "slide_left, slide_right, or zoom."
                ),
            )

        for upload in images:
            ext = Path(upload.filename or "").suffix.lower()

            if ext not in ALLOWED_EXTENSIONS:
                raise HTTPException(
                    status_code=400,
                    detail="All images must be JPG, JPEG, PNG, or WEBP.",
                )

            upload_path = UPLOADS_DIR / f"{uuid.uuid4().hex}{ext}"

            await save_upload_file_streaming(
                upload,
                upload_path,
            )
            upload_paths.append(upload_path)

        filename = generate_multi_image_video(
            image_paths=[str(path) for path in upload_paths],
            prompt=prompt,
            language=language,
            duration=duration,
            watermark=watermark,
            aspect_ratio=aspect_ratio,
            motion_style=motion_style,
            caption_style=caption_style,
            caption_position=caption_position,
            show_caption=show_caption,
            show_watermark=show_watermark,
            watermark_position=watermark_position,
            watermark_opacity=watermark_opacity,
            background_music=background_music,
            music_volume=music_volume,
            scene_transition=scene_transition,
        )

        local_video_path = GENERATED_DIR / filename
        permanent_video_url = upload_video_to_firebase(local_video_path)

        return {
            "success": True,
            "message": "Multiple-image video generated and uploaded successfully.",
            "video_url": permanent_video_url,
            "image_count": len(upload_paths),
            "duration": min(duration, MAX_DURATION_SECONDS),
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Multiple-image generation failed: {exc}",
        )
    finally:
        for upload_path in upload_paths:
            cleanup_file(upload_path)
        if local_video_path is not None:
            cleanup_file(local_video_path)

