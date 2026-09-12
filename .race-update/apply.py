"""Apply exact reviewed deltas; fail rather than overwrite an unexpected source base."""
import hashlib,json
from pathlib import Path

def blob(data):return hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
entries=json.loads(Path('.race-update/deltas.json').read_text());output={}
for entry in entries:
 p=Path(entry['path']);raw=p.read_bytes()
 if blob(raw)!=entry['before']:raise SystemExit('Source changed: '+str(p)+' '+blob(raw))
 text=raw.decode()
 for offset,length,replacement in reversed(entry['edits']):
  # Correct the duplicated context suffix in the transported help-text insertion.
  if entry['path']=='src/kart-assets/index.html.txt' and offset==11044 and replacement.endswith('Three laps. Mangoes'):
   replacement=replacement[:-len('Three laps. Mangoes')]
  text=text[:offset]+replacement+text[offset+length:]
 data=text.encode()
 if blob(data)!=entry['after']:raise SystemExit('Reconstructed source did not match review: '+str(p)+' '+blob(data))
 output[p]=data
for p,data in output.items():p.write_bytes(data)
workflow=Path('.github/workflows/wacky-races.yml')
if blob(workflow.read_bytes())!='0f6992d15907c89204a35bc3343a8d9073d72380':raise SystemExit('Regression workflow changed.')
s=workflow.read_text().replace('eight separate drivers','seven separate drivers').replace('Check eight guest drivers','Check seven guest drivers').replace('eight-player-live.json','seven-player-live.json').replace('local/eight-player.json','local/seven-player.json')
s=s.replace('          python tests/live-room-smoke.py\n          mv', '          python tests/setup-browser.py\n          cp verification/setup-browser.json verification/local/setup-browser.json\n          python tests/live-room-smoke.py\n          mv')
s=s.replace('        run: python tests/browser_clients.py', '        run: |\n          python tests/setup-browser.py\n          python tests/browser_clients.py')
workflow.write_text(s)
readme=Path('README.md')
if blob(readme.read_bytes())!='171e7a713e56c5503525dc71593cf1f553902113':raise SystemExit('README changed.')
s=readme.read_text().replace('Up to eight human drivers','Up to seven human drivers').replace('eight separate WebSocket clients','seven separate WebSocket clients').replace('eight-client test','seven-client test')
s=s.replace('## Wacky Races\n','## Wacky Races\n\nOpening the game shows setup first, even from old `?play=1` links. Choose your level, vehicle, driver and settings, then press Start race. The left Race order panel shows first to last and can be collapsed. Seven vehicles maximum race at once; extra moving traffic is no longer added. See `docs/wacky-races-v4.1.md`.\n')
readme.write_text(s)
new=['src/kart-assets/race-order.js.txt','tests/setup-grid.test.cjs','tests/seven-room.test.mjs','tests/race-order.test.cjs','tests/setup-browser.py','docs/wacky-races-v4.1.md']
paths=[e['path'] for e in entries]+new+[str(workflow),str(readme)]
Path('/tmp/setup-release-files.json').write_text(json.dumps({p:blob(Path(p).read_bytes()) for p in paths}))
print('Verified and applied',len(entries),'source deltas. Total release files:',len(paths),flush=True)
