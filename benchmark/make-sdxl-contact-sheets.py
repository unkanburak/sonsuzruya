from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, random

root = Path('benchmark/sdxl-quality-ceiling/comfy-runtime-exclusive/output/sdxl_quality_ceiling')
dest = Path('benchmark/sdxl-quality-ceiling'); dest.mkdir(parents=True, exist_ok=True)
profiles = ['A','B','C','D']
font = ImageFont.load_default()
def files(profile, kind):
    return sorted((root/profile).glob(f'{kind}_*.png'))
def thumb(p, box=(250,150)):
    im=Image.open(p).convert('RGB'); im.thumbnail(box); return im
def sheet(kind, rows, out, labels=None):
    cellw, cellh=270,180; canvas=Image.new('RGB',(cellw*len(profiles),cellh*rows),'black'); d=ImageDraw.Draw(canvas)
    for i in range(rows):
        for c,p in enumerate(profiles):
            fs=files(p,kind)
            if i>=len(fs): continue
            im=thumb(fs[i]); x=c*cellw+(cellw-im.width)//2; y=i*cellh+4; canvas.paste(im,(x,y)); lab=(labels or {}).get((i,c), f'{p} {i+1}'); d.text((c*cellw+8,(i+1)*cellh-20),lab,fill='white',font=font)
    canvas.save(dest/out)
mapping={}
rng=random.Random(20260830)
for i in range(12):
    ids=['X1','X2','X3','X4']; rng.shuffle(ids); mapping[f'scene_{i+1:02d}']={p:ids[c] for c,p in enumerate(profiles)}
labels={(i,c):mapping[f'scene_{i+1:02d}'][p] for i in range(12) for c,p in enumerate(profiles)}
(dest/'BLIND_KEY.json').write_text(json.dumps(mapping,indent=2),encoding='utf-8')
sheet('scene',12,'BLIND_QUALITY_CONTACT_SHEET.png',labels)
for p in profiles:
    fs=files(p,'chain')
    if not fs: continue
    cellw,cellh=270,180; canvas=Image.new('RGB',(cellw,cellh*len(fs)),'black'); d=ImageDraw.Draw(canvas)
    for i,f in enumerate(fs):
        im=thumb(f); canvas.paste(im,((cellw-im.width)//2,i*cellh+4)); d.text((8,(i+1)*cellh-20),f'{p} chain {i+1}',fill='white',font=font)
    canvas.save(dest/f'CONTINUITY_{p}.png')
print('created',dest/'BLIND_QUALITY_CONTACT_SHEET.png')
