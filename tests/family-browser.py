"""Real browser regression of the genealogy redesign; synthetic local records only."""
import asyncio, json, os, struct, zlib, binascii
from pathlib import Path
from playwright.async_api import async_playwright
BASE='http://127.0.0.1:8793'
OUT=Path('family-acceptance'); OUT.mkdir(exist_ok=True)
def synthetic_png():
    def chunk(kind,data):
        return struct.pack('!I',len(data))+kind+data+struct.pack('!I',binascii.crc32(kind+data)&0xffffffff)
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',24,24,8,2,0,0,0))+chunk(b'IDAT',zlib.compress((b'\x00'+bytes([100,150,200])*24)*24))+chunk(b'IEND',b'')
async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,**({'executable_path':os.environ['CHROMIUM']} if os.environ.get('CHROMIUM') else {}))
        ctx=await browser.new_context(viewport={'width':1440,'height':1000})
        await ctx.add_cookies([{'name':'db_session','value':'owner-token','url':BASE}])
        page=await ctx.new_page();errors=[];checks=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        async def visit(path,selector='h1'):
            await page.goto(BASE+path);await page.locator(selector).first.wait_for()
        try:
            await visit('/family-tree/','.genealogy-stage')
            assert '/family-tree/tree/' in page.url
            assert await page.get_by_role('heading',name='Family tree',exact=True).count()==1
            nav=page.locator('.subnav[aria-label="Family Tree pages"]')
            assert await nav.locator('a').all_text_contents()==['Tree','People','Timeline','Locations','Stories','Sources']
            assert await page.locator('.tree-person').count()>=7
            assert await page.locator('#family-tree-svg .edge-adoptive-parent').count()>=2
            assert await page.locator('.tree-person').filter(has_text='Example Wedding Witness').count()==0
            assert await page.evaluate('''()=>{const r=[...document.querySelectorAll('.tree-person')].map(e=>e.getBoundingClientRect());return r.every((a,i)=>r.slice(i+1).every(b=>a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top))}''')
            # A real multi-generation diagram, no card collisions and text not rendered as SVG truncation.
            assert await page.locator('.tree-card-copy strong').count()>=7
            checks.append('genealogy navigation, multi-generation layout, adoption branches and no card overlap')
            await page.screenshot(path=str(OUT/'ancestors-desktop.png'),full_page=True)
            original=await page.locator('[data-scale]').inner_text()
            await page.get_by_role('button',name='Zoom in',exact=True).click()
            assert await page.locator('[data-scale]').inner_text()!=original
            await page.get_by_role('button',name='Fit',exact=True).click()
            await page.locator('.tree-person.is-focus').click()
            preview=page.locator('#tree-preview');await preview.wait_for(state='visible')
            assert await preview.get_by_role('link',name='View profile',exact=True).count()==1
            await page.screenshot(path=str(OUT/'person-preview-desktop.png'),full_page=True)
            await page.get_by_role('button',name='Close person preview',exact=True).click()
            await page.locator('[data-tree-mode=family]').click()
            assert await page.locator('.tree-person').filter(has_text='Charlie Rowan').count()==1
            assert await page.locator('.tree-person').filter(has_text='Robin Ash').count()==1
            await page.screenshot(path=str(OUT/'family-desktop.png'),full_page=True)
            await page.locator('#tree-search').fill('Jordan Rowan')
            await page.locator('[data-search-person]').click()
            assert await page.locator('.tree-person.is-focus').inner_text() and 'Jordan Rowan' in await page.locator('.tree-person.is-focus').inner_text()
            await page.locator('[data-tree-mode=ancestors]').click()
            assert await page.locator('.tree-person').count()==5
            await page.get_by_role('button',name='Home person',exact=True).click()
            assert 'Example Main Person' in await page.locator('.tree-person.is-focus').inner_text()
            checks.append('zoom, fit, person preview, family layout, search, refocus and home')
            await visit('/family-tree/timeline/','#timeline-rows')
            text=await page.locator('#timeline-rows').inner_text()
            assert 'Joined example employer' not in text and 'Won example prize' not in text
            assert 'Family wedding' in text
            assert 'career' not in await page.locator('[name=timeline-type]').inner_text()
            await page.screenshot(path=str(OUT/'timeline-desktop.png'),full_page=True)
            await visit('/family-tree/people/fh_browser__root/timeline/','.family-timeline')
            text=await page.locator('#person-body').inner_text()
            assert 'Joined example employer' not in text and 'Won example prize' not in text
            checks.append('global and individual timelines exclude career and achievement records')
            await visit('/family-tree/map/','#map-place-list')
            assert await page.locator('#family-world-svg a').count()==3
            text=await page.locator('#map-place-list').inner_text()
            for name in ['Office only','Wedding venue only','Historic home only','Unlinked place only']:assert name not in text,name
            for name in ['Example town','Example coast','Example memorial town']:assert name in text,name
            await page.screenshot(path=str(OUT/'locations-desktop.png'),full_page=True)
            await page.locator('[name=map-purpose]').select_option('death')
            assert await page.locator('#family-world-svg a').count()==1
            await page.locator('#family-world-svg a').first.click()
            await page.locator('#map-place-detail h3').wait_for()
            assert 'Example Adoptive Parent' in await page.locator('#map-place-detail').inner_text()
            checks.append('birth, death and current locations only; deceased current residence excluded; clickable pins')
            for old,new in [('events','timeline'),('places','map'),('research','sources')]:
                await visit('/family-tree/'+old+'/')
                await page.wait_for_url('**/family-tree/'+new+'/')
            checks.append('removed tabs safely redirect old bookmarks')
            # Real editor/portrait/remove/restore flow remains intact.
            await visit('/family-tree/people/new/','input[name=name]');await page.locator('input[name=name]').fill('Browser Added Person')
            await page.get_by_role('button',name='Save person',exact=True).click();await page.get_by_role('heading',name='Browser Added Person',exact=True).wait_for()
            url=page.url
            await page.get_by_role('link',name='Edit person',exact=True).click();await page.locator('textarea[name=notes]').fill('A synthetic family note.')
            await page.get_by_role('button',name='Choose portrait',exact=True).click()
            await page.locator('#picker-upload input[name=file]').set_input_files({'name':'synthetic-test-image.png','mimeType':'image/png','buffer':synthetic_png()})
            await page.get_by_role('button',name='Upload and choose',exact=True).click();await page.locator('#avatar-preview img').wait_for()
            await page.get_by_role('button',name='Save person',exact=True).click();await page.get_by_text('A synthetic family note.',exact=True).wait_for()
            assert await page.locator('img[src*=asset_]').count()>=1
            page.once('dialog',lambda dialog:dialog.accept())
            await page.get_by_role('button',name='Remove person',exact=True).click();await page.wait_for_url('**/family-tree/people/')
            await visit('/family-tree/recycle/')
            card=page.locator('article').filter(has=page.get_by_role('heading',name='Browser Added Person',exact=True))
            await card.get_by_role('button',name='Restore',exact=True).click()
            await page.goto(url);await page.get_by_role('heading',name='Browser Added Person',exact=True).wait_for()
            assert await page.locator('img[src*=asset_]').count()>=1
            checks.append('person create/edit, real portrait upload, safe remove and restore')
            for width in [390,768]:
                await page.set_viewport_size({'width':width,'height':900})
                for tab,selector in [('tree','.genealogy-stage'),('people','#family-directory'),('timeline','#timeline-rows'),('map','#map-place-list')]:
                    await visit('/family-tree/'+tab+'/',selector)
                    assert await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'),f'{width} {tab} overflows'
                    await page.screenshot(path=str(OUT/f'{tab}-{width}.png'),full_page=True)
            checks.append('390px and 768px responsive tree, people, timeline and locations')
            # The redesign must not delete archived facts or alter household boundaries.
            response=await ctx.request.get(BASE+'/api/hq/records?kind=lifeEvent')
            facts=(await response.json())['records'];assert any(r['data']['eventType']=='career' for r in facts);assert any(r['data']['eventType']=='achievement' for r in facts)
            await visit('/family-tree/people/fh_browser__root/private/')
            await page.get_by_text('SYNTHETIC-HOUSEHOLD-ONLY',exact=False).wait_for()
            guest=await browser.new_context();await guest.add_cookies([{'name':'db_session','value':'guest-token','url':BASE}])
            response=await guest.request.get(BASE+'/api/hq/records?section=family');assert response.status==200;assert 'SYNTHETIC-HOUSEHOLD-ONLY' not in await response.text()
            response=await guest.request.get(BASE+'/api/hq/records?kind=familyPrivate');assert response.status==403
            unauth=await browser.new_context();response=await unauth.request.get(BASE+'/api/hq/records?section=family');assert response.status==401
            checks.append('archived data retained; household and anonymous access protections preserved')
            assert not errors,errors
            (OUT/'result.json').write_text(json.dumps({'ok':True,'checks':checks,'consoleErrors':errors,'syntheticOnly':True},indent=2))
            print('Family genealogy browser acceptance passed')
        except Exception as error:
            await page.screenshot(path=str(OUT/'failure.png'),full_page=True)
            (OUT/'failure.json').write_text(json.dumps({'error':str(error),'url':page.url,'checks':checks,'consoleErrors':errors,'body':await page.locator('body').inner_text()},indent=2))
            raise
        finally:await browser.close()
asyncio.run(main())
