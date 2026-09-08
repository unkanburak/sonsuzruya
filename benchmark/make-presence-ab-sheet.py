from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent
base = root.parent / "runtime" / "comfy8188-output" / "protagonist_presence"
scenes = ["radio", "photograph", "tea", "outside_house", "watch_exchange", "machine"]
sheet = Image.new("RGB", (1100, len(scenes) * 190), (16, 18, 24))
draw = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype("segoeui.ttf", 17)
except Exception:
    font = ImageFont.load_default()
for i, scene in enumerate(scenes):
    y = i * 190
    draw.text((8, y + 4), scene, fill=(235, 238, 244), font=font)
    for j, profile in enumerate(["A_SOFT_LOCK", "B_GATED"]):
        matches = sorted(base.glob(f"**/{profile}/*_{scene}_*.png"))
        if not matches:
            continue
        image = Image.open(matches[-1]).convert("RGB")
        image.thumbnail((525, 158))
        x = j * 550 + (525 - image.width) // 2
        sheet.paste(image, (x, y + 27))
        draw.text((j * 550 + 8, y + 168), "A — CURRENT" if j == 0 else "B — GATED", fill=(180, 190, 205), font=font)
out = root / "PROTAGONIST_PRESENCE_AB_CONTACT_SHEET.png"
sheet.save(out, quality=95)
print(out)
