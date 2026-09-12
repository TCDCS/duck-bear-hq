from pathlib import Path
import json,time,urllib.request,hashlib
BASE='https://duck-bear-hq.zachary-chambers2.workers.dev'
manifest=json.loads(Path('public/games/mango-mayhem/release.json').read_text())
for attempt in range(100):
 try:
  with urllib.request.urlopen(BASE+'/games/mango-mayhem/release.json?acceptance='+str(time.time_ns()),timeout=12) as r:live=json.load(r)
  with urllib.request.urlopen(BASE+'/api/mango/health?acceptance='+str(time.time_ns()),timeout=12) as r:health=json.load(r)
  if live.get('sourceHash')==manifest['sourceHash'] and health.get('cloudSaves')=='ready':
   print('Production release and additive save migration verified:',live['sourceHash']);break
 except Exception as e:
  if attempt%5==0:print('Waiting for Cloudflare build:',str(e),flush=True)
 time.sleep(8)
else:raise SystemExit('The expected production release did not appear; no live success claimed.')
