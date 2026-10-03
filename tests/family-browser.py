"""Real browser acceptance on synthetic local data. No private family screenshots."""
import asyncio, json, os, struct, zlib, binascii
from pathlib import Path
from playwright.async_api import async_playwright
BASE='http://127.0.0.1:8793'
def synthetic_png():
    def chunk(kind,data):
        return struct.pack('!I',len(data))+kind+data+struct.pack('!I',binascii.crc32(kind+data)&0xffffffff)
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',24,24,8,2,0,0,0))+chunk(b'IDAT',zlib.compress((b'\x00'+bytes([100,150,200])*24)*24))+chunk(b'IEND',b'')
async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True)
        ctx=await browser.new_context(viewport={'width':1440,'height':960})
        await ctx.add_cookies([{'name':'db_session','value':'owner-token','url':BASE}])
        page=await ctx.new_page(); errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        await page.goto(BASE+'/family-tree/');await page.get_by_role('heading',name='Family history',exact=True).wait_for()
        assert await page.locator('.family-root-card').inner_text() and await page.locator('.family-root-card').get_by_text('Example Main Person',exact=True).count()
        await page.goto(BASE+'/family-tree/tree/');await page.locator('#family-tree-svg').wait_for()
        assert await page.locator('#family-tree-svg').get_by_text('Example Main Person',exact=True).count()
        assert await page.locator('#family-tree-svg').get_by_text('Example Adoptive',exact=False).count()
        await page.goto(BASE+'/family-tree/timeline/');await page.get_by_text('Jan 2010',exact=True).wait_for()
        await page.goto(BASE+'/family-tree/map/');await page.locator('#family-world-svg').wait_for()
        assert await page.locator('#family-world-svg a').count()>=1
        await page.goto(BASE+'/family-tree/people/fh_browser__root/private/');await page.get_by_text('SYNTHETIC-HOUSEHOLD-ONLY',exact=False).wait_for()
        await page.goto(BASE+'/family-tree/people/new/');await page.locator('input[name=name]').fill('Browser Added Person')
        await page.get_by_role('button',name='Save person',exact=True).click();await page.get_by_role('heading',name='Browser Added Person',exact=True).wait_for()
        url=page.url
        await page.get_by_role('link',name='Edit person',exact=True).click();await page.locator('textarea[name=notes]').fill('A synthetic life story for browser acceptance.')
        await page.get_by_role('button',name='Choose portrait',exact=True).click()
        await page.locator('#picker-upload input[name=file]').set_input_files({'name':'synthetic-test-image.png','mimeType':'image/png','buffer':synthetic_png()})
        await page.get_by_role('button',name='Upload and choose',exact=True).click()
        await page.locator('#avatar-preview img').wait_for()
        await page.get_by_role('button',name='Save person',exact=True).click();await page.get_by_text('A synthetic life story for browser acceptance.',exact=True).wait_for()
        assert await page.locator('img[src*=asset_]').count()>=1
        page.once('dialog',lambda dialog:dialog.accept())
        await page.get_by_role('button',name='Remove person',exact=True).click()
        await page.wait_for_url('**/family-tree/people/')
        await page.goto(BASE+'/family-tree/recycle/');card=page.locator('article').filter(has=page.get_by_role('heading',name='Browser Added Person',exact=True))
        await card.get_by_role('button',name='Restore',exact=True).click()
        await page.goto(url);await page.get_by_role('heading',name='Browser Added Person',exact=True).wait_for()
        assert await page.locator('img[src*=asset_]').count()>=1
        await page.set_viewport_size({'width':390,'height':844});await page.goto(BASE+'/family-tree/');await page.locator('.family-root-card').wait_for()
        assert await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'), 'Mobile page overflows'
        os.makedirs('family-acceptance',exist_ok=True)
        await page.screenshot(path='family-acceptance/mobile-overview.png',full_page=True)
        await page.set_viewport_size({'width':1440,'height':960});await page.goto(BASE+'/family-tree/map/');await page.locator('#family-world-svg').wait_for()
        await page.screenshot(path='family-acceptance/world-map.png',full_page=True)
        guest=await browser.new_context();await guest.add_cookies([{'name':'db_session','value':'guest-token','url':BASE}])
        api=await guest.request.get(BASE+'/api/hq/records?section=family');assert api.status==200;assert 'SYNTHETIC-HOUSEHOLD-ONLY' not in await api.text()
        denied=await guest.request.get(BASE+'/api/hq/records?kind=familyPrivate');assert denied.status==403
        unauth=await browser.new_context();denied=await unauth.request.get(BASE+'/api/hq/records?section=family');assert denied.status==401
        assert not errors,errors
        Path('family-acceptance/result.json').write_text(json.dumps({'ok':True,'tested':['overview','biological/adoptive tree','timeline','world map','person create/edit/remove/restore','real portrait upload retained after restore','household private details','mobile width','guest privacy','unauthenticated rejection'],'consoleErrors':errors},indent=2))
        print('Family browser acceptance passed')
        await browser.close()
asyncio.run(main())
