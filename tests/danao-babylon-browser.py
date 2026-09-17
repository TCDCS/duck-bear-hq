"""Native browser acceptance for the Babylon/Rapier Danao migration."""
from pathlib import Path
import json, os
from playwright.sync_api import sync_playwright

BASE=os.environ.get('BASE_URL','http://127.0.0.1:8787').rstrip('/')
OUT=Path(os.environ.get('DANAO_REPORT_DIR','verification/danao-babylon'));OUT.mkdir(parents=True,exist_ok=True)
report={'base':BASE,'checks':[],'errors':[],'engineRequests':[]}

def check(name,value,detail=None):
    report['checks'].append({'name':name,'passed':bool(value),'detail':detail})
    print(('PASS ' if value else 'FAIL ')+name,flush=True)
    if not value: raise AssertionError(f'{name}: {detail}')

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--use-angle=swiftshader'])
    context=browser.new_context(viewport={'width':1280,'height':800})
    page=context.new_page();page.set_default_timeout(30000)
    page.on('pageerror',lambda e:report['errors'].append('pageerror: '+str(e)))
    page.on('console',lambda m:report['errors'].append(f'console {m.type}: {m.text}') if m.type=='error' else None)
    page.on('requestfailed',lambda r:report['engineRequests'].append({'url':r.url,'failed':str(r.failure)}) if '/games/danao/build/' in r.url else None)
    page.on('response',lambda r:report['engineRequests'].append({'url':r.url,'status':r.status}) if '/games/danao/build/' in r.url else None)
    try:
        page.goto(BASE+'/games/danao/',wait_until='networkidle')
        check('Chinese title visible',page.get_by_text('打闹',exact=True).count()>=1)
        check('native Local Play button visible',page.get_by_role('button',name='LOCAL PLAY').is_visible())
        check('entry bundle is same-origin',any(x.get('url','').startswith(BASE+'/games/danao/build/game.js') and x.get('status')==200 for x in report['engineRequests']),report['engineRequests'])
        page.get_by_role('button',name='LOCAL PLAY').click()
        check('Local Play opens setup without Unity',page.locator('#local-setup').is_visible() and page.locator('#arena-select').is_visible())
        page.locator('#arena-select').select_option('wrestling-arena')
        page.locator('#character-select').select_option('character-hero')
        page.locator('#mode-select').select_option('mode-one-v-one')
        page.get_by_role('button',name='START FIGHT').click()
        try:
            page.wait_for_function("""() => document.querySelector('#loading')?.hidden || !document.querySelector('#fatal')?.hidden""",timeout=30000)
        except Exception:
            pass
        fatal=page.locator('#fatal').is_visible()
        loading=page.locator('#loading').is_visible()
        detail={
            'fatal':page.locator('#fatal-text').inner_text() if fatal else None,
            'loading':page.locator('#loading-text').inner_text() if loading else None,
            'errors':report['errors'],
            'engineRequests':report['engineRequests'][-30:]
        }
        print('STARTUP EVIDENCE '+json.dumps(detail,ensure_ascii=False),flush=True)
        check('3D runtime leaves loading state',not loading and not fatal,detail)
        check('engine chunks stay same-origin',all(x.get('url','').startswith(BASE+'/games/danao/build/') for x in report['engineRequests']),report['engineRequests'])
        check('Babylon canvas visible',page.locator('#game-canvas').is_visible())
        check('HUD starts at 100 HP',page.locator('#p1-hp').inner_text()=='100 HP' and page.locator('#p2-hp').inner_text()=='100 HP')
        check('fighters start with fists',page.locator('#p1-weapon').inner_text()=='FISTS')
        page.locator('#game-canvas').focus()
        page.keyboard.press('Space');page.wait_for_timeout(450)
        held=page.locator('#p1-weapon').inner_text()
        check('Player 1 can pick up an arena weapon',held!='FISTS',held)
        page.keyboard.down('KeyD');page.keyboard.down('Space');page.wait_for_timeout(3500);page.keyboard.up('Space');page.keyboard.up('KeyD');page.wait_for_timeout(300)
        p1=page.locator('#p1-hp').inner_text();p2=page.locator('#p2-hp').inner_text()
        check('combat changes health through normal controls',p1!='100 HP' or p2!='100 HP',{'p1':p1,'p2':p2,'held':held})
        page.screenshot(path=str(OUT/'wrestling-arena.png'))
        page.get_by_role('button',name='RETURN TO MENU').click()
        check('return to menu works without reload',page.locator('#main-menu').is_visible() and not page.locator('#game-screen').is_visible())
        check('browser runtime has no page errors',not report['errors'],report['errors'])
        report['status']='passed'
    except Exception as exc:
        report['status']='failed';report['failure']=repr(exc)
        try: page.screenshot(path=str(OUT/'failure.png'),full_page=True)
        except Exception: pass
        raise
    finally:
        (OUT/'report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
        browser.close()
