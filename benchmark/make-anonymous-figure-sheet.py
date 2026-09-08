from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent
src = root.parent / "runtime" / "comfy8188-output" / "anonymous_dream_figure"
names = ["object-only", "environmental", "lone-figure", "two-figure-interaction", "seated-partial", "exterior"]
sheet = Image.new("RGB", (900, len(names) * 175), (16, 18, 24))
draw = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype("segoeui.ttf", 17)
except Exception:
    font = ImageFont.load_default()
for i, name in enumerate(names):
    files = sorted(src.glob(f"*_{name}_*.png"))
    if not files:
        continue
    image = Image.open(files[-1]).convert("RGB")
    image.thumbnail((880, 140))
    x = (900 - image.width) // 2
    y = i * 175 + 25
    sheet.paste(image, (x, y))
    draw.text((8, i * 175 + 4), name, fill=(235, 238, 244), font=font)
out = root / "ANONYMOUS_DREAM_FIGURE_6_SCENES.png"
sheet.save(out, quality=95)
print(out)
