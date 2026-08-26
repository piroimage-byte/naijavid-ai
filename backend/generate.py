import base64
import gc
import io
import os
import uuid
from pathlib import Path

import requests
import numpy as np

# =========================================================
# PILLOW FIRST
# =========================================================

from PIL import Image, ImageDraw, ImageFont, ImageOps


# =========================================================
# PILLOW / MOVIEPY COMPATIBILITY
# =========================================================

if not hasattr(Image, "ANTIALIAS"):
    if hasattr(Image, "Resampling"):
        Image.ANTIALIAS = Image.Resampling.LANCZOS
    else:
        Image.ANTIALIAS = Image.LANCZOS

if hasattr(Image, "Resampling"):
    RESAMPLE_LANCZOS = Image.Resampling.LANCZOS
else:
    RESAMPLE_LANCZOS = Image.LANCZOS


# =========================================================
# MOVIEPY
# =========================================================

from moviepy.editor import (
    ImageClip,
    CompositeVideoClip,
)


# =========================================================
# PATHS
# =========================================================

BASE_DIR = Path(__file__).resolve().parent

GENERATED_DIR = BASE_DIR / "generated"
UPLOADS_DIR = BASE_DIR / "uploads"

GENERATED_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

UPLOADS_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


# =========================================================
# VIDEO SETTINGS
# =========================================================

VIDEO_WIDTH = 854
VIDEO_HEIGHT = 480

FPS = 12

MAX_DURATION_SECONDS = 8

JPEG_QUALITY = 88


# =========================================================
# OPENAI IMAGE SETTINGS
# =========================================================

OPENAI_API_KEY = (
    os.getenv("OPENAI_API_KEY", "")
    .strip()
)

OPENAI_IMAGE_MODEL = (
    os.getenv(
        "OPENAI_IMAGE_MODEL",
        "gpt-image-1-mini",
    )
    .strip()
)

OPENAI_IMAGE_ENDPOINT = (
    "https://api.openai.com/v1/images/generations"
)


# =========================================================
# FONT
# =========================================================

def get_font(
    size: int,
):
    possible_fonts = [
        "arial.ttf",
        "Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    ]

    for font_path in possible_fonts:
        try:
            return ImageFont.truetype(
                font_path,
                size=size,
            )
        except Exception:
            continue

    return ImageFont.load_default()


# =========================================================
# TEXT WRAPPING
# =========================================================

def wrap_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    font,
    max_width: int,
) -> list[str]:
    words = text.split()

    if not words:
        return [""]

    lines: list[str] = []
    current = words[0]

    for word in words[1:]:
        trial = f"{current} {word}"

        bbox = draw.textbbox(
            (0, 0),
            trial,
            font=font,
        )

        width = (
            bbox[2]
            - bbox[0]
        )

        if width <= max_width:
            current = trial
        else:
            lines.append(
                current
            )
            current = word

    lines.append(
        current
    )

    return lines


# =========================================================
# DURATION
# =========================================================

def sanitize_duration(
    duration: int,
) -> int:
    try:
        duration = int(
            duration
        )
    except Exception:
        duration = 5

    if duration < 1:
        return 1

    return min(
        duration,
        MAX_DURATION_SECONDS,
    )


# =========================================================
# CLEANUP
# =========================================================

def cleanup_file(
    path: Path | None,
) -> None:
    if path is None:
        return

    try:
        if path.exists():
            path.unlink()
    except Exception:
        pass


# =========================================================
# SAFE FILENAME
# =========================================================

def new_filename(
    suffix: str,
) -> str:
    return (
        f"{uuid.uuid4().hex}"
        f"{suffix}"
    )


# =========================================================
# PROMPT ENHANCEMENT
# =========================================================

def build_visual_prompt(
    prompt: str,
    language: str,
) -> str:
    cleaned_prompt = (
        prompt.strip()
    )

    if not cleaned_prompt:
        raise ValueError(
            "Prompt is required."
        )

    nigeria_context = """
Create a cinematic, photorealistic video keyframe based on the user's scene.
Use realistic African people where people are appropriate.
When the location or cultural context is Nigerian, preserve authentic Nigerian
architecture, clothing, streets, transport, markets, environment and atmosphere.
Do not place captions, logos, watermarks, subtitles or written text inside the image.
Use natural lighting, realistic proportions, accurate hands and faces, detailed
cinematography, believable depth, professional composition, and a landscape frame
suitable for a short film.
""".strip()

    return (
        f"{nigeria_context}\n\n"
        f"User scene:\n"
        f"{cleaned_prompt}\n\n"
        f"Requested language context: "
        f"{language}"
    )


