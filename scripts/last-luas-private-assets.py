"""Private staging / local test support. No artwork, cookies or owner IDs in logs.
The four official identity originals are hash pinned. Nothing is committed to Git.
"""
import hashlib,json,os,pathlib,re,subprocess,tempfile,urllib.request
SET='inked-20260919-a'
SOURCES=[('hodges','png','https://cdn.hodgesfiggis.ie/images/00296384-700x162.png','5b731c8a0ff900c11ee8b16278f1350756a5835604a685c94cae3dabf4d607cb'),('cafe','svg','https://www.cafeenseine.ie/wp-content/themes/sitetheme/library/images/logo.svg','0db7f71057e5cd77f90defc10872c4de39053fb71b66840952ea6ad012418727'),('ivy','svg','https://ivycollection.com/restaurants-near-me/the-ivy-ireland/the-ivy-dawson-street-dublin/','63a6a18f0b279ce1231042a3b1bc2e031dd2b0c4229eba66db866db400e064d2'),('pret','png','https://images.ctfassets.net/4zu8gvmtwqss/4J3tq43hFKDHLTwPXX2YBb/ee4fbeaa8ea7b08f41ec974168af5927/pret-a-manger-logo.png','b3416a14ea5fb3184f0ec8cb08efe878f81a1db52aa9b38f477e2911108ccbf0')]
def r2(args,check=True):
 p=subprocess.run(['npx','--no-install','wrangler','r2','object',*args],capture_output=True,text=True)
 if check and p.returncode:raise RuntimeError('Private object operation failed; check the existing R2 permission.')
 return p

def download(root):
 root=pathlib.Path(root);root.mkdir(parents=True,exist_ok=True)
 for name,ext,url,sha in SOURCES:
  with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 DuckBear private artwork review'}),timeout=40) as r:raw=r.read(2000000)
  if name=='ivy':
   svg=next(s for s in re.findall(r'<svg\b[\s\S]*?</svg>',raw.decode()) if '562.8177' in s)
   raw=svg.replace('viewbox=','viewBox=').replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" fill="#ffffff" ',1).encode()
  if hashlib.sha256(raw).hexdigest()!=sha:raise RuntimeError('Official artwork changed. Review required for '+name)
  if ext=='svg' and re.search(rb'<script|<foreignObject|(?:href|src)=[\"\'](?:https?:|//)',raw,re.I):raise RuntimeError('Active SVG rejected.')
  (root/(name+'.'+ext)).write_bytes(raw)
 return root

def sql(query,params=()):
 account=os.environ['CLOUDFLARE_ACCOUNT_ID'];token=os.environ['CLOUDFLARE_API_TOKEN']
 url=f'https://api.cloudflare.com/client/v4/accounts/{account}/d1/database/05f3e993-e41a-4d0e-8166-bcd04ae235f9/query'
 req=urllib.request.Request(url,data=json.dumps({'sql':query,'params':list(params)}).encode(),headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
 with urllib.request.urlopen(req,timeout=30) as r:data=json.load(r)
 if not data.get('success') or not data.get('result'):raise RuntimeError('Private configuration query failed.')
 return data['result'][0].get('results',[])

def configure():
 # Exactly one existing active administrator; runtime access then uses this explicit ID.
 users=sql('SELECT id FROM users WHERE role = ? AND active = 1 LIMIT 2',['admin'])
 if len(users)!=1:raise RuntimeError('Owner is ambiguous. No access configuration has been changed.')
 owner=users[0]['id']
 with tempfile.TemporaryDirectory() as td:
  p=pathlib.Path(td)/'access.json';prior=r2(['get','duck-bear-hq-media/last-luas/access.json','--file',str(p),'--remote'],False)
  if prior.returncode==0 and p.exists():
   if json.loads(p.read_text()).get('ownerId')!=owner:raise RuntimeError('Existing owner differs. Refusing to change access.')
   print('Existing private owner configuration confirmed.');return
  error=(prior.stdout+' '+prior.stderr).lower()
  if not any(x in error for x in ['does not exist','not found','404','10007']):raise RuntimeError('Cannot confirm whether an owner configuration exists. No change made.')
  p.write_text(json.dumps({'ownerId':owner,'configured':'2026-09-19','basis':'single existing active administrator; immutable without review'}))
  r2(['put','duck-bear-hq-media/last-luas/access.json','--file',str(p),'--content-type','application/json','--remote'])
  print('Private game access bound to the existing owner. No account or password changed.')

if __name__=='__main__':
 import argparse
 p=argparse.ArgumentParser();p.add_argument('action',choices=['local','configure']);a=p.parse_args()
 if a.action=='configure':configure()
 else:
  root=download('/tmp/last-luas-brands')
  for name,ext,_,_ in SOURCES:r2(['put','duck-bear-hq-media/last-luas/inked/'+SET+'/brands/'+name+'.'+ext,'--file',str(root/(name+'.'+ext)),'--content-type','image/svg+xml' if ext=='svg' else 'image/png','--local'])
  print('Pinned logo pack ready in local test storage only.')
