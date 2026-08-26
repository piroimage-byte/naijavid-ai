import base64
import gc
import io
import os
import uuid
from pathlib import Path

import requests

# =========================================================
# PILLOW FIRST
# =========================================================

from PIL import (
    Image,
    ImageDraw,
    ImageFont,
    ImageOps,
)


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
# NIGERIAN LANGUAGE FOUNDATION
# =========================================================

SUPPORTED_LANGUAGES = {
    "English": {
        "code": "en",
        "label": "English",
    },

    "Yoruba": {
        "code": "yo",
        "label": "Yoruba",
    },

    "Igbo": {
        "code": "ig",
        "label": "Igbo",
    },

    "Hausa": {
        "code": "ha",
        "label": "Hausa",
    },

    "Nigerian Pidgin": {
        "code": "pcm",
        "label": "Nigerian Pidgin",
    },
}


def normalize_language(
    language: str,
) -> str:
    cleaned = (
        language or ""
    ).strip()

    if cleaned not in SUPPORTED_LANGUAGES:
        supported = ", ".join(
            SUPPORTED_LANGUAGES.keys()
        )

        raise ValueError(
            f"Unsupported language '{cleaned}'. "
            f"Supported languages: {supported}"
        )

    return cleaned


def get_language_code(
    language: str,
) -> str:
    normalized = normalize_language(
        language
    )

    return (
        SUPPORTED_LANGUAGES[
            normalized
        ]["code"]
    )


# =========================================================
# VISUAL GENERATION MODE
# =========================================================

# IMPORTANT:
#
# fallback = FREE development mode
# openai   = use paid OpenAI image generation
#
# Keep fallback while developing without API credits.

VISUAL_MODE = (
    os.getenv(
        "NAIJAVID_AI_VISUAL_MODE",
        "fallback",
    )
    .strip()
    .lower()
)

if VISUAL_MODE not in {
    "fallback",
    "openai",
}:
    VISUAL_MODE = "fallback"


# =========================================================
# OPENAI SETTINGS
# =========================================================