# =========================================================
# OPENAI IMAGE GENERATION
# =========================================================

def generate_ai_image(
    prompt: str,
    language: str,
) -> Path:
    if not OPENAI_API_KEY:
        raise RuntimeError(
            "OPENAI_API_KEY is missing on the Render backend."
        )

    visual_prompt = (
        build_visual_prompt(
            prompt=prompt,
            language=language,
        )
    )

    payload = {
        "model":
            OPENAI_IMAGE_MODEL,

        "prompt":
            visual_prompt,

        "size":
            "1536x1024",

        "quality":
            "low",

        "n":
            1,
    }

    headers = {
        "Authorization":
            f"Bearer {OPENAI_API_KEY}",

        "Content-Type":
            "application/json",
    }

    try:
        response = requests.post(
            OPENAI_IMAGE_ENDPOINT,
            headers=headers,
            json=payload,
            timeout=180,
        )

    except requests.RequestException as exc:
        raise RuntimeError(
            f"AI image request failed: {exc}"
        ) from exc

    if not response.ok:
        try:
            error_data = (
                response.json()
            )

            message = (
                error_data
                .get("error", {})
                .get(
                    "message",
                    response.text,
                )
            )

        except Exception:
            message = (
                response.text
            )

        raise RuntimeError(
            "AI image generation failed: "
            f"{message}"
        )

    try:
        data = (
            response.json()
        )

        items = (
            data.get("data")
            or []
        )

        if not items:
            raise RuntimeError(
                "AI provider returned no image."
            )

        item = items[0]

    except Exception as exc:
        raise RuntimeError(
            "Unable to read AI image response."
        ) from exc

    # -----------------------------------------------------
    # BASE64 IMAGE RESPONSE
    # -----------------------------------------------------

    image_bytes = None

    if item.get(
        "b64_json"
    ):
        try:
            image_bytes = (
                base64.b64decode(
                    item[
                        "b64_json"
                    ]
                )
            )
        except Exception as exc:
            raise RuntimeError(
                "Unable to decode AI image."
            ) from exc

    # -----------------------------------------------------
    # URL IMAGE RESPONSE
    # -----------------------------------------------------

    elif item.get(
        "url"
    ):
        try:
            image_response = (
                requests.get(
                    item["url"],
                    timeout=120,
                )
            )

            image_response.raise_for_status()

            image_bytes = (
                image_response.content
            )

        except requests.RequestException as exc:
            raise RuntimeError(
                "Unable to download AI image."
            ) from exc

    else:
        raise RuntimeError(
            "AI provider did not return image data."
        )

    output_path = (
        GENERATED_DIR
        / new_filename(
            "_ai_scene.jpg"
        )
    )

    try:
        with Image.open(
            io.BytesIO(
                image_bytes
            )
        ) as generated:
            generated = (
                ImageOps
                .exif_transpose(
                    generated
                )
                .convert(
                    "RGB"
                )
            )

            generated.save(
                output_path,
                format="JPEG",
                quality=92,
                optimize=True,
            )

    except Exception as exc:
        cleanup_file(
            output_path
        )

        raise RuntimeError(
            "Generated AI image could not be processed."
        ) from exc

    return output_path


# =========================================================
# IMAGE FIT
# =========================================================

def fit_image_to_canvas(
    source: Image.Image,
) -> Image.Image:
    source = (
        ImageOps
        .exif_transpose(
            source
        )
        .convert(
            "RGB"
        )
    )

    source_ratio = (
        source.width
        / source.height
    )

    target_ratio = (
        VIDEO_WIDTH
        / VIDEO_HEIGHT
    )

    # -----------------------------------------------------
    # COVER FRAME
    # -----------------------------------------------------

    if (
        source_ratio
        > target_ratio
    ):
        new_height = (
            VIDEO_HEIGHT
        )

        new_width = int(
            new_height
            * source_ratio
        )

    else:
        new_width = (
            VIDEO_WIDTH
        )

        new_height = int(
            new_width
            / source_ratio
        )

    source = source.resize(
        (
            new_width,
            new_height,
        ),
        RESAMPLE_LANCZOS,
    )

    left = max(
        (
            new_width
            - VIDEO_WIDTH
        )
        // 2,
        0,
    )

    top = max(
        (
            new_height
            - VIDEO_HEIGHT
        )
        // 2,
        0,
    )

    right = (
        left
        + VIDEO_WIDTH
    )

    bottom = (
        top
        + VIDEO_HEIGHT
    )

    return source.crop(
        (
            left,
            top,
            right,
            bottom,
        )
    )


