#!/usr/bin/env python3
"""Package the approved artwork. Generated assets are committed; deployment needs no Python.
Versioned v1 filenames are immutable: use new names when source or crop changes.
"""
from pathlib import Path
from io import BytesIO
import base64,json,re
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
source=(ROOT/'public/hq/sketch-world.svg').read_text()
match=re.search(r'data:image/webp;base64,([A-Za-z0-9+/=]+)',source)
if not match:raise SystemExit('Approved WebP is missing; refusing to substitute artwork.')
original=base64.b64decode(match.group(1),validate=True)
image=Image.open(BytesIO(original)).convert('RGB')
if image.size!=(768,576):raise SystemExit('Artwork dimensions changed; review icon crop.')
hq=ROOT/'public/hq';assets=ROOT/'public/assets'
(hq/'causeway-v1-768.webp').write_bytes(original)
image.resize((480,360),Image.Resampling.LANCZOS).save(hq/'causeway-v1-480.webp','WEBP',quality=75,method=6)
# Both original characters remain visible; these icons are not labelled maskable.
crop=image.crop((192,94,608,510))
for size in (32,180,192,512):crop.resize((size,size),Image.Resampling.LANCZOS).save(assets/f'causeway-v1-{size}.png','PNG',optimize=True)
crop.resize((128,128),Image.Resampling.LANCZOS).save(assets/'causeway-v1-mark.webp','WEBP',quality=85,method=6)
crop.resize((64,64),Image.Resampling.LANCZOS).save(ROOT/'public/favicon.ico',format='ICO',sizes=[(16,16),(32,32),(48,48),(64,64)])
(ROOT/'public/apple-touch-icon.png').write_bytes((assets/'causeway-v1-180.png').read_bytes())
print(json.dumps({str(p.relative_to(ROOT)):p.stat().st_size for p in sorted(hq.glob('causeway-v1-*'))+sorted(assets.glob('causeway-v1-*'))},indent=2))
