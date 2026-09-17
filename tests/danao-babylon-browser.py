"""Native browser acceptance for the Babylon/Rapier Danao migration."""
from pathlib import Path
import json, os
from playwright.sync_api import sync_playwright

BASE=os.environ.get('BASE_URL','http://127.0.0.1:8787').rstrip('/')
OUT=Path(os.environ.get('DANAO_REPORT_DIR','verification/danao-babylon'));OUT.mkdir(parents=True,exist_ok=True)
report={'base':BASE,'checks':[],'errors':[]}

def check(name,value,detail=None):
    report['checks'].append({'name':name,'passed':bool(value),'detail':detail})
    print(('PASS ' if value else 'FAIL ')+name,flush=True)
    if not value: raise AssertionError(f'{name}: {detail}')

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--use-angle=swiftshader'])
    context=browser.new_context(viewport={'width':1280,'height':800})
    page=context.new_page();page.set_default_timeout(30000)
    page.on('pageerror',lambda e:report['errors'].append(str(e)))
    page.on('console',lambda m:report['errors'].append(m.text) if m.type=='error' else None)
    try:
        page.goto(BASE+'/games/danao/',wait_until='networkidle')
        check('Chinese title visible',page.get_by_text('打闹',exact=True).count()>=1)
        check('native Local Play button visible',page.get_by_role('button',name='LOCAL PLAY').is_visible())
        page.get_by_role('button',name='LOCAL PLAY').click()
        check('Local Play opens setup without Unity',page.locator('#local-setup').is_visible() and page.locator('#arena-select').is_visible())
        page.locator('#arena-select').select_option('wrestling-arena')
        page.locator('#character-select').select_option('character-hero')
        page.locator('#mode-select').select_option('mode-one-v-one')
        page.get_by_role('button',name='START FIGHT').click()
        page.locator('#loading').wait_for(state='hidden',timeout=45000)
        check('Babylon canvas visible',page.locator('#game-canvas').is_visible())
        check('HUD starts at 100 HP',page.locator('#p1-hp').inner_text()=='100 HP' and page.locator('#p2-hp').inner_text()=='100 HP')
        page.keyboard.down('KeyD');page.keyboard.down('Space');page.wait_for_timeout(3500);page.keyboard.up('Space');page.keyboard.up('KeyD');page.wait_for_timeout(300)
        p1=page.locator('#p1-hp').inner_text();p2=page.locator('#p2-hp').inner_text()
        check('combat changes health through normal controls',p1!='100 HP' or p2!='100 HP',{'p1':p1,'p2':p2})
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
        (OUT/'report.json').write_text(json.dumps(report,indent=2))
        browser.close()
