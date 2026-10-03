"""Local synthetic acceptance: extended relationships, confidentiality and printable PDFs."""
import asyncio,json,os
from pathlib import Path
from playwright.async_api import async_playwright, expect
BASE='http://127.0.0.1:8793'; OUT=Path('family-acceptance/books'); OUT.mkdir(parents=True,exist_ok=True)
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,**({'executable_path':os.environ['CHROMIUM']} if os.environ.get('CHROMIUM') else {}))
  ctx=await browser.new_context(viewport={'width':1440,'height':1000});await ctx.add_cookies([{'name':'db_session','value':'owner-token','url':BASE}])
  page=await ctx.new_page();errors=[];checks=[];page.on('pageerror',lambda e:errors.append(str(e)))
  try:
   await page.goto(BASE+'/family-tree/tree/?view=family');await page.locator('.tree-person.is-focus').wait_for()
   await page.locator('[data-tree-mode=family]').click()
   await page.get_by_label('Extended family',exact=True).check()
   assert await page.locator('.tree-person').filter(has_text='Example Aunt').count()==1
   assert await page.locator('.tree-person').filter(has_text='Example Cousin').count()==1
   await page.get_by_label('Extended ancestry',exact=True).check()
   assert await page.locator('.tree-person').filter(has_text='Example Earlier Ancestor').count()==1
   await page.get_by_role('button',name='Fit',exact=True).click()
   await page.screenshot(path=str(OUT/'extended-family.png'),full_page=True)
   checks.append('Extended family and extended ancestry show real relatives without changing records')
   await page.goto(BASE+'/family-tree/people/fh_browser__root/private/');await page.get_by_text('SYNTHETIC-ALLERGEN',exact=True).wait_for()
   await page.get_by_text('Example recorded faith',exact=False).first.wait_for()
   await page.goto(BASE+'/family-tree/people/fh_browser__root/');await page.get_by_role('heading',name='Names and meanings').wait_for()
   assert 'أحمد' in await page.locator('#person-body').inner_text()
   checks.append('Unicode name meanings and household-only faith and allergies render')
   for width in [390,768]:
    await page.set_viewport_size({'width':width,'height':900});await page.goto(BASE+'/family-tree/tree/');await page.locator('.tree-person').first.wait_for();await page.locator('[data-tree-mode=family]').click()
    await page.get_by_label('Extended family',exact=True).check();await page.get_by_label('Extended ancestry',exact=True).check()
    assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    await page.screenshot(path=str(OUT/f'extended-{width}.png'),full_page=True)
   await page.set_viewport_size({'width':1440,'height':1000})
   await page.goto(BASE+'/family-tree/export/');await page.get_by_role('heading',name='Books & PDF export',exact=True).wait_for()
   assert await page.locator('#book-private').is_disabled()
   await page.locator('#book-faith').check();await page.locator('#book-title').fill('Our synthetic family book')
   await page.get_by_role('button',name='Build preview',exact=True).click();await expect(page.locator('#book-print')).to_be_enabled(timeout=30000)
   frame=page.frames[-1];body=await frame.locator('body').inner_text()
   for absent in ['SYNTHETIC-ALLERGEN','SYNTHETIC-HOUSEHOLD-ONLY','Joined example employer','Won example prize']:assert absent not in body,absent
   assert 'Example recorded faith' in body and 'Our family remembers days together.' in body
   # Render exactly the HTML used by the print preview, using the signed-in cookie context.
   html=await frame.content();render=await ctx.new_page();await render.goto(BASE+'/family-tree/export/');await render.set_content(html,wait_until='networkidle');await render.evaluate('document.fonts.ready')
   await render.pdf(path=str(OUT/'child-book.pdf'),format='A4',print_background=True,prefer_css_page_size=True)
   await render.screenshot(path=str(OUT/'book-cover.png'),full_page=False);await render.close()
   checks.append('Child PDF contains approved text and opt-in faith, not raw careers or household information')
   # Changing settings invalidates the printable snapshot, preventing stale confidential output.
   await page.locator('#book-title').fill('Changed title');assert await page.locator('#book-print').is_disabled();assert await page.locator('iframe.family-book-preview').count()==0
   await page.locator('[name=book-format]').select_option('reference');await page.locator('#book-private').check()
   await page.get_by_role('button',name='Build preview',exact=True).click();await expect(page.locator('#book-print')).to_be_enabled(timeout=30000)
   frame=page.frames[-1];body=await frame.locator('body').inner_text()
   for present in ['SYNTHETIC-ALLERGEN','SYNTHETIC-HOUSEHOLD-ONLY','Joined example employer','Won example prize']:assert present in body,present
   checks.append('Reference edition includes full stored events and explicit confidential appendix; settings invalidate old preview')
   await page.locator('[name=book-format]').select_option('tree');assert not await page.locator('#book-private').is_checked()
   await page.get_by_role('button',name='Build preview',exact=True).click();await expect(page.locator('#book-print')).to_be_enabled(timeout=30000)
   frame=page.frames[-1];assert await frame.locator('.sheet').count()>=16
   checks.append('Whole-tree export contains a readable connected sheet for every person')
   for width in [390,768]:
    await page.set_viewport_size({'width':width,'height':900});assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');await page.screenshot(path=str(OUT/f'book-controls-{width}.png'),full_page=True)
   guest=await browser.new_context();await guest.add_cookies([{'name':'db_session','value':'guest-token','url':BASE}]);assert (await guest.request.get(BASE+'/api/hq/family/book')).status==403
   unauth=await browser.new_context();assert (await unauth.request.get(BASE+'/api/hq/family/book')).status==401
   checks.append('Book endpoint rejects anonymous access and guests without export permission')
   assert not errors,errors
   (OUT/'result.json').write_text(json.dumps({'ok':True,'checks':checks,'consoleErrors':errors,'syntheticOnly':True},indent=2));print('Family books browser acceptance passed')
  except Exception as error:
   await page.screenshot(path=str(OUT/'failure.png'),full_page=True);(OUT/'failure.json').write_text(json.dumps({'error':str(error),'url':page.url,'body':await page.locator('body').inner_text(),'errors':errors},indent=2));raise
  finally:await browser.close()
asyncio.run(main())
