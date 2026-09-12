"""Apply reviewed source changes; stop if an unexpected source version is found."""
import hashlib,json
from pathlib import Path

def blob(data):return hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
entries=json.loads(Path('.race-update/deltas.json').read_text());output={}
for entry in entries:
 p=Path(entry['path']);raw=p.read_bytes()
 if blob(raw)!=entry['before']:raise SystemExit('Source changed: '+str(p)+' '+blob(raw))
 text=raw.decode()
 for offset,length,replacement in reversed(entry['edits']):
  if entry['path']=='src/kart-assets/index.html.txt' and offset==11044 and replacement.endswith('Three laps. Mangoes'):
   replacement=replacement[:-len('Three laps. Mangoes')]
  text=text[:offset]+replacement+text[offset+length:]
 data=text.encode()
 if blob(data)!=entry['after']:raise SystemExit('Reconstructed source did not match review: '+str(p)+' '+blob(data))
 output[p]=data
for p,data in output.items():p.write_bytes(data)
# The old eighth seat can remain after another member leaves an old room.
p=Path('src/multiplayer/room-state.mjs');s=p.read_text();old='||saved.players.length>CAPACITY'
assert s.count(old)==1
p.write_text(s.replace(old,old+'||saved.players.some(p=>!Number.isInteger(p.id)||p.id<0||p.id>=CAPACITY)'))
p=Path('public/index.html');s=p.read_text();assert s.count('1–8 PLAYERS')==1
p.write_text(s.replace('1–8 PLAYERS','1–7 PLAYERS'))
p=Path('tests/seven-room.test.mjs')
p.write_text(p.read_text()+"\ntest('old rooms with seven members but an eighth seat id cannot strand that driver',()=>{\n const room=M.makeRoom('1234');room.players=Array.from({length:7},(_,i)=>({...room.players[0],id:i===6?7:i}));assert.equal(M.restoreRoom(room),null);\n});\n")
p=Path('tests/setup-grid.test.cjs')
p.write_text(p.read_text()+"\ntest('homepage states the same seven-player limit as the simulation',()=>{\n const html=fs.readFileSync(__dirname+'/../public/index.html','utf8');assert.ok(html.includes('1–7 PLAYERS'));assert.ok(!html.includes('1–8 PLAYERS'));\n});\n")
workflow=Path('.github/workflows/wacky-races.yml')
if blob(workflow.read_bytes())!='6d93843948d5daee7b42a0f7cb46c3ff7a0aa0cf':raise SystemExit('Regression workflow changed.')
readme=Path('README.md')
if blob(readme.read_bytes())!='171e7a713e56c5503525dc71593cf1f553902113':raise SystemExit('README changed.')
s=readme.read_text().replace('Up to eight human drivers','Up to seven human drivers').replace('eight separate WebSocket clients','seven separate WebSocket clients').replace('eight-client test','seven-client test')
s=s.replace('## Wacky Races\n','## Wacky Races\n\nOpening the game shows setup first, even from old `?play=1` links. Choose your level, vehicle, driver and settings, then press Start race. The left Race order panel shows first to last and can be collapsed. Seven vehicles maximum race at once; extra moving traffic is no longer added. See `docs/wacky-races-v4.1.md`.\n')
readme.write_text(s)
new=['src/kart-assets/race-order.js.txt','tests/setup-grid.test.cjs','tests/seven-room.test.mjs','tests/race-order.test.cjs','tests/setup-browser.py','docs/wacky-races-v4.1.md']
paths=[e['path'] for e in entries]+new+[str(workflow),str(readme)]
Path('/tmp/setup-release-files.json').write_text(json.dumps({p:blob(Path(p).read_bytes()) for p in paths}))
print('Verified and applied',len(entries),'source deltas. Total release files:',len(paths),flush=True)
