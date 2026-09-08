from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, random

base=Path('benchmark/sdxl-quality-ceiling/comfy-runtime-exclusive/output/sdxl_quality_ceiling')
out=Path('benchmark'); font=ImageFont.load_default(); rng=random.Random(20260830)
data=json.loads(Path('benchmark/sdxl-quality-ceiling-results.json').read_text(encoding='utf-8'))
A=data['profiles']['A']['scenes']; C=data['profiles']['C']['scenes']
def locate(rel): return base/rel.replace('sdxl_quality_ceiling/','').replace('sdxl_quality_ceiling\\','').replace('\\','/')
entries=[]
for i in range(12):
    a=A[i]; c=C[i]; ids=['LEFT','RIGHT']; rng.shuffle(ids)
    entries.append({'pair':i+1,'scene':a.get('label',f'scene_{i+1:02d}'),'seedA':a.get('seed'),'seedC':c.get('seed'),'left': 'A' if ids[0]=='LEFT' else 'C','right':'C' if ids[0]=='LEFT' else 'A','aPath':a['output'],'cPath':c['output']})
W,H=560,350; sheet=Image.new('RGB',(W*2,H*12),'black'); d=ImageDraw.Draw(sheet)
for i,e in enumerate(entries):
    for col,side in enumerate(['left','right']):
        key=e[side]; p=locate(e['aPath'] if key=='A' else e['cPath']); im=Image.open(p).convert('RGB'); im.thumbnail((540,300)); x=col*W+(W-im.width)//2; y=i*H+6; sheet.paste(im,(x,y)); d.text((col*W+12,i*H+320),side.upper(),fill='white',font=font)
sheet.save(out/'A_C_FINAL_BLIND_COMPARISON.png')
(out/'A_C_FINAL_BLIND_KEY.json').write_text(json.dumps(entries,indent=2),encoding='utf-8')
print('created',len(entries),'pairs')
