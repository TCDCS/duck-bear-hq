"""Reconciliation browser checks, synthetic data only; run after hq-browser.py."""
import os,json,pathlib
from playwright.sync_api import sync_playwright
BASE=os.environ.get('BASE_URL','http://127.0.0.1:8789')
OUT=pathlib.Path(os.environ.get('HQ_REPORT','/mnt/data/hq-browser'));OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,**({'executable_path':os.environ['CHROMIUM']} if os.environ.get('CHROMIUM') else {}),args=['--no-sandbox'])
 ctx=browser.new_context(viewport={'width':1440,'height':1000});page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 try:
  page.goto(BASE+'/');page.locator('#shop').scroll_into_view_if_needed();page.locator('#publicProducts .public-product').first.wait_for()
  assert not page.locator('[data-signed-in]:visible').count()
  page.screenshot(path=str(OUT/'homepage-desktop.png'),full_page=True)
  for path in ['/info/','/info/index.html','/about/','/about/index.html']:
   res=ctx.request.get(BASE+path,max_redirects=0);assert res.status==302,(path,res.status)
  ctx.add_cookies([{'name':'db_session','value':'owner-token','url':BASE}])
  page.goto(BASE+'/info/');page.get_by_role('heading',name='Info Library',exact=True).wait_for()
  page.get_by_role('link',name='Add page',exact=True).click()
  page.get_by_label('Page title',exact=True).fill('Browser fixture useful note')
  page.get_by_label('Category',exact=True).fill('Fixture notes')
  page.get_by_label('Short summary',exact=True).fill('A saved note for browser acceptance.')
  page.get_by_label('Page content',exact=True).fill('Keep this information.\n<script>window.unsafeExecuted=true</script>')
  page.get_by_label('Reference link',exact=True).fill('https://example.com/reference')
  page.get_by_role('button',name='Save page',exact=True).click()
  page.get_by_role('heading',name='Browser fixture useful note',exact=True).wait_for()
  note_url=page.url;page.reload();page.get_by_text('Keep this information.',exact=False).wait_for()
  assert not page.evaluate('Boolean(window.unsafeExecuted)')
  page.get_by_role('link',name='Edit',exact=True).click()
  page.get_by_label('Page title',exact=True).fill('Updated useful note')
  page.get_by_role('button',name='Save page',exact=True).click();page.get_by_role('heading',name='Updated useful note',exact=True).wait_for()
  page.goto(BASE+'/info/');page.get_by_label('Search',exact=True).fill('Updated useful note');page.get_by_role('button',name='Search',exact=True).click();page.get_by_role('heading',name='Updated useful note',exact=True).wait_for()
  page.goto(BASE+'/info/allergies/');page.get_by_role('heading',name='Hand wash & allergies',exact=True).wait_for();page.screenshot(path=str(OUT/'info-desktop.png'),full_page=True)
  page.goto(BASE+'/about/');page.get_by_role('heading',name='Our little corner',exact=True).wait_for()
  page.goto(BASE+'/settings/updates/');page.get_by_role('heading',name='Website 7.4.2',exact=True).wait_for()
  page.goto(BASE+'/hub/#family');page.wait_for_url('**/family-tree/');page.get_by_role('heading').first.wait_for()
  for width in [390,768]:
   page.set_viewport_size({'width':width,'height':844})
   for path in ['/info/','/info/allergies/','/about/','/settings/updates/','/','/sign-in/']:
    page.goto(BASE+path);page.locator('h1').wait_for();assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'),(width,path)
   page.goto(BASE+'/info/');page.locator('h1').wait_for();page.screenshot(path=str(OUT/f'info-{width}.png'),full_page=True)
  guest=browser.new_context();guest.add_cookies([{'name':'db_session','value':'guest-token','url':BASE}]);gp=guest.new_page();gp.goto(note_url);gp.get_by_role('heading',name='Updated useful note',exact=True).wait_for();assert not gp.get_by_role('link',name='Edit',exact=True).count()
  gp.goto(BASE+'/scrapbook/');gp.get_by_role('heading',name='This section is private',exact=True).wait_for()
  assert not errors,errors
  (OUT/'reconciliation-browser.json').write_text(json.dumps({'status':'passed','errors':errors,'tests':['public nav','direct URL authentication','library create/edit/reload/search','escaped content','reference link','allergies alias','About','version log','old Home link','390px and 768px overflow','signed-in reader','scrapbook denial']},indent=2))
  print('Site reconciliation browser acceptance passed')
 except Exception as e:
  page.screenshot(path=str(OUT/'site-failure.png'),full_page=True)
  (OUT/'site-failure.json').write_text(json.dumps({'error':str(e),'url':page.url,'browserErrors':errors,'body':page.locator('body').inner_text()},ensure_ascii=False,indent=2));raise
 finally:browser.close()
