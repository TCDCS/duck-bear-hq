"""Synthetic test identities in LOCAL Wrangler only. No remote flag is accepted."""
from pathlib import Path
import base64,datetime,hashlib,json,secrets,subprocess
root=Path('.wrangler');root.mkdir(exist_ok=True)
now=datetime.datetime.now(datetime.timezone.utc);stamp=now.isoformat().replace('+00:00','Z');expiry=(now+datetime.timedelta(hours=2)).isoformat().replace('+00:00','Z')
q=lambda s:"'"+str(s).replace("'","''")+"'"
b64=lambda b:base64.urlsafe_b64encode(b).decode().rstrip('=')
users=[];commands=[]
for i in range(2):
 ident='_last_luas_fixture_'+str(i);token=secrets.token_urlsafe(32)
 values=[ident,'last_luas_test_'+str(i),'Local acceptance '+str(i),'admin','unused','unused',100000,1,stamp,stamp]
 commands.append('INSERT OR REPLACE INTO users(id,username,display_name,role,password_hash,password_salt,password_iterations,active,created_at,updated_at) VALUES('+','.join(map(q,values))+');')
 commands.append('DELETE FROM sessions WHERE user_id='+q(ident)+';')
 values=[ident+'_session',ident,b64(hashlib.sha256(token.encode()).digest()),expiry,stamp,stamp]
 commands.append('INSERT INTO sessions(id,user_id,token_hash,expires_at,created_at,last_seen_at) VALUES('+','.join(map(q,values))+');')
 users.append({'id':ident,'token':token})
sql=root/'last-luas-fixture.sql';sql.write_text('\n'.join(commands))
r=subprocess.run(['npx','--no-install','wrangler','d1','execute','DB','--local','--file',str(sql)],capture_output=True,text=True)
if r.returncode:raise RuntimeError('Local identity setup failed.')
(root/'last-luas-fixture.json').write_text(json.dumps({'users':users}));p=root/'last-luas-access.json';p.write_text(json.dumps({'ownerId':users[0]['id']}))
r=subprocess.run(['npx','--no-install','wrangler','r2','object','put','duck-bear-hq-media/last-luas/access.json','--file',str(p),'--local','--content-type','application/json'],capture_output=True,text=True)
if r.returncode:raise RuntimeError('Local private owner configuration failed.')
print('Local owner and second-account acceptance fixtures created. Production unchanged.')
