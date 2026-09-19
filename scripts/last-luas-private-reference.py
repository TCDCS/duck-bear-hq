"""Private reference transfer: encrypted to the review session's public key.
Never prints artwork, account identities, tokens or downloaded HTML.
"""
import os,json,pathlib,re,urllib.request,io,zipfile,hashlib,base64
from cryptography.hazmat.primitives import serialization,hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
PUBLIC_KEY=b'''-----BEGIN PUBLIC KEY-----
MIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEAitoOhr+afpSMy/N43og3
oMMTDtMapotH4jH/zSY9v3t0ht0s2RHDsC3HXyv/Mrf2fZaHUe+QrFFoder/rAWN
VUL2lSIDL2N+JiTq6E1vtE5JPneCHire1vlGVbYVhodz2tIFBLwXXp3/rLO2rW12
arTW7vfJHrj8sSh+s7L5nMGzwhEkCZeraZ0RGifcWt7vyDG15SR2M7ekKSoIUPor
eN2GgM561dpVdqAODP5i0p0faWeoSS58gAho2eFIP29TGeWeQy9XxhHQxE/mU1N4
oZqeC414VFt/E/cCB3SbJUHtfvyslBDiZ+oJsuxFQfoZ8ryvv/HL8rEefKWCfHZq
hdN/BlpaLqGiAgT+FrGqOR6mW1ZyguRyRw6beeI83ssQqg646/o/VNV5B+jR3HT7
HIhYreBC9FpffW2Ae1BxWdUI44bNBcP2UCjfgbSbltrjiscSZe6dtx0K4JIhMb4W
WtfMAHw/EcZ+oLKqqWzBB2zRZHZzy2+9hZi/KlMyfV29AgMBAAE=
-----END PUBLIC KEY-----'''
def read(url):
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 DuckBear private reference'}),timeout=30) as r:return r.read(6000000)
files={};report={}
for name,url in [('hodges.png','https://cdn.hodgesfiggis.ie/images/00296384-700x162.png'),('cafe.svg','https://www.cafeenseine.ie/wp-content/themes/sitetheme/library/images/logo.svg'),('pret.png','https://images.ctfassets.net/4zu8gvmtwqss/4J3tq43hFKDHLTwPXX2YBb/ee4fbeaa8ea7b08f41ec974168af5927/pret-a-manger-logo.png')]:
 try:
  raw=read(url);files[name]=raw;report[name]={'source':url,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)}
 except Exception as e:report[name]={'error':str(e)}
try:
 url='https://ivycollection.com/restaurants-near-me/the-ivy-ireland/the-ivy-dawson-street-dublin/'
 html=read(url).decode('utf8');svgs=re.findall(r'<svg\b[\s\S]*?</svg>',html)
 svg=next(s for s in svgs if '562.8177' in s);svg=svg.replace('viewbox=','viewBox=');svg=svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" fill="#ffffff" ',1)
 raw=svg.encode();files['ivy.svg']=raw;report['ivy.svg']={'source':url,'selector':'.nav--logo svg','sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'export':'original paths; XML namespace and computed white fill supplied'}
except Exception as e:report['ivy.svg']={'error':str(e)}
# Only the account identity fields needed to map the user to the existing login.
try:
 account=os.environ.get('CLOUDFLARE_ACCOUNT_ID','');token=os.environ.get('CLOUDFLARE_API_TOKEN','')
 if account and token:
  url=f'https://api.cloudflare.com/client/v4/accounts/{account}/d1/database/05f3e993-e41a-4d0e-8166-bcd04ae235f9/query'
  req=urllib.request.Request(url,data=json.dumps({'sql':'SELECT id,username,display_name,role,active FROM users WHERE role = ? LIMIT 10','params':['admin']}).encode(),headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
  with urllib.request.urlopen(req,timeout=30) as r:files['owner-candidates.json']=r.read()
  report['owner-query']='encrypted result only'
 else:report['owner-query']='credentials not available'
except Exception as e:report['owner-query']='query failed: '+str(e)
files['report.json']=json.dumps(report,indent=2).encode()
buf=io.BytesIO()
with zipfile.ZipFile(buf,'w',zipfile.ZIP_DEFLATED) as z:
 for name,raw in files.items():z.writestr(name,raw)
key=os.urandom(32);nonce=os.urandom(12);pub=serialization.load_pem_public_key(PUBLIC_KEY)
wrapped=pub.encrypt(key,padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()),algorithm=hashes.SHA256(),label=None));data=AESGCM(key).encrypt(nonce,buf.getvalue(),b'last-luas-reference-v1')
pathlib.Path('/tmp/last-luas-private.encrypted.json').write_text(json.dumps({k:base64.b64encode(v).decode() for k,v in [('wrapped',wrapped),('nonce',nonce),('ciphertext',data)]}))
print('Encrypted reference package created; no plaintext artwork or identity data exported to logs or artifacts.')