# =========================================================
# WATERMARK
# =========================================================

def apply_watermark(
    image: Image.Image,
    watermark: str,
) -> Image.Image:
    if not watermark.strip():
        return image

    draw = ImageDraw.Draw(
        image,
        "RGBA",
    )

    font = get_font(
        18
    )

    text = (
        watermark.strip()
    )

    bbox = draw.textbbox(
        (0, 0),
        text,
        font=font,
    )

    text_width = (
        bbox[2]
        - bbox[0]
    )

    text_height = (
        bbox[3]
        - bbox[1]
    )

    padding_x = 12
    padding_y = 8

    x = (
        VIDEO_WIDTH
        - text_width
        - padding_x
        - 18
    )

    y = (
        VIDEO_HEIGHT
        - text_height
        - padding_y
        - 18
    )

    draw.rounded_rectangle(
        [
            (
                x - padding_x,
                y - padding_y,
            ),
            (
                x
                + text_width
                + padding_x,
                y
                + text_height
                + padding_y,
            ),
        ],
        radius=8,
        fill=(
            0,
            0,
            0,
            120,
        ),
    )

    draw.text(
        (
            x,
            y,
        ),
        text,
        font=font,
        fill=(
            255,
            255,
            255,
            220,
        ),
    )

    return image


# =========================================================
# OPTIONAL CAPTION
# =========================================================

def apply_caption(
    image: Image.Image,
    prompt: str,
) -> Image.Image:
    cleaned = (
        prompt.strip()
    )

    if not cleaned:
        return image

    draw = ImageDraw.Draw(
        image,
        "RGBA",
    )

    font = get_font(
        22
    )

    max_width = (
        VIDEO_WIDTH
        - 80
    )

    lines = wrap_text(
        draw,
        cleaned,
        font,
        max_width,
    )[:2]

    if not lines:
        return image

    line_height = 28

    panel_height = (
        28
        + (
            len(lines)
            * line_height
        )
        + 20
    )

    panel_top = (
        VIDEO_HEIGHT
        - panel_height
    )

    draw.rectangle(
        [
            (
                0,
                panel_top,
            ),
            (
                VIDEO_WIDTH,
                VIDEO_HEIGHT,
            ),
        ],
        fill=(
            0,
            0,
            0,
            115,
        ),
    )

    y = (
        panel_top
        + 18
    )

    for line in lines:
        bbox = draw.textbbox(
            (0, 0),
            line,
            font=font,
        )

        width = (
            bbox[2]
            - bbox[0]
        )

        x = (
            VIDEO_WIDTH
            - width
        ) // 2

        draw.text(
            (
                x,
                y,
            ),
            line,
            font=font,
            fill=(
                255,
                255,
                255,
                240,
            ),
        )

        y += (
            line_height
        )

    return image


# =========================================================
# SAVE FRAME
# =========================================================

def save_frame_as_image(
    frame: Image.Image,
    suffix: str,
) -> Path:
    frame_path = (
        GENERATED_DIR
        / new_filename(
            suffix
        )
    )

    frame.save(
        frame_path,
        format="JPEG",
        quality=JPEG_QUALITY,
        optimize=True,
    )

    return frame_path


# =========================================================
# STATIC IMAGE VIDEO
# =========================================================

def save_video_from_frame(
    frame_path: Path,
    duration: int,
) -> str:
    duration = (
        sanitize_duration(
            duration
        )
    )

    filename = (
        new_filename(
            ".mp4"
        )
    )

    output_path = (
        GENERATED_DIR
        / filename
    )

    clip = None

    try:
        clip = (
            ImageClip(
                str(
                    frame_path
                )
            )
            .set_duration(
                duration
            )
        )

        clip.write_videofile(
            str(
                output_path
            ),
            fps=FPS,
            codec="libx264",
            audio=False,
            preset="ultrafast",
            ffmpeg_params=[
                "-pix_fmt",
                "yuv420p",
                "-movflags",
                "+faststart",
            ],
            threads=1,
            verbose=False,
            logger=None,
        )

    finally:
        if clip is not None:
            try:
                clip.close()
            except Exception:
                pass

            del clip

        cleanup_file(
            frame_path
        )

        gc.collect()

    if not output_path.exists():
        raise RuntimeError(
            "Video file was not created."
        )

    return filename


# =========================================================
# CINEMATIC AI IMAGE VIDEO
# =========================================================

