import hashlib,json,os,shutil,subprocess
from pathlib import Path

def blob(data):return hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
files=json.loads(Path('/tmp/setup-release-files.json').read_text())
for p,expected in files.items():
 if blob(Path(p).read_bytes())!=expected:raise SystemExit('Tested source changed: '+p)
for name in ['setup-browser.json','seven-player-live.json','browser-clients.json']:
 report=json.loads(Path('verification',name).read_text())
 if report.get('passed') is not True:raise SystemExit('Verification did not pass: '+name)
summary={'sourceFiles':files,'setup':json.loads(Path('verification/setup-browser.json').read_text()),'multiplayer':json.loads(Path('verification/seven-player-live.json').read_text()),'browserRace':json.loads(Path('verification/browser-clients.json').read_text())}
Path('docs/verification/setup-seven.json').write_text(json.dumps(summary,indent=2))
shutil.rmtree('.race-update');Path('.github/workflows/setup-release.yml').unlink()
subprocess.check_call(['git','config','user.name','github-actions[bot]'])
subprocess.check_call(['git','config','user.email','41898282+github-actions[bot]@users.noreply.github.com'])
subprocess.check_call(['git','add','--',*files.keys(),'docs/verification/setup-seven.json','.race-update','.github/workflows/setup-release.yml'])
subprocess.check_call(['git','commit','-m','Verify menu-first setup, live race order and seven-racer grids'])
subprocess.check_call(['git','push','origin','HEAD:refs/heads/'+os.environ['GITHUB_REF_NAME']])
print('Verified source is on the isolated update branch; production has not been changed.',flush=True)
