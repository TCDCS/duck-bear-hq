from pathlib import Path,PurePosixPath
import base64,lzma,hashlib,json,subprocess
root=Path(__file__).resolve().parents[1]
m=json.loads((root/'.mango-release/READY.json').read_text())
parts=[]
for entry in m['parts']:
 p=root/'.mango-release'/entry['name'];s=p.read_text().strip()
 if hashlib.sha256(s.encode()).hexdigest()!=entry['sha256']:raise SystemExit('Transport hash mismatch: '+entry['name'])
 parts.append(s)
raw=base64.b64decode(''.join(parts),validate=True)
if hashlib.sha256(raw).hexdigest()!=m['sha256']:raise SystemExit('Release payload hash mismatch.')
text=lzma.decompress(raw)
if len(text)>5000000:raise SystemExit('Release exceeds the approved source size.')
data=json.loads(text)
if set(data['files'])!=set(m['files']):raise SystemExit('Manifest differs from archive.')
allowed=('public/games/','public/mango-games.js','src/mango/','migrations/0003_mango_profiles.sql','tests/mango-','tests/helpers/mango-','scripts/mango-','scripts/apply-mango-integration.py','docs/mango-mayhem.md','docs/superpowers/','docs/verification/mango/')
for name,content in data['files'].items():
 p=PurePosixPath(name)
 if p.is_absolute() or '..' in p.parts or not name.startswith(allowed):raise SystemExit('Unapproved destination: '+name)
 if not isinstance(content,str) or len(content)>1000000:raise SystemExit('Invalid source entry.')
 target=root/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_text(content)
patch_file=root/'.mango-release/patches.json'
if patch_file.exists():
 for name,patches in json.loads(patch_file.read_text()).items():
  if name not in data['files']:raise SystemExit('Patch is outside the release manifest.')
  target=root/name;content=target.read_text()
  for patch in patches:
   if content.count(patch['old'])!=1:raise SystemExit('Patch anchor changed: '+name)
   content=content.replace(patch['old'],patch['new'],1)
  target.write_text(content)
subprocess.run(['python','scripts/apply-mango-integration.py'],cwd=root,check=True)
print('Verified and imported',len(data['files']),'source files. No reference photographs or credentials included.')
