"""Ephemeral test users for the LOCAL Wrangler database only. Never a production migration."""
from pathlib import Path
import base64,datetime,hashlib,json,secrets,subprocess
root=Path(__file__).resolve().parents[1];folder=root/'.wrangler';folder.mkdir(exist_ok=True)
def b64(v):return base64.urlsafe_b64encode(v).decode().rstrip('=')
now=datetime.datetime.now(datetime.timezone.utc);stamp=now.isoformat().replace('+00:00','Z');expires=(now+datetime.timedelta(days=2)).isoformat().replace('+00:00','Z')
fixture={'users':[]};statements=[]
for i in range(3):
 ident='_mango_verify_'+str(i);username='mango_verify_'+str(i);password='Mango-'+secrets.token_urlsafe(14);salt=secrets.token_bytes(16);token=secrets.token_urlsafe(32)
 hashed=hashlib.pbkdf2_hmac('sha256',password.encode(),salt,100000)
 # Random values are URL-safe. SQL literals are escaped regardless.
 q=lambda x:"'"+str(x).replace("'","''")+"'"
 values=[ident,username,'Mango verification '+str(i),'member',b64(hashed),b64(salt),100000,1 if i<2 else 0,stamp,stamp]
 statements.append('INSERT INTO users (id,username,display_name,role,password_hash,password_salt,password_iterations,active,created_at,updated_at) VALUES ('+','.join(q(x) for x in values)+') ON CONFLICT(id) DO UPDATE SET password_hash=excluded.password_hash,password_salt=excluded.password_salt,active=excluded.active;')
 statements.append('DELETE FROM sessions WHERE user_id='+q(ident)+';')
 session=[ident+'_session',ident,b64(hashlib.sha256(token.encode()).digest()),expires,stamp,stamp]
 statements.append('INSERT INTO sessions(id,user_id,token_hash,expires_at,created_at,last_seen_at) VALUES('+','.join(q(x) for x in session)+');')
 fixture['users'].append({'id':ident,'username':username,'password':password,'token':token})
(folder/'mango-test.sql').write_text('\n'.join(statements))
(folder/'mango-test.json').write_text(json.dumps(fixture))
subprocess.run(['npx','wrangler','d1','execute','DB','--local','--file',str(folder/'mango-test.sql')],cwd=root,check=True)
print('Created three temporary verification identities in the local database. No remote command was used.')
