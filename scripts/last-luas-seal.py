"""Seal branded browser captures to the review key; never upload plaintext captures."""
import base64,io,json,os,pathlib,sys,zipfile
from cryptography.hazmat.primitives import serialization,hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
PUBLIC_KEY=b'-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAio49Xw4a/43akD4euh6b\nQA5h6MRjzz/POWxEFaRu4nfeCE9IIn4oYh/6z8kSlTGvxRx4pDoIDL3VPGt8cgr3\nhTHVkDMFoGubqSomhoPxNt7HQfqEvi+T3HX/+pSOrbh+4CSrQawAbMkZ3j3RGHA5\nElKMBhJd92vfAVZuSBjbnmQtq4C/tw0hIfQIbM0+SKesTJxm8miW0RFrIxETluee\ny5ZW+YEy/ju/yAG5Ofv6hs8T3mRC4EOhkoB2D9I2PVx5Z9lyRsfqODKnD+LRKbrg\nyIROAaZYcFyY7A8yYiB9mepAHnAk3bEvCWJSoNY4OEE/TW8Wro68FNOTqdSZuQlV\n8wIDAQAB\n-----END PUBLIC KEY-----\n'
root=pathlib.Path(sys.argv[1]);out=pathlib.Path(sys.argv[2]);buf=io.BytesIO()
with zipfile.ZipFile(buf,'w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(root.glob('*')):
  if p.is_file() and (p.suffix=='.png' or p.name=='report.json'):z.write(p,p.name)
key=os.urandom(32);nonce=os.urandom(12)
wrapped=serialization.load_pem_public_key(PUBLIC_KEY).encrypt(key,padding.OAEP(mgf=padding.MGF1(hashes.SHA256()),algorithm=hashes.SHA256(),label=None))
ct=AESGCM(key).encrypt(nonce,buf.getvalue(),b'last-luas-ci-20260919')
out.write_text(json.dumps({k:base64.b64encode(v).decode() for k,v in [('wrapped',wrapped),('nonce',nonce),('ciphertext',ct)]}))
print('Browser capture pack encrypted. No plaintext artwork or session data exported.')
