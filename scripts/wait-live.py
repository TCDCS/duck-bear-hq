"""Wait for the existing Cloudflare deployment, without credentials or private data."""
import hashlib,json,os,time,urllib.request
from pathlib import Path
base=os.environ['BASE_URL'].rstrip('/')
expected={
 '/games/wacky-races/game.js':Path('src/kart-assets/game.js.txt').read_bytes(),
 '/games/wacky-races/network.js':Path('src/kart-assets/network.js.txt').read_bytes(),
 '/':Path('public/index.html').read_bytes(),
}
for attempt in range(60):
 try:
  ok=True
  for path,data in expected.items():
   req=urllib.request.Request(base+path,headers={'Cache-Control':'no-cache','User-Agent':'Duck-Bear-release-check/4'})
   with urllib.request.urlopen(req,timeout=15) as r:received=r.read()
   if hashlib.sha256(received).digest()!=hashlib.sha256(data).digest():ok=False;break
  if ok:
   with urllib.request.urlopen(base+'/api/races/version',timeout=15) as r:version=json.load(r)
   if version.get('version')==4 and version.get('multiplayer'):
    print('Published source and online-room bindings verified at '+base,flush=True);break
 except Exception as e:print('Waiting for deployment: '+type(e).__name__,flush=True)
 time.sleep(10)
else:raise SystemExit('The verified source has not reached the public site yet.')
