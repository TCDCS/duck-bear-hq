from pathlib import Path
import json,time,urllib.error,urllib.request
BASE='https://duck-bear-hq.zachary-chambers2.workers.dev'
HEADERS={'Cache-Control':'no-cache','User-Agent':'Duck-Bear-Mango-release-check/1'}
manifest=json.loads(Path('public/games/mango-mayhem/release.json').read_text())
def read_json(path):
 request=urllib.request.Request(BASE+path+'?acceptance='+str(time.time_ns()),headers=HEADERS)
 with urllib.request.urlopen(request,timeout=12) as response:return json.load(response)
for attempt in range(100):
 path='/games/mango-mayhem/release.json'
 try:
  live=read_json(path);path='/api/mango/health';health=read_json(path)
  if live.get('sourceHash')==manifest['sourceHash'] and health.get('cloudSaves')=='ready':
   print('Production release and additive save migration verified:',live['sourceHash']);break
 except urllib.error.HTTPError as error:
  if attempt%5==0:print(f'Waiting for {path}: HTTP {error.code}',flush=True)
 except Exception as error:
  if attempt%5==0:print(f'Waiting for {path}: {type(error).__name__}: {error}',flush=True)
 time.sleep(8)
else:raise SystemExit('The expected production release did not appear; no live success claimed.')
