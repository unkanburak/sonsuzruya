from pathlib import Path
from PIL import Image,ImageDraw
root=Path('benchmark/continuity-bakeoff/runtime/output/continuity_ab30'); out=Path('benchmark')
def files(k): return sorted((root/k).glob('*.png'))
for k,name in [('B','STRUCTURED_30_TURN_SEQUENCE'),('A','VANILLA_30_TURN_SEQUENCE')]:
 fs=files(k); w,h=256,170; sheet=Image.new('RGB',(w*5,(h+20)*6),(18,18,18)); d=ImageDraw.Draw(sheet)
 for i,f in enumerate(fs[:30]):
  im=Image.open(f).convert('RGB'); im.thumbnail((w,h)); x=i%5*w; y=i//5*(h+20); sheet.paste(im,(x,y)); d.text((x+3,y+h+2),f'TURN {i+1:02d}',fill='white')
 sheet.save(out/(name+'.png'))
af,bf=files('A'),files('B'); w,h=384,224; sheet=Image.new('RGB',(w*2,(h+25)*8),(18,18,18)); d=ImageDraw.Draw(sheet)
for i in range(min(8,len(af),len(bf))):
 for x,f in enumerate([af[i],bf[i]]):
  im=Image.open(f).convert('RGB'); im.thumbnail((w,h)); xx=x*w; y=i*(h+25); sheet.paste(im,(xx,y)); d.text((xx+5,y+h+3),('LEFT' if x==0 else 'RIGHT')+f'  TRANSITION {i+1}',fill='white')
sheet.save(out/'VANILLA_VS_STRUCTURED_CONTINUITY.png')
problem=[7,8,12,18,22,27]
fs=files('B'); w,h=384,224; sh=Image.new('RGB',(w*3,(h+24)*2),(18,18,18)); d=ImageDraw.Draw(sh)
for j,i in enumerate(problem):
 if i-1>=len(fs): continue
 im=Image.open(fs[i-1]).convert('RGB'); im.thumbnail((w,h)); x=j%3*w; y=j//3*(h+24); sh.paste(im,(x,y)); d.text((x+4,y+h+3),f'TURN {i:02d} REVIEW',fill='white')
sh.save(out/'STRUCTURED_PROBLEM_TURNS.png')
