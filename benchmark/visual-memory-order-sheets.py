import json, os, textwrap
from PIL import Image, ImageDraw, ImageFont
root='benchmark/visual-memory/order-ab'
rows=json.load(open(root+'/trace.json',encoding='utf-8'))['rows']
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',16)
for kind in ('machine','door','location'):
    items=[r for r in rows if r['chain'].startswith(kind)]
    sheet=Image.new('RGB',(1024,len(items)*365),'#151719');d=ImageDraw.Draw(sheet)
    for yrow,r in enumerate(items):
        for col,(label,png) in enumerate((('A — production order',r['baselinePng']),('B — facts/result first',r['png']))):
            x=col*512;y=yrow*365
            im=Image.open(png).convert('RGB');im.thumbnail((512,288));sheet.paste(im,(x,y+77))
            cap=f"{r['chain']} {label}\n{r['physicalFacts'] or 'No persistent fact'}\n{r['consequence']}"
            lines=[]
            for line in cap.split('\n'):lines+=textwrap.wrap(line,62)
            d.multiline_text((x+8,y+5),'\n'.join(lines[:4]),font=font,fill='white',spacing=2)
    sheet.save(root+'/'+kind+'-ab-sheet.png')
