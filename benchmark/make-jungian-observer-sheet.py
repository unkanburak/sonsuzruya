from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json

root = Path(__file__).resolve().parent
folder = root / "jungian-observer-50"
trace = json.loads((folder / "trace.json").read_text(encoding="utf-8"))
rows = trace["rows"]
cols, tile_w, tile_h = 5, 256, 170
sheet = Image.new("RGB", (cols * tile_w, ((len(rows) + cols - 1) // cols) * tile_h), "#090b10")
draw = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype(r"C:\Windows\Fonts\segoeui.ttf", 12)
except OSError:
    font = ImageFont.load_default()
for index, row in enumerate(rows):
    image_path = folder / Path(row["output"]).name if row.get("output") else None
    if image_path and image_path.exists():
        image = Image.open(image_path).convert("RGB")
        image.thumbnail((tile_w - 8, tile_h - 30))
        x = (index % cols) * tile_w + (tile_w - image.width) // 2
        y = (index // cols) * tile_h + 3
        sheet.paste(image, (x, y))
    label = f"{row['turn']:02d}  {row.get('location') or '?'}"
    selected = str(row.get("selected") or "")
    draw.text(((index % cols) * tile_w + 4, (index // cols + 1) * tile_h - 34), label[:38], fill="white", font=font)
    draw.text(((index % cols) * tile_w + 4, (index // cols + 1) * tile_h - 19), selected[:37], fill="#b9d7ff", font=font)
sheet.save(root / "JUNGIAN_50_VISUAL_SEQUENCE.png")
sheet.save(root / "JUNGIAN_50_VISUAL_ANNOTATED.png")
print(f"saved {len(rows)} panels")
