import gc
import os
import uuid
from pathlib import Path

from moviepy.editor import ImageClip
from PIL import Image, ImageDraw, ImageFont, ImageOps


BASE_DIR = Path(__file__).resolve().parent
GENERATED_DIR = BASE_DIR / "generated_videos"
UPLOADS_DIR = BASE_DIR / "uploads"

GENERATED_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# Safer defaults for low-memory Render instances
VIDEO_WIDTH = 854
VIDEO_HEIGHT = 480
FPS = 12
MAX_DURATION_SECONDS = 8
JPEG_QUALITY = 88


def get_font(size: int):
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


def wrap_text(draw, text: str, font, max_width: int) -> list[str]:
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


def sanitize_duration(duration: int) -> int:
    if duration < 1:
        return 1
    return min(duration, MAX_DURATION_SECONDS)


def cleanup_file(path: Path) -> None:
    try:
        if path.exists():
            path.unlink()
    except Exception:
        pass


def create_background() -> Image.Image:
    return Image.new("RGB", (VIDEO_WIDTH, VIDEO_HEIGHT), color=(0, 0, 0))


def draw_centered_multiline_text(
    image: Image.Image,
    prompt: str,
    language: str,
    watermark: str,
) -> Image.Image:
    draw = ImageDraw.Draw(image)

    title_font = get_font(42)
    sub_font = get_font(28)
    watermark_font = get_font(24)

    max_width = VIDEO_WIDTH - 120
    title_lines = wrap_text(draw, prompt, title_font, max_width)
    title_lines = title_lines[:5]

    line_heights = []
    total_title_height = 0

    for line in title_lines:
        bbox = draw.textbbox((0, 0), line, font=title_font)
        height = bbox[3] - bbox[1]
        line_heights.append(height)
        total_title_height += height + 10

    if title_lines:
        total_title_height -= 10

    sub_bbox = draw.textbbox((0, 0), language, font=sub_font)
    sub_height = sub_bbox[3] - sub_bbox[1]

    watermark_bbox = draw.textbbox((0, 0), watermark, font=watermark_font)
    watermark_height = watermark_bbox[3] - watermark_bbox[1]

    block_height = total_title_height + 28 + sub_height + 36 + watermark_height
    y = max((VIDEO_HEIGHT - block_height) // 2, 24)

    for index, line in enumerate(title_lines):
        bbox = draw.textbbox((0, 0), line, font=title_font)
        line_width = bbox[2] - bbox[0]
        x = (VIDEO_WIDTH - line_width) // 2
        draw.text((x, y), line, font=title_font, fill=(255, 255, 255))
        y += line_heights[index] + 10

    y += 18

    sub_width = sub_bbox[2] - sub_bbox[0]
    sub_x = (VIDEO_WIDTH - sub_width) // 2
    draw.text((sub_x, y), language, font=sub_font, fill=(220, 220, 220))

    y += sub_height + 28

    watermark_width = watermark_bbox[2] - watermark_bbox[0]
    watermark_x = (VIDEO_WIDTH - watermark_width) // 2
    draw.text((watermark_x, y), watermark, font=watermark_font, fill=(180, 180, 180))

    return image


def fit_image_to_canvas(source: Image.Image) -> Image.Image:
    source = ImageOps.exif_transpose(source).convert("RGB")
    source.thumbnail((VIDEO_WIDTH, VIDEO_HEIGHT), Image.LANCZOS)

    canvas = Image.new("RGB", (VIDEO_WIDTH, VIDEO_HEIGHT), color=(0, 0, 0))
    offset_x = (VIDEO_WIDTH - source.width) // 2
    offset_y = (VIDEO_HEIGHT - source.height) // 2
    canvas.paste(source, (offset_x, offset_y))

    return canvas


def overlay_bottom_text(
    image: Image.Image,
    prompt: str,
    language: str,
    watermark: str,
) -> Image.Image:
    draw = ImageDraw.Draw(image, "RGBA")

    panel_height = 120
    panel_y = VIDEO_HEIGHT - panel_height
    draw.rectangle(
        [(0, panel_y), (VIDEO_WIDTH, VIDEO_HEIGHT)],
        fill=(0, 0, 0, 165),
    )

    title_font = get_font(24)
    meta_font = get_font(18)
    watermark_font = get_font(18)

    max_width = VIDEO_WIDTH - 60
    lines = wrap_text(draw, prompt, title_font, max_width)
    lines = lines[:2]

    y = panel_y + 16
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=title_font)
        line_width = bbox[2] - bbox[0]
        x = (VIDEO_WIDTH - line_width) // 2
        draw.text((x, y), line, font=title_font, fill=(255, 255, 255, 255))
        y += 28

    meta = f"Language: {language}"
    meta_bbox = draw.textbbox((0, 0), meta, font=meta_font)
    meta_x = (VIDEO_WIDTH - (meta_bbox[2] - meta_bbox[0])) // 2
    draw.text((meta_x, y + 4), meta, font=meta_font, fill=(220, 220, 220, 255))

    watermark_bbox = draw.textbbox((0, 0), watermark, font=watermark_font)
    wm_x = VIDEO_WIDTH - (watermark_bbox[2] - watermark_bbox[0]) - 20
    wm_y = VIDEO_HEIGHT - 30
    draw.text((wm_x, wm_y), watermark, font=watermark_font, fill=(255, 255, 255, 210))

    return image


def save_frame_as_image(frame: Image.Image, suffix: str) -> Path:
    frame_path = GENERATED_DIR / f"{uuid.uuid4().hex}{suffix}"
    frame.save(frame_path, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    return frame_path


def save_video_from_frame(frame_path: Path, duration: int) -> str:
    duration = sanitize_duration(duration)
    filename = f"{uuid.uuid4().hex}.mp4"
    output_path = GENERATED_DIR / filename

    clip = None
    try:
        clip = ImageClip(str(frame_path)).set_duration(duration)
        clip.write_videofile(
            str(output_path),
            fps=FPS,
            codec="libx264",
            audio=False,
            preset="ultrafast",
            ffmpeg_params=["-pix_fmt", "yuv420p", "-movflags", "+faststart"],
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

        cleanup_file(frame_path)
        gc.collect()

    return filename


def generate_text_video(
    prompt: str,
    language: str,
    duration: int,
    watermark: str,
) -> str:
    image = create_background()
    image = draw_centered_multiline_text(image, prompt, language, watermark)

    try:
        frame_path = save_frame_as_image(image, "_frame.jpg")
    finally:
        try:
            image.close()
        except Exception:
            pass
        del image
        gc.collect()

    return save_video_from_frame(frame_path=frame_path, duration=duration)


def generate_image_video(
    image_path: str,
    prompt: str,
    language: str,
    duration: int,
    watermark: str,
) -> str:
    canvas = None

    try:
        with Image.open(image_path) as source:
            canvas = fit_image_to_canvas(source)
            canvas = overlay_bottom_text(canvas, prompt, language, watermark)
            frame_path = save_frame_as_image(canvas, "_image_frame.jpg")
    finally:
        if canvas is not None:
            try:
                canvas.close()
            except Exception:
                pass
            del canvas
        gc.collect()

    return save_video_from_frame(frame_path=frame_path, duration=duration)