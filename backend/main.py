import os
import uuid
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, field_validator
from PIL import Image, ImageDraw, ImageFont
from moviepy.editor import ImageClip


BASE_DIR = Path(__file__).resolve().parent
GENERATED_DIR = BASE_DIR / "generated_videos"
UPLOADS_DIR = BASE_DIR / "uploads"

GENERATED_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


app = FastAPI(
    title="NaijaVid AI Backend",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


VIDEO_WIDTH = 1280
VIDEO_HEIGHT = 720
FPS = 24


class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=3, max_length=500)
    language: str = Field(..., min_length=2, max_length=50)
    duration: int = Field(..., ge=1, le=30)
    watermark: str = Field(..., min_length=1, max_length=100)

    @field_validator("prompt", "language", "watermark")
    @classmethod
    def strip_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Field cannot be empty.")
        return value


def get_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    possible_fonts = [
        "arial.ttf",
        "Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    ]

    for font_path in possible_fonts:
        try:
            return ImageFont.truetype(font_path, size=size)
        except Exception:
            continue

    return ImageFont.load_default()


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, max_width: int) -> list[str]:
    words = text.split()
    if not words:
        return [""]

    lines: list[str] = []
    current = words[0]

    for word in words[1:]:
        trial = f"{current} {word}"
        bbox = draw.textbbox((0, 0), trial, font=font)
        width = bbox[2] - bbox[0]
        if width <= max_width:
            current = trial
        else:
            lines.append(current)
            current = word

    lines.append(current)
    return lines


def create_background() -> Image.Image:
    image = Image.new("RGB", (VIDEO_WIDTH, VIDEO_HEIGHT), color=(0, 0, 0))
    return image


def draw_centered_multiline_text(
    image: Image.Image,
    main_text: str,
    language: str,
    watermark: str,
) -> Image.Image:
    draw = ImageDraw.Draw(image)

    title_font = get_font(54)
    sub_font = get_font(42)
    watermark_font = get_font(34)

    max_width = VIDEO_WIDTH - 220
    title_lines = wrap_text(draw, main_text, title_font, max_width)

    line_heights: list[int] = []
    total_title_height = 0
    for line in title_lines:
        bbox = draw.textbbox((0, 0), line, font=title_font)
        h = bbox[3] - bbox[1]
        line_heights.append(h)
        total_title_height += h + 14
    if title_lines:
        total_title_height -= 14

    sub_bbox = draw.textbbox((0, 0), language, font=sub_font)
    sub_height = sub_bbox[3] - sub_bbox[1]

    watermark_bbox = draw.textbbox((0, 0), watermark, font=watermark_font)
    watermark_height = watermark_bbox[3] - watermark_bbox[1]

    block_height = total_title_height + 48 + sub_height + 52 + watermark_height
    y = (VIDEO_HEIGHT - block_height) // 2

    for idx, line in enumerate(title_lines):
        bbox = draw.textbbox((0, 0), line, font=title_font)
        line_width = bbox[2] - bbox[0]
        x = (VIDEO_WIDTH - line_width) // 2
        draw.text((x, y), line, font=title_font, fill=(255, 255, 255))
        y += line_heights[idx] + 14

    y += 34

    sub_width = sub_bbox[2] - sub_bbox[0]
    sub_x = (VIDEO_WIDTH - sub_width) // 2
    draw.text((sub_x, y), language, font=sub_font, fill=(255, 255, 255))

    y += sub_height + 46

    watermark_width = watermark_bbox[2] - watermark_bbox[0]
    watermark_x = (VIDEO_WIDTH - watermark_width) // 2
    draw.text((watermark_x, y), watermark, font=watermark_font, fill=(255, 255, 255))

    return image


def build_text_frame(prompt: str, language: str, watermark: str) -> Path:
    image = create_background()
    image = draw_centered_multiline_text(image, prompt, language, watermark)

    frame_path = GENERATED_DIR / f"{uuid.uuid4().hex}_frame.png"
    image.save(frame_path)
    return frame_path


def fit_image_to_canvas(source: Image.Image) -> Image.Image:
    canvas = Image.new("RGB", (VIDEO_WIDTH, VIDEO_HEIGHT), color=(0, 0, 0))
    source = source.convert("RGB")

    ratio = min(VIDEO_WIDTH / source.width, VIDEO_HEIGHT / source.height)
    new_w = int(source.width * ratio)
    new_h = int(source.height * ratio)

    resized = source.resize((new_w, new_h), Image.LANCZOS)

    offset_x = (VIDEO_WIDTH - new_w) // 2
    offset_y = (VIDEO_HEIGHT - new_h) // 2
    canvas.paste(resized, (offset_x, offset_y))
    return canvas


