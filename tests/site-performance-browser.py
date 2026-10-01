"""Local synthetic-data browser checks; never use production accounts."""
import os,json,pathlib
from playwright.sync_api import sync_playwright
BASE=os.environ.get('BASE_URL','http://127.0.0.1:8789')
OUT=pathlib.Path(os.environ.get('HQ_REPORT','/mnt/data/hq-browser'));OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,**({'executable_path':os.environ['CHROMIUM']} if os.environ.get('CHROMIUM') else {}),args=['--no-sandbox'])
 errors=[];checks=[]
 try:
  ctx=browser.new_context(viewport={'width':1440,'height':900},service_workers='block');page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));requests=[];page.on('request',lambda r:requests.append(r.url))
  page.goto(BASE+'/sign-in/');page.get_by_role('button',name='Sign in with a passkey').wait_for();page.wait_for_load_state('networkidle')
  for name in ['trips','views','settings','forms','images','shop','adults']:assert not any('/hq/'+name+'.mjs' in url for url in requests),name
  checks.append('Sign-in excludes private feature modules')
  page.goto(BASE+'/');page.locator('#public-hero').wait_for();page.wait_for_timeout(1800)
  assert not any('/api/public/catalogue' in url for url in requests)
  assert page.locator('#public-hero').evaluate('(img)=>img.complete && img.naturalWidth>0')
  assert 'causeway-v1' in page.locator('link[rel="apple-touch-icon"]').get_attribute('href')
  page.screenshot(path=str(OUT/'speed-home-desktop.png'),full_page=True)
  page.locator('#shop').scroll_into_view_if_needed();page.locator('#publicProducts .public-product').first.wait_for();checks.append('Catalogue loads on approach, not at idle; hero and icon metadata load')
  mobile=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,service_workers='block');mp=mobile.new_page();mp.on('pageerror',lambda e:errors.append(str(e)));mp.goto(BASE+'/');mp.locator('#public-hero').wait_for();mp.wait_for_load_state('networkidle')
  assert mp.locator('#public-hero').evaluate('(img)=>img.complete && img.naturalWidth>0')
  assert 'causeway-v1-480.webp' in mp.locator('#public-hero').evaluate('(img)=>img.currentSrc')
  assert mp.evaluate('document.documentElement.scrollWidth <= innerWidth+1')
  mp.screenshot(path=str(OUT/'speed-home-mobile.png'),full_page=True);checks.append('390px mobile uses 480px WebP without horizontal overflow')
  assert not errors,errors
  (OUT/'site-performance-browser.json').write_text(json.dumps({'ok':True,'checks':checks,'errors':errors},indent=2))
 finally:browser.close()
