"""Read-only source audit. No credentials, user data or logo bytes in output."""
import json, pathlib, re, urllib.request, urllib.parse, xml.etree.ElementTree as ET
out=pathlib.Path('/tmp/last-luas-reference');out.mkdir(exist_ok=True)
headers={'User-Agent':'DuckBear-LastLuas-reference/1.0 (private game development)'}
def read(url):
 with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=30) as r:return r.read(12000000)
report={}
for name,url in [('hodges','https://www.hodgesfiggis.ie/'),('cafe','https://www.cafeenseine.ie/'),('ivy','https://ivycollection.com/restaurants-near-me/the-ivy-ireland/the-ivy-dawson-street-dublin/'),('arket','https://www.arket.com/en-eu/'),('luas','https://www.luas.ie/stops/dawson/')]:
 try:
  text=read(url).decode('utf8','replace');candidates=[]
  for m in re.finditer(r'(?:src|href|content|data-src)=[\"\']([^\"\']+)[\"\']',text):
   p=m.group(1)
   if re.search(r'logo|brand|\.svg',p,re.I):candidates.append(urllib.parse.urljoin(url,p))
  report[name]={'url':url,'candidates':list(dict.fromkeys(candidates))[:60], 'inlineSvgClasses':re.findall(r'<svg\b([^>]{0,800})>',text)[:20]}
 except Exception as e:report[name]={'url':url,'error':str(e)}
try:
 url='https://api.openstreetmap.org/api/0.6/map?bbox=-6.2601,53.3390,-6.2565,53.3432';raw=read(url);(out/'dawson.osm').write_bytes(raw);root=ET.fromstring(raw);nodes={n.attrib['id']:{'lat':float(n.attrib['lat']),'lon':float(n.attrib['lon'])} for n in root.findall('node')};features=[]
 for e in root:
  tags={x.attrib['k']:x.attrib['v'] for x in e.findall('tag')};pts=[nodes[x.attrib['ref']] for x in e.findall('nd') if x.attrib['ref'] in nodes]
  if e.tag=='node' and tags:pts=[nodes[e.attrib['id']]]
  if tags and (tags.get('name') or tags.get('building') or tags.get('railway') or tags.get('public_transport')):features.append({'type':e.tag,'id':e.attrib.get('id'),'tags':tags,'points':pts})
 (out/'features.json').write_text(json.dumps(features,indent=2));report['osm']={'source':url,'features':len(features),'licence':'ODbL-1.0','attribution':'© OpenStreetMap contributors'}
except Exception as e:report['osm']={'error':str(e)}
(out/'official-sources.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
