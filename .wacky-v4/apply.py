"""Materialise reviewed textual deltas, then verify every release source byte."""
import hashlib,json
from pathlib import Path

def blob(data):
 return hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()

for path,expected in {'src/index.js':'32f117dfeb12c35df086cd4efaade52edf2026ee','public/app.js':'9583d39da54d33577e908232d18b7c59da659767'}.items():
 if blob(Path(path).read_bytes())!=expected:raise SystemExit('Original account source changed: '+path)

pending=[]
for entry in json.loads(Path('.wacky-v4/client.json').read_text())+json.loads(Path('.wacky-v4/browser.json').read_text()):
 p=Path(entry['path']);raw=p.read_bytes()
 if hashlib.sha256(raw).hexdigest()==entry['after']:continue
 if blob(raw)!=entry['before']:raise SystemExit('Unexpected source base: '+str(p))
 content=raw.decode('utf-8')
 for offset,length,replacement in reversed(entry['edits']):content=content[:offset]+replacement+content[offset+length:]
 data=content.encode('utf-8')
 if hashlib.sha256(data).hexdigest()!=entry['after']:raise SystemExit('Delta integrity failure: '+str(p))
 pending.append((p,data))
for p,data in pending:p.write_bytes(data)

p=Path('src/multiplayer/core.mjs');p.parent.mkdir(exist_ok=True)
p.write_text(Path('src/kart-assets/core.js.txt').read_text()+'\nexport default globalThis.KartCore;\n')
p=Path('public/account.html');text=p.read_text()
if 'account-navigation.js?v=4' not in text:
 if blob(p.read_bytes())!='7069020c55f73e2e1c6d7f1c716a4885d12492cf':raise SystemExit('Unexpected original account shell.')
 p.write_text(text.replace('</body>','  <script src="account-navigation.js?v=4" defer></script>\n</body>'))

manifest=json.loads(Path('.wacky-v4/manifest.json').read_text())
for name,expected in manifest.items():
 if blob(Path(name).read_bytes())!=expected:raise SystemExit('Release integrity mismatch: '+name+' received '+blob(Path(name).read_bytes()))
print('Verified',len(manifest),'release files. Original account/backend source unchanged.',flush=True)
