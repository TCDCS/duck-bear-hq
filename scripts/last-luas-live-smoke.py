"""Verify only Last Luas on production with a short-lived acceptance session.
No passwords or account records are changed. The test session is deleted in finally,
and independently expires after six minutes. Tokens/owner IDs never enter logs/artifacts.
"""
import base64,datetime,hashlib,importlib.util,json,os,pathlib,secrets,signal,subprocess,tempfile,urllib.request,urllib.error
module=importlib.util.spec_from_file_location('luas_private',pathlib.Path(__file__).with_name('last-luas-private-assets.py'));private=importlib.util.module_from_spec(module);module.loader.exec_module(private)
def abort(*_):raise SystemExit('Acceptance interrupted; removing its temporary session.')
signal.signal(signal.SIGTERM,abort)
B='https://guannan.party';WORKER='https://duck-bear-hq.zachary-chambers2.workers.dev'
with tempfile.TemporaryDirectory() as td:
 root=pathlib.Path(td);access=root/'access.json';private.r2(['get','duck-bear-hq-media/last-luas/access.json','--file',str(access),'--remote']);owner=json.loads(access.read_text())['ownerId']
 token=secrets.token_urlsafe(32);digest=base64.urlsafe_b64encode(hashlib.sha256(token.encode()).digest()).decode().rstrip('=');sid='luas_acceptance_'+secrets.token_hex(16)
 now=datetime.datetime.now(datetime.timezone.utc);stamp=now.isoformat().replace('+00:00','Z');expires=(now+datetime.timedelta(minutes=6)).isoformat().replace('+00:00','Z')
 created=False
 try:
  private.sql('INSERT INTO sessions(id,user_id,token_hash,expires_at,created_at,last_seen_at,user_agent) VALUES(?,?,?,?,?,?,?)',[sid,owner,digest,expires,stamp,stamp,'Last Luas deployment acceptance'])
  created=True;fixture=root/'fixture.json';fixture.write_text(json.dumps({'users':[{'token':token}]}));fixture.chmod(0o600)
  env={**os.environ,'BASE_URL':B,'LAST_LUAS_FIXTURE':str(fixture),'LAST_LUAS_REPORT':'/tmp/last-luas-live-browser'}
  subprocess.run(['python','scripts/last-luas-browser.py'],env=env,check=True)
  for origin in [B,WORKER]:
   for path in ['/games/last-luas/','/games/last-luas/inked/main.mjs','/games/last-luas/private/brands/hodges.png','/games/last%2Dluas/inked/main.mjs']:
    try:urllib.request.urlopen(origin+path,timeout=15);raise RuntimeError('Anonymous private URL was exposed.')
    except urllib.error.HTTPError as e:
     if e.code!=401:raise RuntimeError('Private denial status did not match expected 401.')
   with urllib.request.urlopen(urllib.request.Request(origin+'/games/last-luas/session',headers={'Cookie':'db_session='+token}),timeout=15) as r:
    if json.load(r).get('version')!='1.0.0':raise RuntimeError('Published private build differs.')
  print('Custom-domain game rendered, controls/boarding passed; both origins enforce private access.')
 finally:
  if created:private.sql('DELETE FROM sessions WHERE id=? AND token_hash=?',[sid,digest]);print('Temporary acceptance session removed.')
