"""Real existing Worker authentication + game profiles, on local Wrangler only."""
from pathlib import Path
import json,os,urllib.request,urllib.error,urllib.parse
BASE=os.environ.get('BASE_URL','http://127.0.0.1:8787').rstrip('/')
if urllib.parse.urlparse(BASE).hostname not in ('127.0.0.1','localhost'):raise SystemExit('Synthetic identities are only valid against the local test Worker.')
fixture=json.loads(Path('.wrangler/mango-test.json').read_text())['users'];out=Path('verification/mango/auth');out.mkdir(parents=True,exist_ok=True);checks=[]
def request(path,method='GET',body=None,user=None,origin=None):
 headers={}
 if body is not None:headers.update({'Content-Type':'application/json','Origin':origin or BASE})
 if user is not None:headers['Cookie']='db_session='+fixture[user]['token']
 req=urllib.request.Request(BASE+path,data=json.dumps(body).encode() if body is not None else None,method=method,headers=headers)
 try:response=urllib.request.urlopen(req,timeout=15)
 except urllib.error.HTTPError as e:response=e
 raw=response.read();content_type=(response.headers.get('Content-Type') or '').lower()
 data=json.loads(raw) if raw and 'application/json' in content_type else ({'raw':raw.decode('utf-8','replace')} if raw else {})
 return response.status,data,dict(response.headers)
def check(name,condition):
 checks.append({'name':name,'passed':bool(condition)});print(('PASS ' if condition else 'FAIL ')+name,flush=True)
 if not condition:raise AssertionError(name)
root='/api/mango/profiles'
try:
 check('public migration health',request('/api/mango/health')[0]==200)
 check('anonymous cannot list profiles',request(root)[0]==401)
 check('disabled existing account is refused',request(root,user=2)[0]==403)
 status,data,headers=request('/api/auth/login','POST',{'username':fixture[0]['username'],'password':fixture[0]['password']})
 check('original login verifies real PBKDF2 password',status==200 and 'Set-Cookie' in headers)
 status,data,_=request(root,user=0);check('authenticated game list contains only owner and profiles',status==200 and sorted(data)==['ownerId','profiles'])
 status,data,_=request(root,'POST',{'nickname':'Worker test','avatarId':'mango'},0)
 if status!=201:print('DIAGNOSTIC create profile response',status,json.dumps(data,sort_keys=True),flush=True)
 check('authenticated profile can be created',status==201);profile=data['profile'];pid=profile['id']
 check('different account cannot read profile',request(root+'/'+pid,user=1)[0]==404)
 progress=profile['progress'];progress['levels']['dublin']['mangoIds']=['m001']
 check('different account cannot write profile',request(root+'/'+pid+'/progress','PUT',{'revision':0,'progress':progress},1)[0]==404)
 check('different account cannot delete profile',request(root+'/'+pid,'DELETE',{'revision':0},1)[0]==404)
 check('cross-origin write rejected by existing auth gateway',request(root+'/'+pid+'/progress','PUT',{'revision':0,'progress':progress},0,'https://untrusted.example')[0]==403)
 status,data,_=request(root+'/'+pid+'/progress','PUT',{'revision':0,'progress':progress},0);check('current revision save succeeds',status==200 and data['profile']['revision']==1)
 status,data,_=request(root+'/'+pid+'/progress','PUT',{'revision':0,'progress':profile['progress']},0);check('stale device receives conflict and current own save',status==409 and data['current']['revision']==1)
 check('oversized body is rejected',request(root,'POST',{'nickname':'x'*40000,'avatarId':'mango'},0)[0]==413)
 check('unknown fields rejected',request(root,'POST',{'nickname':'x','avatarId':'mango','ownerId':fixture[1]['id']},0)[0]==400)
 check('revision-aware delete succeeds',request(root+'/'+pid,'DELETE',{'revision':1},0)[0]==200)
 check('deleted save cannot recreate a profile',request(root+'/'+pid+'/progress','PUT',{'revision':1,'progress':progress},0)[0]==404)
 # Existing private routes remain protected independently of the game.
 check('private bootstrap still requires authentication',request('/api/bootstrap')[0]==401)
 check('private media stays protected',request('/media/not-a-public-image')[0] in (401,403,404))
finally:
 (out/'report.json').write_text(json.dumps({'base':BASE,'checks':checks,'passed':all(c['passed'] for c in checks),'syntheticIdentities':'local only'},indent=2))
