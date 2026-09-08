from pathlib import Path
from PIL import Image,ImageDraw
root=Path('benchmark/continuity-bakeoff/runtime/output/continuity_bakeoff'); out=Path('benchmark/continuity-bakeoff'); methods=['A','B','C030','C045']; labels={'A':'VANILLA','B':'STRUCTURED_TEXT','C030':'IMG2IMG_030','C045':'IMG2IMG_045'}
for m in methods:
    files=sorted((root/m).glob('*.png'))
    if not files: continue
    thumbw,thumbh=384,224; cellw,cellh=thumbw,thumbh+26
    sheet=Image.new('RGB',(thumbw*4,cellh*3),(18,18,18)); d=ImageDraw.Draw(sheet)
    for j,f in enumerate(files[:12]):
        im=Image.open(f).convert('RGB'); im.thumbnail((thumbw,thumbh)); x=(j%4)*thumbw; y=(j//4)*cellh
        sheet.paste(im,(x,y)); d.text((x+6,y+thumbh+4),f'TURN {j+1:02d}',fill='white')
    sheet.save(out/f'{labels[m]}_SEQUENCE.png')
# weakest/failure overview: all first five rows side by side
rows=[]
for m in methods:
    fs=sorted((root/m).glob('*.png'))[:5]
    if fs: rows.append((m,fs))
if rows:
    w,h=384,250; sheet=Image.new('RGB',(w*len(rows),h*5),(18,18,18)); d=ImageDraw.Draw(sheet)
    for c,(m,fs) in enumerate(rows):
        for r,f in enumerate(fs):
            im=Image.open(f).convert('RGB'); im.thumbnail((w,h-26)); x=c*w; y=r*h; sheet.paste(im,(x,y)); d.text((x+5,y+h-22),f'{m} T{r+1}',fill='white')
    sheet.save(out/'CONTINUITY_FAILURES.png')
