"""Read-only anonymous production checks. No credentials or session creation.
Actual private gameplay is covered by isolated local-Worker browser acceptance.
The live owner game is accessed through the normal sign-in flow, not a test login.
"""
import json,time,urllib.request,urllib.error
ORIGINS=['https://guannan.party','https://duck-bear-hq.zachary-chambers2.workers.dev']
HEADERS={'Cache-Control':'no-cache','User-Agent':'DuckBear LastLuas release verification'}
def request(url):
 try:
  with urllib.request.urlopen(urllib.request.Request(url,headers=HEADERS),timeout=20) as r:return r.status,dict(r.headers),r.read(2000000)
 except urllib.error.HTTPError as e:return e.code,dict(e.headers),e.read(100000)
for origin in ORIGINS:
 for attempt in range(24):
  code,headers,raw=request(origin+'/api/last-luas/release?check='+str(time.time_ns()))
  try:release=json.loads(raw)
  except (ValueError,UnicodeDecodeError):release={}
  if code==200 and release.get('version')=='1.0.0':break
  time.sleep(5)
 else:raise RuntimeError('Published Last Luas release does not match 1.0.0 at '+origin)
 for path in ['/games/last-luas/','/games/last-luas/inked/main.mjs','/games/last-luas/private/brands/hodges.png','/games/last%2Dluas/inked/main.mjs']:
  code,headers,raw=request(origin+path)
  if code!=401:raise RuntimeError('Anonymous private URL status '+str(code)+' at '+path)
  if 'no-store' not in headers.get('Cache-Control',headers.get('cache-control','')):raise RuntimeError('Private response cache policy missing')
 code,_,raw=request(origin+'/games/?check='+str(time.time_ns()))
 if code!=200 or b'/games/last-luas/' not in raw or b'INKED' not in raw.upper():raise RuntimeError('Games card is not the inked release at '+origin)
 print('Verified release 1.0.0, inked Games card and private denials:',origin)
print('Read-only live checks passed. Authenticated gameplay was tested on the isolated local Worker, not by creating a live owner session.')
