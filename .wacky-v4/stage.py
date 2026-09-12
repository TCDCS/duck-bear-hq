"""Commit only after unit, bundle and native two-browser checks have passed."""
import hashlib,json,os,shutil,subprocess
from pathlib import Path
manifest=json.loads(Path('.wacky-v4/manifest.json').read_text())
def blob(data):return hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
for name,expected in manifest.items():
 if blob(Path(name).read_bytes())!=expected:raise SystemExit('Tested source changed: '+name)
report=json.loads(Path('verification/browser-clients.json').read_text())
if not report.get('passed') or not report.get('mode','').startswith('native browser'):raise SystemExit('Native browser verification has not passed.')
branch=os.environ['GITHUB_REF_NAME']
if branch!='build/wacky-final-20260912':raise SystemExit('This script only writes the isolated release branch.')
Path('docs/verification').mkdir(exist_ok=True)
Path('docs/verification/wacky-v4.json').write_text(json.dumps(report,indent=2)+'\n')
shutil.rmtree('.wacky-v4')
subprocess.check_call(['git','config','user.name','github-actions[bot]'])
subprocess.check_call(['git','config','user.email','41898282+github-actions[bot]@users.noreply.github.com'])
paths=list(manifest)+['docs/verification/wacky-v4.json','.wacky-v4']
if Path('package-lock.json').exists():paths.append('package-lock.json')
subprocess.check_call(['git','add','--',*paths])
subprocess.check_call(['git','commit','-m','Release verified Wacky Races: public homepage, cartoon drivers and online rooms'])
subprocess.check_call(['git','push','origin','HEAD:refs/heads/'+branch])
print('Verified materialised source committed to isolated branch. Main has not been changed.')
