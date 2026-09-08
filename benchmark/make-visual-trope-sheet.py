from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent
src = root / "visual-trope-repetition" / "real-scenes"
manifest = root / "visual-trope-repetition" / "real-scenes.json"
if manifest.exists():
    rows_manifest = json.loads(manifest.read_text(encoding="utf-8"))
    files = [root.parent / row["file"] for row in rows_manifest if row.get("file")]
else:
    files = sorted(src.glob("turn_*.png"))
if not files:
    raise SystemExit("no real scene images")
thumb_w, thumb_h = 320, 180
cols = 3
rows = (len(files) + cols - 1) // cols
sheet = Image.new("RGB", (cols * thumb_w, rows * (thumb_h + 28)), (16, 18, 24))
draw = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype("segoeui.ttf", 16)
except Exception:
    font = ImageFont.load_default()
for i, path in enumerate(files):
    image = Image.open(path).convert("RGB")
    image.thumbnail((thumb_w - 8, thumb_h - 8))
    x = (i % cols) * thumb_w + (thumb_w - image.width) // 2
    y = (i // cols) * (thumb_h + 28) + (thumb_h - image.height) // 2
    sheet.paste(image, (x, y))
    draw.text(((i % cols) * thumb_w + 8, (i // cols) * (thumb_h + 28) + thumb_h + 4), path.stem, fill=(235, 238, 244), font=font)
out = root / "VISUAL_TROPE_15_SCENE_CONTACT_SHEET.png"
sheet.save(out, quality=95)
print(out)