OPENAI_API_KEY = (
    os.getenv(
        "OPENAI_API_KEY",
        "",
    )
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

    words = (
        text or ""
    ).split()

    if not words:
        return [""]

    lines: list[str] = []

    current = words[0]

    for word in words[1:]:
        trial = (
            f"{current} {word}"
        )

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
# AI VISUAL PROMPT
# =========================================================

def build_visual_prompt(
    prompt: str,
    language: str,
) -> str:

    cleaned_prompt = (
        prompt or ""
    ).strip()

    if not cleaned_prompt:
        raise ValueError(
            "Prompt is required."
        )

    normalized_language = (
        normalize_language(
            language
        )
    )

    language_code = (
        get_language_code(
            normalized_language
        )
    )

    nigeria_context = """
Create a cinematic, photorealistic video keyframe.

When people are appropriate, use realistic African people.

When the location or context is Nigerian, preserve authentic Nigerian:
architecture,
streets,
markets,
transport,
clothing,
landscape,
weather,
skin tones,
culture,
business environment,
and atmosphere.

Use realistic proportions, natural lighting, accurate hands and faces,
cinematic depth, professional composition and landscape framing.

Do not place captions, subtitles, logos or watermarks inside the image.
""".strip()

    return (
        f"{nigeria_context}\n\n"
        f"User scene:\n"
        f"{cleaned_prompt}\n\n"
        f"Language context: "
        f"{normalized_language}\n"
        f"Language code: "
        f"{language_code}"
    )


# =========================================================
# PAID OPENAI IMAGE GENERATION
# =========================================================

def generate_openai_image(
    prompt: str,
    language: str,
) -> Path:

    if not OPENAI_API_KEY:
        raise RuntimeError(
            "OPENAI_API_KEY is missing."
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
                .get(
                    "error",
                    {},
                )
                .get(
                    "message",
                    response.text,
                )
            )

        except Exception:
            message = response.text

        raise RuntimeError(
            f"AI image generation failed: {message}"
        )

    data = (
        response.json()
    )

    items = (
        data.get(
            "data"
        )
        or []
    )

    if not items:
        raise RuntimeError(
            "AI provider returned no image."
        )

    item = items[0]

    image_bytes = None

    if item.get(
        "b64_json"
    ):

        image_bytes = (
            base64.b64decode(
                item[
                    "b64_json"
                ]
            )
        )

    elif item.get(
        "url"
    ):

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
# FREE DEVELOPMENT VISUAL
# =========================================================

def generate_fallback_visual(
    prompt: str,
    language: str,
) -> Path:

    normalized_language = (
        normalize_language(
            language
        )
    )

    language_code = (
        get_language_code(
            normalized_language
        )
    )

    cleaned_prompt = (
        prompt or ""
    ).strip()

    if not cleaned_prompt:
        raise ValueError(
            "Prompt is required."
        )

    # -----------------------------------------------------
    # GRADIENT BACKGROUND
    # -----------------------------------------------------

    image = Image.new(
        "RGB",
        (
            VIDEO_WIDTH,
            VIDEO_HEIGHT,
        ),
        (
            10,
            16,
            32,
        ),
    )

    draw = ImageDraw.Draw(
        image,
        "RGBA",
    )

    # Soft vertical gradient
    for y in range(
        VIDEO_HEIGHT
    ):

        progress = (
            y
            / VIDEO_HEIGHT
        )

        r = int(
            10
            + 24 * progress
        )

        g = int(
            16
            + 30 * progress
        )

        b = int(
            32
            + 58 * progress
        )

        draw.line(
            [
                (
                    0,
                    y,
                ),
                (
                    VIDEO_WIDTH,
                    y,
                ),
            ],
            fill=(
                r,
                g,
                b,
                255,
            ),
        )

    # -----------------------------------------------------
    # DECORATIVE SHAPES
    # -----------------------------------------------------

    draw.ellipse(
        (
            -120,
            -100,
            330,
            350,
        ),
        fill=(
            20,
            120,
            90,
            70,
        ),
    )

    draw.ellipse(
        (
            580,
            180,
            980,
            580,
        ),
        fill=(
            180,
            80,
            20,
            60,
        ),
    )

    # -----------------------------------------------------
    # TITLE
    # -----------------------------------------------------

    brand_font = get_font(
        28
    )

    prompt_font = get_font(
        34
    )

    meta_font = get_font(
        20
    )

    draw.text(
        (
            42,
            36,
        ),
        "NaijaVid AI",
        font=brand_font,
        fill=(
            255,
            255,
            255,
            235,
        ),
    )

    # -----------------------------------------------------
    # PROMPT
    # -----------------------------------------------------

    lines = wrap_text(
        draw,
        cleaned_prompt,
        prompt_font,
        VIDEO_WIDTH - 110,
    )[:5]

    y = 130

    for line in lines:

        draw.text(
            (
                55,
                y,
            ),
            line,
            font=prompt_font,
            fill=(
                255,
                255,
                255,
                255,
            ),
        )

        y += 48

    # -----------------------------------------------------
    # LANGUAGE BADGE
    # -----------------------------------------------------

    badge_text = (
        f"{normalized_language} "
        f"({language_code})"
    )

    badge_bbox = (
        draw.textbbox(
            (0, 0),
            badge_text,
            font=meta_font,
        )
    )

    badge_width = (
        badge_bbox[2]
        - badge_bbox[0]
    )

    badge_height = (
        badge_bbox[3]
        - badge_bbox[1]
    )

    badge_x = 55
    badge_y = VIDEO_HEIGHT - 75

    draw.rounded_rectangle(
        (
            badge_x - 12,
            badge_y - 8,
            badge_x
            + badge_width
            + 12,
            badge_y
            + badge_height
            + 8,
        ),
        radius=10,
        fill=(
            0,
            0,
            0,
            120,
        ),
    )

    draw.text(
        (
            badge_x,
            badge_y,
        ),
        badge_text,
        font=meta_font,
        fill=(
            255,
            255,
            255,
            230,
        ),
    )

    output_path = (
        GENERATED_DIR
        / new_filename(
            "_fallback_scene.jpg"
        )
    )

    image.save(
        output_path,
        format="JPEG",
        quality=92,
        optimize=True,
    )

    image.close()

    return output_path


# =========================================================
# VISUAL PROVIDER ROUTER
# =========================================================

def generate_visual(
    prompt: str,
    language: str,
) -> Path:

    normalize_language(
        language
    )

    if (
        VISUAL_MODE
        == "openai"
    ):

        return generate_openai_image(
            prompt=prompt,
            language=language,
        )

    # Default: free development mode
    return generate_fallback_visual(
        prompt=prompt,
        language=language,
    )


# =========================================================
# FIT IMAGE TO VIDEO CANVAS
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

    return source.crop(
        (
            left,
            top,
            left
            + VIDEO_WIDTH,
            top
            + VIDEO_HEIGHT,
        )
    )


# =========================================================
# WATERMARK
# =========================================================

def apply_watermark(
    image: Image.Image,
    watermark: str,
) -> Image.Image:

    text = (
        watermark or ""
    ).strip()

    if not text:
        return image

    draw = ImageDraw.Draw(
        image,
        "RGBA",
    )

    font = get_font(
        18
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

    x = (
        VIDEO_WIDTH
        - text_width
        - 32
    )

    y = (
        VIDEO_HEIGHT
        - text_height
        - 28
    )

    draw.rounded_rectangle(
        (
            x - 10,
            y - 7,
            x
            + text_width
            + 10,
            y
            + text_height
            + 7,
        ),
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
# LANGUAGE BADGE
# =========================================================

def apply_language_badge(
    image: Image.Image,
    language: str,
) -> Image.Image:

    normalized_language = (
        normalize_language(
            language
        )
    )

    code = (
        get_language_code(
            normalized_language
        )
    )

    text = (
        f"{normalized_language} "
        f"• {code}"
    )

    draw = ImageDraw.Draw(
        image,
        "RGBA",
    )

    font = get_font(
        18
    )

    bbox = draw.textbbox(
        (0, 0),
        text,
        font=font,
    )

    width = (
        bbox[2]
        - bbox[0]
    )

    height = (
        bbox[3]
        - bbox[1]
    )

    x = 20
    y = 20

    draw.rounded_rectangle(
        (
            x,
            y,
            x + width + 24,
            y + height + 16,
        ),
        radius=8,
        fill=(
            0,
            0,
            0,
            130,
        ),
    )

    draw.text(
        (
            x + 12,
            y + 8,
        ),
        text,
        font=font,
        fill=(
            255,
            255,
            255,
            230,
        ),
    )

    return image


# =========================================================
# CAPTION
# =========================================================

def apply_caption(
    image: Image.Image,
    prompt: str,
) -> Image.Image:

    cleaned = (
        prompt or ""
    ).strip()

    if not cleaned:
        return image

    draw = ImageDraw.Draw(
        image,
        "RGBA",
    )

    font = get_font(
        22
    )

    lines = wrap_text(
        draw,
        cleaned,
        font,
        VIDEO_WIDTH - 80,
    )[:2]

    if not lines:
        return image

    line_height = 29

    panel_height = (
        35
        + (
            len(lines)
            * line_height
        )
        + 18
    )

    panel_top = (
        VIDEO_HEIGHT
        - panel_height
    )

    draw.rectangle(
        (
            0,
            panel_top,
            VIDEO_WIDTH,
            VIDEO_HEIGHT,
        ),
        fill=(
            0,
            0,
            0,
            110,
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
# CINEMATIC VIDEO
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

        # Subtle cinematic zoom
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
                    0.055
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
            "Video file was not created."
        )

    return filename


# =========================================================
# TEXT TO VIDEO
# =========================================================

def generate_text_video(
    prompt: str,
    language: str,
    duration: int,
    watermark: str,
) -> str:

    language = (
        normalize_language(
            language
        )
    )

    visual_path = None
    frame_path = None
    canvas = None

    try:

        # -------------------------------------------------
        # Generate visual
        # -------------------------------------------------

        visual_path = (
            generate_visual(
                prompt=prompt,
                language=language,
            )
        )

        # -------------------------------------------------
        # Fit to video frame
        # -------------------------------------------------

        with Image.open(
            visual_path
        ) as source:

            canvas = (
                fit_image_to_canvas(
                    source
                )
            )

        # -------------------------------------------------
        # Add language information
        # -------------------------------------------------

        canvas = (
            apply_language_badge(
                canvas,
                language,
            )
        )

        # -------------------------------------------------
        # Watermark
        # -------------------------------------------------

        canvas = (
            apply_watermark(
                canvas,
                watermark,
            )
        )

        # -------------------------------------------------
        # Development fallback shows prompt
        # -------------------------------------------------

        if (
            VISUAL_MODE
            == "fallback"
        ):

            canvas = (
                apply_caption(
                    canvas,
                    prompt,
                )
            )

        frame_path = (
            save_frame_as_image(
                canvas,
                "_text_video_frame.jpg",
            )
        )

    finally:

        if canvas is not None:

            try:
                canvas.close()

            except Exception:
                pass

        cleanup_file(
            visual_path
        )

        gc.collect()

    if frame_path is None:

        raise RuntimeError(
            "Unable to prepare text video."
        )

    return save_cinematic_video(
        frame_path=frame_path,
        duration=duration,
    )


# =========================================================
# IMAGE TO VIDEO
# =========================================================

def generate_image_video(
    image_path: str,
    prompt: str,
    language: str,
    duration: int,
    watermark: str,
) -> str:

    language = (
        normalize_language(
            language
        )
    )

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
        # Language indicator
        # -------------------------------------------------

        canvas = (
            apply_language_badge(
                canvas,
                language,
            )
        )

        # -------------------------------------------------
        # Caption
        # -------------------------------------------------

        if (
            prompt.strip()
        ):

            canvas = (
                apply_caption(
                    canvas,
                    prompt,
                )
            )

        # -------------------------------------------------
        # Watermark
        # -------------------------------------------------

        canvas = (
            apply_watermark(
                canvas,
                watermark,
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

    return save_cinematic_video(
        frame_path=frame_path,
        duration=duration,
    )