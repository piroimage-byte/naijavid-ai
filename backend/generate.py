import os
import uuid
from PIL import Image, ImageDraw, ImageFont
from moviepy import ImageClip

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, "generated")

os.makedirs(OUTPUT_DIR, exist_ok=True)


def safe_filename(ext=".mp4"):
    return f"{uuid.uuid4().hex}{ext}"


def build_frame(prompt: str, language: str = "English", watermark: str = "naijavid.ai"):
    width = 1280
    height = 720

    image = Image.new("RGB", (width, height), color=(18, 18, 24))
    draw = ImageDraw.Draw(image)

    try:
        title_font = ImageFont.truetype("arial.ttf", 48)
        body_font = ImageFont.truetype("arial.ttf", 30)
        mark_font = ImageFont.truetype("arial.ttf", 24)
    except Exception:
        title_font = ImageFont.load_default()
        body_font = ImageFont.load_default()
        mark_font = ImageFont.load_default()

    draw.text((60, 50), "NaijaVid AI", fill="white", font=title_font)
    draw.text((60, 120), f"Language: {language}", fill=(180, 220, 255), font=body_font)

    words = prompt.split()
    lines = []
    current = ""

    for word in words:
        test = f"{current} {word}".strip()
        if len(test) <= 50:
            current = test
        else:
            if current:
                lines.append(current)
            current = word

    if current:
        lines.append(current)

    y = 220
    for line in lines[:6]:
        draw.text((60, y), line, fill=(240, 240, 240), font=body_font)
        y += 50

    draw.rectangle([(0, height - 60), (width, height)], fill=(0, 0, 0))
    draw.text((40, height - 42), watermark, fill="white", font=mark_font)

    frame_path = os.path.join(OUTPUT_DIR, f"{uuid.uuid4().hex}.png")
    image.save(frame_path)
    return frame_path


def generate_video(prompt: str, duration: int = 5, language: str = "English", watermark: str = "naijavid.ai"):
    duration = max(3, min(int(duration), 10))

    frame_path = build_frame(prompt, language, watermark)
    output_name = safe_filename(".mp4")
    output_path = os.path.join(OUTPUT_DIR, output_name)

    clip = ImageClip(frame_path, duration=duration)
    clip.write_videofile(
        output_path,
        fps=24,
        codec="libx264",
        audio=False
    )

    try:
        if os.path.exists(frame_path):
            os.remove(frame_path)
    except Exception:
        pass

    return output_name