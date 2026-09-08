import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root=Path(__file__).resolve().parent
data=json.loads((root/'profile-c-continuity-results.json').read_text())
out=root/'profile-c-continuity'; out.mkdir(exist_ok=True)
font=ImageFont.load_default(); W,H=340,215
def load(p):
 im=Image.open(p).convert('RGB'); im.thumbnail((320,180)); c=Image.new('RGB',(320,180),'black'); c.paste(im,((320-im.width)//2,(180-im.height)//2)); return c
for k,m in data['methods'].items():
 sh=Image.new('RGB',(4*W,2*H),'#202020'); d=ImageDraw.Draw(sh)
 for i,row in enumerate(m['rows']):
  c=load(row['output']['path']); x=(i%4)*W+10; y=(i//4)*H+28; sh.paste(c,(x,y)); d.text((x,y-16),f'{k} {i+1}',fill='white',font=font)
 sh.save(out/f'{k.upper()}.png')
print(out)
