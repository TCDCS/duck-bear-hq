"""Bounded private artwork transfer for the Last Luas browser review.
No account query, no secrets or plaintext artwork in logs/artifacts.
"""
import base64,hashlib,io,json,os,pathlib,re,urllib.request,zipfile
from cryptography.hazmat.primitives import hashes,serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
PUBLIC_KEY=b'''-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAio49Xw4a/43akD4euh6b
QA5h6MRjzz/POWxEFaRu4nfeCE9IIn4oYh/6z8kSlTGvxRx4pDoIDL3VPGt8cgr3
hTHVkDMFoGubqSomhoPxNt7HQfqEvi+T3HX/+pSOrbh+4CSrQawAbMkZ3j3RGHA5
ElKMBhJd92vfAVZuSBjbnmQtq4C/tw0hIfQIbM0+SKesTJxm8miW0RFrIxETluee
y5ZW+YEy/ju/yAG5Ofv6hs8T3mRC4EOhkoB2D9I2PVx5Z9lyRsfqODKnD+LRKbrg
yIROAaZYcFyY7A8yYiB9mepAHnAk3bEvCWJSoNY4OEE/TW8Wro68FNOTqdSZuQlV
8wIDAQAB
-----END PUBLIC KEY-----'''
SOURCES={'hodges.png':'https://cdn.hodgesfiggis.ie/images/00296384-700x162.png','cafe.svg':'https://www.cafeenseine.ie/wp-content/themes/sitetheme/library/images/logo.svg','pret.png':'https://images.ctfassets.net/4zu8gvmtwqss/4J3tq43hFKDHLTwPXX2YBb/ee4fbeaa8ea7b08f41ec974168af5927/pret-a-manger-logo.png','ivy.svg':'https://ivycollection.com/restaurants-near-me/the-ivy-ireland/the-ivy-dawson-street-dublin/'}
files={};report={}
for name,url in SOURCES.items():
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 DuckBear private artwork review'}),timeout=30) as r:raw=r.read(2000000)
 if name=='ivy.svg':
  svg=next(s for s in re.findall(r'<svg\b[\s\S]*?</svg>',raw.decode()) if '562.8177' in s)
  raw=svg.replace('viewbox=','viewBox=').replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" fill="#ffffff" ',1).encode()
 files[name]=raw;report[name]={'source':url,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)}
files['report.json']=json.dumps(report,indent=2).encode();buf=io.BytesIO()
with zipfile.ZipFile(buf,'w',zipfile.ZIP_DEFLATED) as z:
 for name,raw in files.items():z.writestr(name,raw)
key=os.urandom(32);nonce=os.urandom(12);pub=serialization.load_pem_public_key(PUBLIC_KEY)
wrapped=pub.encrypt(key,padding.OAEP(mgf=padding.MGF1(hashes.SHA256()),algorithm=hashes.SHA256(),label=None))
ciphertext=AESGCM(key).encrypt(nonce,buf.getvalue(),b'last-luas-review-v2')
pathlib.Path('/tmp/last-luas-review.encrypted.json').write_text(json.dumps({k:base64.b64encode(v).decode() for k,v in [('wrapped',wrapped),('nonce',nonce),('ciphertext',ciphertext)]}))
print('Four original logo assets encrypted for visual review.')
