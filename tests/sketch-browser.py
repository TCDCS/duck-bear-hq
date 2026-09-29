"""Website-wide visual acceptance using synthetic accounts on the local fixture.
Run after hq-browser.py and site-browser.py. Never use against production.
"""
import json, os, pathlib, re
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect
BASE=os.environ.get('BASE_URL','http://localhost:8789').rstrip('/')
assert urlparse(BASE).hostname in ('localhost','127.0.0.1'), 'Synthetic account browser checks must remain local'
OUT=pathlib.Path(os.environ.get('HQ_REPORT','sketch-browser-report')); OUT.mkdir(parents=True, exist_ok=True)
checks=[]; errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, **({'executable_path':os.environ['CHROMIUM']} if os.environ.get('CHROMIUM') else {}), args=['--no-sandbox'])
    ctx=browser.new_context(viewport={'width':1440,'height':1000})
    page=ctx.new_page(); page.on('pageerror',lambda e:errors.append(str(e)))
    def opened(path,chapter,heading=None):
        page.goto(BASE+path)
        if heading: page.get_by_role('heading',name=heading,exact=True).wait_for()
        else: page.locator('h1').first.wait_for()
        expect(page.locator('body')).to_have_attribute('data-chapter',chapter)
        assert page.evaluate('document.documentElement.classList.contains("sketch-theme")')
        page.evaluate('document.fonts.ready')
        assert page.evaluate('document.fonts.check(\'700 20px "Kalam"\')'), 'Hand lettering failed to load'
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'), (path,'horizontal overflow')
        drawings=page.locator('img.chapter-drawing')
        if drawings.count():
            expect(drawings.first).to_be_visible()
            drawings.first.evaluate('e=>e.decode()')
            assert drawings.first.evaluate('e=>e.complete && e.naturalWidth>0'), (path,'chapter artwork failed')
        checks.append({'path':path,'width':page.viewport_size['width'],'chapter':chapter})
    try:
        opened('/','home')
        page.locator('#shop').scroll_into_view_if_needed()
        page.locator('#publicProducts .public-product').first.wait_for()
        assert not page.locator('[data-signed-in]:visible').count()
        page.screenshot(path=str(OUT/'sketch-home-desktop.png'),full_page=True)
        opened('/menus/','menus')
        assert not page.locator('[data-signed-in]:visible').count()
        page.screenshot(path=str(OUT/'sketch-menu-desktop.png'),full_page=True)
        opened('/menus/archive/2026-09-28/','menus')
        opened('/games/','games')
        page.screenshot(path=str(OUT/'sketch-games-desktop.png'),full_page=True)
        opened('/sign-in/','auth','Come on in')
        page.screenshot(path=str(OUT/'sketch-signin-desktop.png'),full_page=True)
        ctx.add_cookies([{'name':'db_session','value':'owner-token','url':BASE}])
        opened('/our-space/','home','Our little corner')
        page.screenshot(path=str(OUT/'sketch-private-desktop.png'),full_page=True)
        page.locator('#sidebar summary').filter(has_text='Family Tree').click()
        page.locator('#sidebar a[href="/family-tree/people/"]').click()
        page.wait_for_url('**/family-tree/people/')
        expect(page.locator('body')).to_have_attribute('data-chapter','family')
        page.get_by_role('heading',name='Test family person',exact=True).wait_for()
        checks.append({'test':'SPA chapter switch'})
        for path,chapter,name in [
            ('/family-tree/tree/','family','family'),
            ('/scrapbook/','scrapbook','scrapbook'),
            ('/info/','info','info'),
            ('/settings/passkeys/','settings','passkeys'),
            ('/admin/users/','admin','users'),
            ('/admin/users/owner/email/','admin','user-email'),
            ('/plans/','plans','plans')
        ]:
            opened(path,chapter)
            expect(page.get_by_role('heading',name='This page could not open',exact=True)).to_have_count(0)
            expect(page.get_by_role('heading',name='This section is private',exact=True)).to_have_count(0)
            page.screenshot(path=str(OUT/f'sketch-{name}-desktop.png'),full_page=True)
        opened('/settings/appearance/','settings','Appearance')
        page.get_by_label('Theme',exact=True).select_option('night')
        page.get_by_label('Reduce decorative movement',exact=True).check()
        page.get_by_role('button',name='Save settings',exact=True).click()
        expect(page.locator('html')).to_have_class(re.compile(r'\bnight\b'))
        opened('/info/allergies/','info','Hand wash & allergies')
        assert page.locator('html').evaluate('e=>e.classList.contains("night")')
        page.screenshot(path=str(OUT/'sketch-night-desktop.png'),full_page=True)
        opened('/settings/appearance/','settings','Appearance')
        page.get_by_label('Theme',exact=True).select_option('paper')
        page.get_by_label('Reduce decorative movement',exact=True).uncheck()
        page.get_by_role('button',name='Save settings',exact=True).click()
        expect(page.locator('html')).not_to_have_class(re.compile(r'\bnight\b'))
        for width in (390,768):
            page.set_viewport_size({'width':width,'height':844})
            for path,chapter in [('/','home'),('/menus/','menus'),('/games/','games'),('/family-tree/people/','family'),('/scrapbook/','scrapbook'),('/info/','info'),('/settings/passkeys/','settings'),('/admin/users/owner/email/','admin')]:
                opened(path,chapter)
            opened('/our-space/','home','Our little corner')
            toggle=page.locator('#mobile-toggle')
            if toggle.is_visible():
                toggle.click(); expect(page.locator('#sidebar')).to_be_visible()
                expect(toggle).to_have_attribute('aria-expanded','true')
                page.locator('#sidebar summary').filter(has_text='Info Library').click()
                page.locator('#sidebar a[href="/info/"]').click()
                page.get_by_role('heading',name='Info Library',exact=True).wait_for()
                expect(page.locator('body')).to_have_attribute('data-chapter','info')
                expect(page.locator('#sidebar')).not_to_be_visible()
                checks.append({'test':'mobile menu opens and navigates','width':width})
            page.screenshot(path=str(OUT/f'sketch-info-{width}.png'),full_page=True)
        page.set_viewport_size({'width':390,'height':844})
        opened('/','home'); page.locator('#publicProducts .public-product').first.wait_for()
        page.screenshot(path=str(OUT/'sketch-home-mobile.png'),full_page=True)
        page.emulate_media(reduced_motion='reduce')
        assert page.locator('body').evaluate('e=>getComputedStyle(e).animationName')=='none'
        assert not errors, errors
        (OUT/'sketch-browser.json').write_text(json.dumps({'status':'passed','errors':errors,'checks':checks,'fixtureOnly':True},indent=2))
        print('Sketch browser acceptance passed: public/private pages, real artwork/fonts, SPA, mobile menu and night mode')
    except Exception as e:
        page.screenshot(path=str(OUT/'sketch-failure.png'),full_page=True)
        (OUT/'sketch-failure.json').write_text(json.dumps({'error':str(e),'url':page.url,'errors':errors,'body':page.locator('body').inner_text()},indent=2))
        raise
    finally: browser.close()