def overlay_bottom_text(
    image: Image.Image,
    prompt: str,
    language: str,
    watermark: str,
) -> Image.Image:
    draw = ImageDraw.Draw(image, "RGBA")

    panel_height = 190
    panel_y = VIDEO_HEIGHT - panel_height
    draw.rectangle(
        [(0, panel_y), (VIDEO_WIDTH, VIDEO_HEIGHT)],
        fill=(0, 0, 0, 165),
    )

    title_font = get_font(34)
    meta_font = get_font(26)
    watermark_font = get_font(28)

    max_width = VIDEO_WIDTH - 100
    lines = wrap_text(draw, prompt, title_font, max_width)
    lines = lines[:2]

    y = panel_y + 26
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=title_font)
        line_width = bbox[2] - bbox[0]
        x = (VIDEO_WIDTH - line_width) // 2
        draw.text((x, y), line, font=title_font, fill=(255, 255, 255, 255))
        y += 42

    meta = f"Language: {language}"
    meta_bbox = draw.textbbox((0, 0), meta, font=meta_font)
    meta_x = (VIDEO_WIDTH - (meta_bbox[2] - meta_bbox[0])) // 2
    draw.text((meta_x, y + 8), meta, font=meta_font, fill=(220, 220, 220, 255))

    watermark_bbox = draw.textbbox((0, 0), watermark, font=watermark_font)
    wm_x = VIDEO_WIDTH - (watermark_bbox[2] - watermark_bbox[0]) - 36
    wm_y = VIDEO_HEIGHT - 56
    draw.text((wm_x, wm_y), watermark, font=watermark_font, fill=(255, 255, 255, 210))

    return image


def save_video_from_frame(frame_path: Path, duration: int) -> str:
    filename = f"{uuid.uuid4().hex}.mp4"
    output_path = GENERATED_DIR / filename

    clip = ImageClip(str(frame_path)).set_duration(duration)
    clip.write_videofile(
        str(output_path),
        fps=FPS,
        codec="libx264",
        audio=False,
        verbose=False,
        logger=None,
    )
    clip.close()

    try:
        frame_path.unlink(missing_ok=True)
    except Exception:
        pass

    return filename


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
        frame_path = build_text_frame(
            prompt=data.prompt,
            language=data.language,
            watermark=data.watermark,
        )
        filename = save_video_from_frame(frame_path=frame_path, duration=data.duration)

        video_url = f"{str(request.base_url).rstrip('/')}/video/{filename}"

        return {
            "success": True,
            "message": "Video generated successfully.",
            "video_url": video_url,
        }
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
    try:
        prompt = prompt.strip()
        language = language.strip()
        watermark = watermark.strip()

        if not prompt:
            raise HTTPException(status_code=422, detail="Prompt is required.")
        if not language:
            raise HTTPException(status_code=422, detail="Language is required.")
        if not watermark:
            raise HTTPException(status_code=422, detail="Watermark is required.")
        if duration < 1 or duration > 30:
            raise HTTPException(status_code=422, detail="Duration must be between 1 and 30 seconds.")

        ext = Path(image.filename or "").suffix.lower()
        if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
            raise HTTPException(status_code=400, detail="Only JPG, JPEG, PNG, and WEBP images are supported.")

        upload_path = UPLOADS_DIR / f"{uuid.uuid4().hex}{ext}"
        contents = await image.read()
        upload_path.write_bytes(contents)

        source = Image.open(upload_path)
        canvas = fit_image_to_canvas(source)
        canvas = overlay_bottom_text(
            image=canvas,
            prompt=prompt,
            language=language,
            watermark=watermark,
        )

        frame_path = GENERATED_DIR / f"{uuid.uuid4().hex}_image_frame.png"
        canvas.save(frame_path)

        filename = save_video_from_frame(frame_path=frame_path, duration=duration)
        video_url = f"{str(request.base_url).rstrip('/')}/video/{filename}"

        try:
            upload_path.unlink(missing_ok=True)
        except Exception:
            pass

        return {
            "success": True,
            "message": "Video generated successfully from image.",
            "video_url": video_url,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Image-to-video generation failed: {exc}")


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