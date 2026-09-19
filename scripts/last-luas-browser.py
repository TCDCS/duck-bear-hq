"""Native-browser acceptance. Fixtures and branded captures remain private.
Run against the real local Worker; optionally use a short-lived live acceptance session.
"""
import asyncio,json,os,time
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright
BASE=os.environ.get('BASE_URL','http://127.0.0.1:8787').rstrip('/')
FIXTURE=Path(os.environ.get('LAST_LUAS_FIXTURE','.wrangler/last-luas-fixture.json'))
OUT=Path(os.environ.get('LAST_LUAS_REPORT','/tmp/last-luas-browser'));OUT.mkdir(parents=True,exist_ok=True)
async def inspect(page):return await page.evaluate("async()=> (await import('/games/last-luas/inked/main.mjs?v=1.0.0')).inspect()")
async def main():
 fixture=json.loads(FIXTURE.read_text());users=fixture['users'];report={'base':BASE,'version':'1.0.0','checks':[],'screenshots':'private; not uploaded in plaintext'}
 async with async_playwright() as p:
  launch={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage']}
  if os.environ.get('CHROMIUM_EXECUTABLE'):launch['executable_path']=os.environ['CHROMIUM_EXECUTABLE']
  browser=await p.chromium.launch(**launch)
  anon=await browser.new_context()
  for route in ['/games/last-luas/','/games/last-luas/inked/main.mjs','/games/last-luas/private/brands/hodges.png','/g%61mes/last%2Dluas/inked/main.mjs']:
   result=await anon.request.get(BASE+route);assert result.status==401,(route,result.status)
  report['checks'].append('anonymous page/code/logo/encoded-alias denied')
  for route,title in [('/games/','Last Luas'),('/games/mango-mayhem/','Mango'),('/games/wacky-races/','Wacky')]:
   result=await anon.request.get(BASE+route);assert result.status==200;(text:=await result.text());assert title in text
  report['checks'].append('Games, Mango and Wacky routes preserved')
  if len(users)>1:
   other=await browser.new_context();await other.add_cookies([{'name':'db_session','value':users[1]['token'],'url':BASE,'httpOnly':True,'secure':BASE.startswith('https')}]);assert (await other.request.get(BASE+'/games/last-luas/private/brands/hodges.png')).status==403;await other.close();report['checks'].append('another signed-in admin denied')
  context=await browser.new_context(viewport={'width':1440,'height':900},device_scale_factor=1)
  await context.add_cookies([{'name':'db_session','value':users[0]['token'],'url':BASE,'httpOnly':True,'secure':BASE.startswith('https')}])
  page=await context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  response=await page.goto(BASE+'/games/last-luas/');assert response.status==200;await page.wait_for_function("!document.getElementById('playButton').disabled",timeout=30000)
  first=await inspect(page);assert set(first['brandIds'])=={'cafe','ivy','pret','hodges'};assert first['phase']=='menu'
  await page.wait_for_timeout(300);assert (await inspect(page))['elapsed']==0
  await page.screenshot(path=str(OUT/'menu.png'));report['checks'].append('actual 2D renderer and four hash-verified original logos loaded')
  await page.click('#playButton');await page.wait_for_timeout(400);await page.keyboard.press('ArrowLeft');await page.keyboard.press('Space');await page.wait_for_timeout(160)
  state=await inspect(page);assert state['player']['lane']==0 and state['player']['y']>.2
  await page.keyboard.press('Escape');frozen=await inspect(page);await page.wait_for_timeout(600);assert abs((await inspect(page))['elapsed']-frozen['elapsed'])<.01;await page.keyboard.press('ArrowRight');assert (await inspect(page))['player']['lane']==0
  await page.click('[data-action=resume]');await page.click('#pauseButton');await page.click('[data-action=restart]');await page.wait_for_timeout(100);assert (await inspect(page))['hits']==0 and (await inspect(page))['elapsed']<.5
  report['checks'].append('keyboard lane/jump, pause/input clearing, resume and clean restart')
  # Complete a real run using keyboard input only; telemetry is read-only.
  captures=set();start=time.monotonic()
  while time.monotonic()-start<115:
   state=await inspect(page)
   if state['phase'] in ['won','missed']:break
   if state['phase']=='paused':await page.click('[data-action=resume]')
   if state['phase']=='running':
    player=state['player'];ahead=[o for o in state['obstacles'] if 0<o['s']-player['s']<9]
    target=player['lane']
    if player['s']>state['length']-23:target=0
    elif any(o['lane']==target for o in ahead):
     safe=[i for i in range(3) if all(o['lane']!=i for o in ahead)];target=min(safe,key=lambda i:abs(i-player['lane']))
    for _ in range(abs(target-player['lane'])):await page.keyboard.press('ArrowLeft' if target<player['lane'] else 'ArrowRight')
    for key,dist in [('cafe',93),('ivy',169),('hodges',268)]:
     if key not in captures and player['s']>=dist:await page.screenshot(path=str(OUT/(key+'.png')));captures.add(key)
   await page.wait_for_timeout(180)
  assert state['phase']=='won',{'phase':state['phase'],'elapsed':state['elapsed'],'distance':state['player']['s'],'hits':state['hits']}
  await page.wait_for_timeout(900);await page.screenshot(path=str(OUT/'won.png'));report['cleanRun']={'elapsed':state['elapsed'],'hits':state['hits'],'draw95Ms':state['draw95'],'canvas':state['canvas']};report['checks'].append('keyboard-only complete run and grounded left-side boarding')
  await page.click('[data-action=restart]');await page.wait_for_timeout(150);await page.set_viewport_size({'width':390,'height':844});await page.wait_for_timeout(100);await page.screenshot(path=str(OUT/'portrait.png'))
  await page.click('[data-control=right]');await page.wait_for_timeout(180);assert (await inspect(page))['player']['lane']==2
  await page.set_viewport_size({'width':844,'height':390});await page.wait_for_timeout(150);await page.screenshot(path=str(OUT/'landscape-phone.png'))
  assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  report['checks'].append('portrait/landscape composition and touch buttons; emulation, not a physical-phone benchmark')
  # Swipe/tap via pointer events are separate actions; test actual touchscreen context as well.
  touch=await browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
  await touch.add_cookies([{'name':'db_session','value':users[0]['token'],'url':BASE,'httpOnly':True,'secure':BASE.startswith('https')}]);tp=await touch.new_page();await tp.goto(BASE+'/games/last-luas/');await tp.wait_for_function("!document.getElementById('playButton').disabled");await tp.tap('#playButton');await tp.touchscreen.tap(185,420);await tp.wait_for_timeout(140);assert (await inspect(tp))['player']['y']>0
  session=await touch.new_cdp_session(tp);await session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':250,'y':440}]});await session.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':115,'y':443}]});await session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});await tp.wait_for_timeout(120);assert (await inspect(tp))['player']['lane']==0;await touch.close();report['checks'].append('real browser touchscreen tap and swipe')
  assert not errors,errors;report['consoleErrors']=errors
  await context.close();await anon.close();await browser.close()
 (OUT/'report.json').write_text(json.dumps(report,indent=2));print(json.dumps({k:v for k,v in report.items() if k!='screenshots'},indent=2))
asyncio.run(main())
