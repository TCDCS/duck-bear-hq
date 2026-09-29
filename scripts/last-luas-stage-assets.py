"""Stage authentic shop marks in the existing private R2 bucket.
Only source URLs, hashes and status are logged. No new bucket or public access.
"""
import pathlib,tempfile,urllib.request,re,hashlib,json,subprocess
ASSET_SET='inked-20260919-a'
SOURCES=[('hodges','png','https://cdn.hodgesfiggis.ie/images/00296384-700x162.png','5b731c8a0ff900c11ee8b16278f1350756a5835604a685c94cae3dabf4d607cb'),('cafe','svg','https://www.cafeenseine.ie/wp-content/themes/sitetheme/library/images/logo.svg','0db7f71057e5cd77f90defc10872c4de39053fb71b66840952ea6ad012418727'),('pret','png','https://images.ctfassets.net/4zu8gvmtwqss/4J3tq43hFKDHLTwPXX2YBb/ee4fbeaa8ea7b08f41ec974168af5927/pret-a-manger-logo.png','b3416a14ea5fb3184f0ec8cb08efe878f81a1db52aa9b38f477e2911108ccbf0'),('ivy','svg','https://ivycollection.com/restaurants-near-me/the-ivy-ireland/the-ivy-dawson-street-dublin/','63a6a18f0b279ce1231042a3b1bc2e031dd2b0c4229eba66db866db400e064d2')]
def put(path,key,mime):
 r=subprocess.run(['npx','--no-install','wrangler','r2','object','put','duck-bear-hq-media/'+key,'--file',str(path),'--content-type',mime,'--remote'],capture_output=True,text=True)
 if r.returncode:raise RuntimeError('Private R2 upload failed for '+path.name+'; check existing R2 write permission. '+re.sub(r'\x1b\[[0-9;]*m','',r.stderr)[-900:])
 print('Private R2 object staged:',path.name)
with tempfile.TemporaryDirectory() as td:
 root=pathlib.Path(td);manifest={'assetSet':ASSET_SET,'brands':[],'rights':'Marks remain owned by their respective proprietors; private contextual identity reference, no endorsement or licence claimed.'}
 for name,ext,url,sha in SOURCES:
  with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 DuckBear private reference'}),timeout=30) as r:raw=r.read(2000000)
  if name=='ivy':
   html=raw.decode();svg=next(s for s in re.findall(r'<svg\b[\s\S]*?</svg>',html) if '562.8177' in s);raw=svg.replace('viewbox=','viewBox=').replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" fill="#ffffff" ',1).encode()
  if hashlib.sha256(raw).hexdigest()!=sha:raise RuntimeError('Source changed; review required for '+name)
  if ext=='svg' and re.search(rb'<script|<foreignObject|(?:href|src)=[\"\'](?:https?:|//)',raw,re.I):raise RuntimeError('Active/external SVG content rejected: '+name)
  if ext=='png' and not raw.startswith(b'\x89PNG\r\n\x1a\n'):raise RuntimeError('Not a PNG: '+name)
  path=root/(name+'.'+ext);path.write_bytes(raw);mime='image/svg+xml' if ext=='svg' else 'image/png';put(path,'last-luas/inked/'+ASSET_SET+'/brands/'+path.name,mime)
  manifest['brands'].append({'id':name,'file':path.name,'mime':mime,'bytes':len(raw),'sha256':sha,'source':url,'authenticity':'official-web-artwork','frontageVariant':'website identity; physical fascia variant not certified','reusedUnder':'private contextual brand identification; rights not transferred'})
 p=root/'manifest.json';p.write_text(json.dumps(manifest,indent=2));put(p,'last-luas/inked/'+ASSET_SET+'/manifest.json','application/json')
 print('All four official-source logos staged privately; manifest published last.')
