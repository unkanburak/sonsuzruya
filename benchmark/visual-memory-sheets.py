import json, sys, os, textwrap
from PIL import Image, ImageDraw, ImageFont
root = sys.argv[1]
rows = json.load(open(os.path.join(root, 'trace.json'), encoding='utf-8'))['rows']
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 15)
for chain in dict.fromkeys(r['chain'] for r in rows):
    items = [r for r in rows if r['chain'] == chain]
    sheet = Image.new('RGB', (1024, ((len(items)+1)//2)*365), '#17191c')
    draw = ImageDraw.Draw(sheet)
    for n,r in enumerate(items):
        x,y = (n%2)*512, (n//2)*365
        im = Image.open(r['png']).convert('RGB')
        im.thumbnail((512,288))
        sheet.paste(im,(x,y+77))
        caption = r['id']+' | '+r['committedState']['current_location']+'\n'+(r['physicalFacts'] or 'No persistent physical facts')+'\n'+r['consequence']
        lines = []
        for line in caption.split('\n'): lines.extend(textwrap.wrap(line,65))
        draw.multiline_text((x+8,y+4),'\n'.join(lines[:4]),font=font,fill='white',spacing=2)
    filename = os.path.join(root,chain+'-sheet.png')
    sheet.save(filename)
    print(filename)
