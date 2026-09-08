import json, random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

data=json.loads(Path('benchmark/profile-c-soft-lock-results.json').read_text())
out=Path('benchmark/profile-c-soft-lock'); out.mkdir(parents=True, exist_ok=True)
font=ImageFont.load_default()
def sheet(method, name):
    ims=[]
    for row in data['methods'][method]['rows']:
        im=Image.open(row['output']['path']).convert('RGB'); im.thumbnail((420,236)); ims.append((row['turn'],im.copy()))
    canvas=Image.new('RGB',(900,4*280),(18,18,22)); d=ImageDraw.Draw(canvas)
    for idx,(turn,im) in enumerate(ims):
        x=(idx%2)*450; y=(idx//2)*280
        canvas.paste(im,(x+10,y+28)); d.text((x+10,y+8),f'Turn {turn}',fill='white',font=font)
    canvas.save(out/name)
for method,name in [('baseline','BASELINE_FINAL.png'),('soft','SOFT_LOCK.png'),('medium','MEDIUM_LOCK.png')]: sheet(method,name)
entries=[]; rng=random.Random(20260830)
for i in range(8):
    pair=[]
    for method in ['baseline','soft','medium']:
        row=data['methods'][method]['rows'][i]; pair.append((method,row['output']['path']))
    rng.shuffle(pair); entries.append({'turn':i+1,'files':[p for _,p in pair],'hiddenMethods':[m for m,_ in pair]})
canvas=Image.new('RGB',(1300,8*210),(18,18,22)); d=ImageDraw.Draw(canvas)
for i,e in enumerate(entries):
    y=i*210; d.text((10,y+5),f'Pair {i+1}',fill='white',font=font)
    for j,p in enumerate(e['files']):
        im=Image.open(p).convert('RGB'); im.thumbnail((410,180)); x=100+j*430; canvas.paste(im,(x,y+25)); d.text((x,y+8),['LEFT','MIDDLE','RIGHT'][j],fill='white',font=font)
Path('benchmark/profile-c-soft-lock/BLIND_KEY.json').write_text(json.dumps(entries,indent=2))
canvas.save(out/'BLIND_COMPARISON.png')
