import json, random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root=Path(__file__).resolve().parent
data=json.loads((root/'sdxl-quality-ceiling-results.json').read_text())
out=root/'sdxl-quality-ceiling'; out.mkdir(exist_ok=True)
font=ImageFont.load_default()
def load(rel,w=320,h=180):
    p=Path(rel)
    if not p.is_absolute(): p=Path.cwd()/p
    im=Image.open(p).convert('RGB'); im.thumbnail((w,h)); canvas=Image.new('RGB',(w,h),'black'); canvas.paste(im,((w-im.width)//2,(h-im.height)//2)); return canvas
random.seed(20260830); key={}; cols=4; cellw,cellh=340,215
sheet=Image.new('RGB',(cols*cellw,12*cellh),'#202020'); d=ImageDraw.Draw(sheet)
for i in range(12):
    entries=[]
    for profile in 'ABCD': entries.append((profile,data['quality'][profile][i]['path']))
    random.shuffle(entries)
    for j,(profile,path) in enumerate(entries):
        label=f'P{i+1}-{chr(65+j)}'; key[label]={'scene':i+1,'profile':profile,'path':path}
        im=load(path,320,180); x=j*cellw+10; y=i*cellh+28; sheet.paste(im,(x,y)); d.text((x,y-16),label,fill='white',font=font)
sheet.save(out/'BLIND_QUALITY_CONTACT_SHEET.png')
(out/'BLIND_KEY.json').write_text(json.dumps(key,indent=2))
for profile in 'ABCD':
    qsh=Image.new('RGB',(4*cellw,3*cellh),'#202020'); qd=ImageDraw.Draw(qsh)
    for i,row in enumerate(data['quality'][profile]):
        im=load(row['path'],320,180); x=(i%4)*cellw+10; y=(i//4)*cellh+28; qsh.paste(im,(x,y)); qd.text((x,y-16),f'{profile} {i+1}: {row["name"]}',fill='white',font=font)
    qsh.save(out/f'QUALITY_{profile}.png')
    sh=Image.new('RGB',(4*cellw,2*cellh),'#202020'); dd=ImageDraw.Draw(sh)
    for i,row in enumerate(data['continuity'][profile]):
        im=load(row['path'],320,180); x=(i%4)*cellw+10; y=(i//4)*cellh+28; sh.paste(im,(x,y)); dd.text((x,y-16),f'{profile} {i+1}: {row["state"]}',fill='white',font=font)
    sh.save(out/f'CONTINUITY_{profile}.png')
print(out/'BLIND_QUALITY_CONTACT_SHEET.png')
