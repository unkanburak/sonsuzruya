from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json
root=Path('benchmark/c-profile-soak/comfy-runtime/output'); dest=Path('benchmark/c-profile-soak'); dest.mkdir(exist_ok=True)
data=json.loads(Path('benchmark/c-profile-soak-results.json').read_text(encoding='utf-8')); turns=data['turns']; font=ImageFont.load_default()
def make(selected,name,cols=5):
    tw,th=220,155; rows=(len(selected)+cols-1)//cols; out=Image.new('RGB',(tw*cols,th*rows),'black'); d=ImageDraw.Draw(out)
    for k,t in enumerate(selected):
        p=root/t['output'].replace('/', '\\') if t.get('output') else None
        if not p or not p.exists(): continue
        im=Image.open(p).convert('RGB'); im.thumbnail((210,125)); x=(k%cols)*tw+(tw-im.width)//2; y=(k//cols)*th+3; out.paste(im,(x,y)); d.text(((k%cols)*tw+5,(k//cols+1)*th-20),f"Turn {t['turn']} — {t['label']}",fill='white',font=font)
    out.save(dest/name)
make(turns,'FULL_C_SOAK_SEQUENCE.png')
problem=[t for t in turns if t['latencySeconds']>3.5 or not t['success']]
make(problem,'C_SOAK_PROBLEM_TURNS.png',cols=4)
print('full',len(turns),'problem',len(problem))
