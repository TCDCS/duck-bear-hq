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

def wire_page(page,label):
    page.set_default_timeout(30000)
    page.on('pageerror',lambda e:report['errors'].append(f'{label} pageerror: '+str(e)))
    page.on('console',lambda m:report['errors'].append(f'{label} console {m.type}: {m.text}') if m.type=='error' else None)
    page.on('requestfailed',lambda r:report['engineRequests'].append({'page':label,'url':r.url,'failed':str(r.failure)}) if '/games/danao/build/' in r.url else None)
    page.on('response',lambda r:report['engineRequests'].append({'page':label,'url':r.url,'status':r.status}) if '/games/danao/build/' in r.url else None)

def wait_match_ready(page,label):
    try:
        page.wait_for_function("""() => document.querySelector('#game-screen') && !document.querySelector('#game-screen').hidden && (document.querySelector('#loading')?.hidden || !document.querySelector('#fatal')?.hidden)""",timeout=30000)
    except Exception:
        pass
    fatal=page.locator('#fatal').is_visible()
    loading=page.locator('#loading').is_visible()
    detail={
        'page':label,
        'fatal':page.locator('#fatal-text').inner_text() if fatal else None,
        'loading':page.locator('#loading-text').inner_text() if loading else None,
        'errors':report['errors'],
        'engineRequests':[x for x in report['engineRequests'] if x.get('page')==label][-30:]
    }
    check(f'{label} 3D runtime leaves loading state',not loading and not fatal,detail)
    check(f'{label} Babylon canvas visible',page.locator('#game-canvas').is_visible())
    return detail

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--use-angle=swiftshader'])
    context=browser.new_context(viewport={'width':1280,'height':800})
    page=context.new_page();wire_page(page,'host')
    guest=None
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
        detail=wait_match_ready(page,'host local')
        print('STARTUP EVIDENCE '+json.dumps(detail,ensure_ascii=False),flush=True)
        check('engine chunks stay same-origin',all(x.get('url','').startswith(BASE+'/games/danao/build/') for x in report['engineRequests']),report['engineRequests'])
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

        page.get_by_role('button',name='ONLINE PLAY').click()
        check('Online Play opens the native lobby',page.locator('#online-lobby').is_visible() and page.locator('#create-room').is_visible() and page.locator('#join-room').is_visible())
        page.locator('#online-name').fill('Browser Host')
        page.locator('#online-character').select_option('Hero')
        page.locator('#online-arena').select_option('WrestlingArena')
        page.locator('#online-mode').select_option('OneVsOne')
        page.get_by_role('button',name='CREATE ROOM').click()
        page.wait_for_function("""() => /^\d{4}$/.test(document.querySelector('#room-code')?.textContent || '')""")
        code=page.locator('#room-code').inner_text().strip()
        check('browser creates a four-digit Danao room',len(code)==4 and code.isdigit(),code)
        check('room secrets are not put in the browser URL','token=' not in page.url and 'pass=' not in page.url,page.url)
        check('host appears in room player list',page.locator('#room-players .room-player').count()==1 and 'Browser Host' in page.locator('#room-players').inner_text())
        page.screenshot(path=str(OUT/'online-lobby-host.png'))

        guest=context.new_page();wire_page(guest,'guest')
        guest.goto(BASE+f'/games/danao/?room={code}',wait_until='networkidle')
        guest.get_by_role('button',name='ONLINE PLAY').click()
        guest.locator('#online-name').fill('Browser Guest')
        check('room invite pre-fills only the public room code',guest.locator('#online-code').input_value()==code and 'token=' not in guest.url and 'pass=' not in guest.url,{'code':guest.locator('#online-code').input_value(),'url':guest.url})
        guest.get_by_role('button',name='JOIN ROOM').click()
        page.wait_for_function("""() => document.querySelectorAll('#room-players .room-player').length === 2""")
        guest.wait_for_function("""() => document.querySelectorAll('#room-players .room-player').length === 2""")
        check('two browser pages share the same online room',page.locator('#room-players .room-player').count()==2 and guest.locator('#room-players .room-player').count()==2)
        check('both player names are visible to the room','Browser Host' in guest.locator('#room-players').inner_text() and 'Browser Guest' in page.locator('#room-players').inner_text())

        guest.get_by_role('button',name='READY').click()
        page.wait_for_function("""() => !document.querySelector('#room-start')?.disabled""")
        check('host start unlocks only after guest is ready',page.locator('#room-start').is_enabled())
        page.screenshot(path=str(OUT/'online-lobby-ready.png'))
        page.get_by_role('button',name='START').click()
        host_online=wait_match_ready(page,'host online')
        guest_online=wait_match_ready(guest,'guest online')
        check('online start loads both host and client Babylon matches',page.locator('#game-screen').is_visible() and guest.locator('#game-screen').is_visible(),{'host':host_online,'guest':guest_online})
        check('online host and client both start with healthy fighters',page.locator('#p1-hp').inner_text()=='100 HP' and guest.locator('#p1-hp').inner_text()=='100 HP')
        guest.locator('#game-canvas').focus();guest.keyboard.down('KeyD');guest.wait_for_timeout(700);guest.keyboard.up('KeyD');page.wait_for_timeout(500)
        check('online input and snapshot loop stays live after client movement',not page.locator('#fatal').is_visible() and not guest.locator('#fatal').is_visible())
        page.screenshot(path=str(OUT/'online-host-match.png'))
        guest.screenshot(path=str(OUT/'online-guest-match.png'))

        guest.get_by_role('button',name='RETURN TO MENU').click()
        page.wait_for_timeout(300)
        page.get_by_role('button',name='RETURN TO MENU').click()
        check('online players can leave back to the native menu',guest.locator('#main-menu').is_visible() and page.locator('#main-menu').is_visible())
        check('browser runtime has no page errors',not report['errors'],report['errors'])
        report['status']='passed'
    except Exception as exc:
        report['status']='failed';report['failure']=repr(exc)
        try: page.screenshot(path=str(OUT/'failure-host.png'),full_page=True)
        except Exception: pass
        try:
            if guest: guest.screenshot(path=str(OUT/'failure-guest.png'),full_page=True)
        except Exception: pass
        raise
    finally:
        (OUT/'report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
        browser.close()
