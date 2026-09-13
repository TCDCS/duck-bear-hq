"""Two isolated browser profiles using the real local auth + D1 save endpoints."""
from pathlib import Path
import json,os,re,urllib.parse
from playwright.sync_api import sync_playwright
BASE=os.environ.get('BASE_URL','http://127.0.0.1:8787').rstrip('/')
if urllib.parse.urlparse(BASE).hostname not in ('127.0.0.1','localhost'):raise SystemExit('This script only uses local test identities.')
fixture=json.loads(Path('.wrangler/mango-test.json').read_text())['users'];OUT=Path('verification/mango/cloud-browser');OUT.mkdir(parents=True,exist_ok=True);checks=[]
def check(name,value):
 checks.append({'name':name,'passed':bool(value)});print(('PASS ' if value else 'FAIL ')+name,flush=True)
 if not value:raise AssertionError(name)
def game(page):
 page.goto(BASE+'/games/mango-mayhem/?verify=1',wait_until='networkidle')
 page.get_by_role('button',name='Players',exact=True).wait_for()
def sign_in(page,index=0):
 page.get_by_role('button',name='Players',exact=True).click();page.locator('#loginForm [name=username]').fill(fixture[index]['username']);page.locator('#loginForm [name=password]').fill(fixture[index]['password']);page.locator('#loginForm button[type=submit]').click();page.get_by_role('button',name='Sign out',exact=True).wait_for()
def hud_mangos(page):return int(page.locator('#mangoCount').inner_text().strip() or '0')
def selected_profile_mangos(page):
 text=page.locator('.profile-row.selected .profile-details small').inner_text();match=re.search(r'(\d+) mangos',text);return int(match.group(1)) if match else -1
def storage_values(context):
 state=context.storage_state();return [item.get('value','') for origin in state.get('origins',[]) for item in origin.get('localStorage',[])]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--no-sandbox']);a=b.new_context(viewport={'width':1200,'height':900});c=b.new_context(viewport={'width':1200,'height':900});pa=a.new_page();pc=c.new_page();errors=[]
 for page in [pa,pc]:page.on('pageerror',lambda e:errors.append(str(e)))
 try:
  game(pa);sign_in(pa);pa.locator('#createProfileForm [name=nickname]').fill('Cloud Browser');pa.locator('#createProfileForm button[type=submit]').click();pa.get_by_role('button',name='Save selected player to my account').click()
  pa.locator('#saveStatus').filter(has_text='Cloud saved').wait_for()
  check('device A uploaded through signed-in UI',pa.locator('.cloud-list button').count()>=1)
  game(pc);sign_in(pc);pc.locator('.cloud-list button').filter(has_text='Cloud Browser').click();pc.get_by_role('button',name='Back',exact=True).click();pc.get_by_role('button',name='Continue adventure').click();pc.get_by_role('button',name='Skip story & play').click()
  pc.keyboard.down('ArrowRight');pc.wait_for_timeout(800);pc.keyboard.up('ArrowRight');pc.keyboard.press('Escape');pc.wait_for_timeout(500)
  check('device B collected mangos in the actual game',hud_mangos(pc)>0)
  pc.get_by_role('button',name='Main menu',exact=True).click();pc.get_by_role('button',name='Players',exact=True).click();pc.get_by_role('button',name='Refresh cloud saves',exact=True).click();pc.wait_for_timeout(300)
  pa.get_by_role('button',name='Refresh cloud saves',exact=True).click();pa.wait_for_timeout(300)
  check('device A receives device B progress',selected_profile_mangos(pa)>0)
  pc.get_by_role('button',name='Back',exact=True).click();pc.get_by_role('button',name='Continue adventure').click();pc.get_by_role('button',name='Skip story & play').click();c.set_offline(True)
  pc.keyboard.down('ArrowRight');pc.wait_for_timeout(1900);pc.keyboard.up('ArrowRight');pc.keyboard.press('Escape');before=hud_mangos(pc)
  check('offline gameplay retained collected mangos',before>0 and 'device' in pc.locator('#saveStatus').inner_text().lower())
  c.set_offline(False);pc.wait_for_timeout(900);pc.get_by_role('button',name='Main menu',exact=True).click();pc.get_by_role('button',name='Players',exact=True).click();pc.get_by_role('button',name='Refresh cloud saves',exact=True).click();pc.wait_for_timeout(500)
  pa.get_by_role('button',name='Refresh cloud saves',exact=True).click();pa.wait_for_timeout(500)
  check('offline queue reached the other browser',selected_profile_mangos(pa)>=before)
  pa.screenshot(path=str(OUT/'two-device-profile.png'))
  check('password fields are not stored in local saves',all('password' not in value.lower() for value in storage_values(a)))
  check('no browser runtime errors',not errors)
 finally:
  (OUT/'report.json').write_text(json.dumps({'checks':checks,'errors':errors,'passed':all(c['passed'] for c in checks)},indent=2));b.close()