def save_cinematic_video(
    frame_path: Path,
    duration: int,
) -> str:
    duration = (
        sanitize_duration(
            duration
        )
    )

    filename = (
        new_filename(
            ".mp4"
        )
    )

    output_path = (
        GENERATED_DIR
        / filename
    )

    base_clip = None
    moving_clip = None
    final_clip = None

    try:
        base_clip = (
            ImageClip(
                str(
                    frame_path
                )
            )
            .set_duration(
                duration
            )
        )

        # -------------------------------------------------
        # SUBTLE KEN BURNS ZOOM
        # -------------------------------------------------

        def zoom_factor(
            t
        ):
            progress = (
                t
                / max(
                    duration,
                    1,
                )
            )

            return (
                1.0
                + (
                    0.06
                    * progress
                )
            )

        moving_clip = (
            base_clip
            .resize(
                zoom_factor
            )
            .set_position(
                "center"
            )
        )

        final_clip = (
            CompositeVideoClip(
                [
                    moving_clip
                ],
                size=(
                    VIDEO_WIDTH,
                    VIDEO_HEIGHT,
                ),
            )
            .set_duration(
                duration
            )
        )

        final_clip.write_videofile(
            str(
                output_path
            ),
            fps=FPS,
            codec="libx264",
            audio=False,
            preset="ultrafast",
            ffmpeg_params=[
                "-pix_fmt",
                "yuv420p",
                "-movflags",
                "+faststart",
            ],
            threads=1,
            verbose=False,
            logger=None,
        )

    finally:
        for clip in [
            final_clip,
            moving_clip,
            base_clip,
        ]:
            if clip is not None:
                try:
                    clip.close()
                except Exception:
                    pass

        cleanup_file(
            frame_path
        )

        gc.collect()

    if not output_path.exists():
        raise RuntimeError(
            "AI video file was not created."
        )

    return filename


# =========================================================
# TEXT TO AI VISUAL VIDEO
# =========================================================

def generate_text_video(
    prompt: str,
    language: str,
    duration: int,
    watermark: str,
) -> str:
    ai_image_path = None
    frame_path = None
    canvas = None

    try:
        # -------------------------------------------------
        # 1. GENERATE ACTUAL VISUAL FROM PROMPT
        # -------------------------------------------------

        ai_image_path = (
            generate_ai_image(
                prompt=prompt,
                language=language,
            )
        )

        # -------------------------------------------------
        # 2. FIT GENERATED VISUAL INTO VIDEO FRAME
        # -------------------------------------------------

        with Image.open(
            ai_image_path
        ) as source:
            canvas = (
                fit_image_to_canvas(
                    source
                )
            )

        # -------------------------------------------------
        # 3. WATERMARK ONLY
        # -------------------------------------------------

        canvas = (
            apply_watermark(
                canvas,
                watermark,
            )
        )

        # Uncomment this if you want the prompt displayed
        # at the bottom of generated videos.
        #
        # canvas = apply_caption(
        #     canvas,
        #     prompt,
        # )

        frame_path = (
            save_frame_as_image(
                canvas,
                "_ai_video_frame.jpg",
            )
        )

    finally:
        if canvas is not None:
            try:
                canvas.close()
            except Exception:
                pass

        cleanup_file(
            ai_image_path
        )

        gc.collect()

    if frame_path is None:
        raise RuntimeError(
            "Unable to prepare AI-generated scene."
        )

    # -----------------------------------------------------
    # 4. TURN IMAGE INTO CINEMATIC MOVING VIDEO
    # -----------------------------------------------------

    return (
        save_cinematic_video(
            frame_path=frame_path,
            duration=duration,
        )
    )


# =========================================================
# USER IMAGE TO VIDEO
# =========================================================

def generate_image_video(
    image_path: str,
    prompt: str,
    language: str,
    duration: int,
    watermark: str,
) -> str:
    canvas = None
    frame_path = None

    try:
        with Image.open(
            image_path
        ) as source:
            canvas = (
                fit_image_to_canvas(
                    source
                )
            )

        # -------------------------------------------------
        # WATERMARK
        # -------------------------------------------------

        canvas = (
            apply_watermark(
                canvas,
                watermark,
            )
        )

        # -------------------------------------------------
        # OPTIONAL CAPTION
        # -------------------------------------------------

        if prompt.strip():
            canvas = (
                apply_caption(
                    canvas,
                    prompt,
                )
            )

        frame_path = (
            save_frame_as_image(
                canvas,
                "_image_video_frame.jpg",
            )
        )

    finally:
        if canvas is not None:
            try:
                canvas.close()
            except Exception:
                pass

        gc.collect()

    if frame_path is None:
        raise RuntimeError(
            "Unable to create image video frame."
        )

    return (
        save_cinematic_video(
            frame_path=frame_path,
            duration=duration,
        )
    )