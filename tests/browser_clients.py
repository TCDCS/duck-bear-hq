"""Two real browser clients. Set FIXTURE=1 only for the restricted local harness.
Normal mode uses native browser HTTP/WebSocket connections to Wrangler dev or a host.
"""
import asyncio,json,os,sys,time
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tests/support'))
FIXTURE=os.environ.get('FIXTURE')=='1';BASE=os.environ.get('BASE_URL','http://127.0.0.1:8787');OUT=ROOT/'verification';OUT.mkdir(exist_ok=True)
checks=[];errors=[];fixtures=[];graphics=[]
async def check(name,condition):
 if not condition:raise AssertionError(name)
 checks.append(name);print('PASS',name,flush=True)
async def wait(page,expression,timeout=30000):
 # Evaluate a function directly through DevTools. Playwright's in-page string
 # polling uses eval(), which a strict production CSP correctly rejects.
 deadline=time.monotonic()+timeout/1000
 while time.monotonic()<deadline:
  if await page.evaluate('() => Boolean('+expression+')'):return
  await asyncio.sleep(.1)
 details=await page.evaluate('() => ({status:document.getElementById("friendsStatus")?.textContent,phase:window.WackyRaces?.race?.phase,connected:window.WackyRaces?.network?.connected,fatal:document.getElementById("fatalMessage")?.textContent})')
 raise AssertionError('Timed out waiting for '+expression+'; state='+json.dumps(details))
async def load(page,path):
 if FIXTURE:
  from browser_fixture import Fixture
  f=Fixture(page);await f.install();await f.load(path);fixtures.append(f)
 else:
  await page.add_init_script("localStorage.setItem('proper-karted-settings-v1',JSON.stringify({quality:'low',music:false,sound:false,reduced:true}))")
  await page.goto(BASE+path,wait_until='domcontentloaded',timeout=90000)
 if path.startswith('/games'):
  await wait(page,'!!window.WackyRaces',timeout=60000)
  await check('game boots without a fatal error',await page.locator('#fatal').is_hidden());graphics.append(await page.evaluate('WackyRaces.graphics'))
async def state(page):return await page.evaluate('({screen:WackyRaces.screen,phase:WackyRaces.race.phase,time:WackyRaces.race.time,id:WackyRaces.network.id,code:WackyRaces.network.room?.code,host:WackyRaces.network.room?.hostId,connected:WackyRaces.network.connected,s:WackyRaces.race.racers[0].s,x:WackyRaces.race.racers[0].x})')
async def main():
 async with async_playwright() as p:
  launch={'headless':True,'args':['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']}
  if FIXTURE:launch['executable_path']='/usr/bin/chromium'
  browser=await p.chromium.launch(**launch)
  try:
   context=await browser.new_context(viewport={'width':1280,'height':800},service_workers='block')
   context.on('page',lambda page:page.on('pageerror',lambda e:errors.append(str(e))))
   if not FIXTURE:
    for path in ['/api/bootstrap','/api/orders','/api/export/backup.json']:
     res=await context.request.get(BASE+path);await check('private route still requires authentication: '+path,res.status==401)
    res=await context.request.get(BASE+'/games/wacky-races/');await check('native Worker serves the game to a guest',res.status==200)
    res=await context.request.get(BASE+'/games/wacky-races/original-portraits.js');await check('native Worker does not expose original portrait files',res.status==404)
    res=await context.request.post(BASE+'/api/races/create',data={},headers={'Origin':'https://other-origin.test'});await check('native Worker rejects cross-origin room creation',res.status==403)
   homepage=await context.new_page();await load(homepage,'/');await homepage.wait_for_timeout(500)
   await check('public homepage exposes Play without sign-in',await homepage.locator('a[href="/games/wacky-races/"]').count()==2)
   await check('Sign in is in the public header',await homepage.locator('header #publicSignIn').is_visible())
   await check('public cover fallback hides after artwork loads',await homepage.locator('#coverFallback').is_hidden())
   await homepage.screenshot(path=str(OUT/'home-desktop.png'),full_page=True)
   await homepage.close()
   host=await context.new_page();guest=await context.new_page()
   await load(host,'/games/wacky-races/?friends=1');await check('friends entry opens directly from homepage',await host.locator('#friendsDialog').evaluate('(el)=>el.open'))
   await host.fill('#friendName','Zachary');await host.select_option('#friendAvatar','0');await host.select_option('#createCircuit','5');await host.click('#roomCreate');await wait(host,'WackyRaces.network.connected&&WackyRaces.network.room.players[0].connected',timeout=30000)
   code=(await state(host))['code'];await check('host receives a four-digit code',len(code)==4 and code.isdigit())
   await check('host cannot start alone',await host.locator('#roomStart').is_disabled())
   await load(guest,'/games/wacky-races/?room='+code)
   await check('invite pre-fills the correct code',await guest.input_value('#roomCodeInput')==code)
   await guest.select_option('#friendAvatar','1');await guest.fill('#friendName','Guannan');await guest.select_option('#friendVehicle','bus');await guest.click('#roomJoin');await wait(guest,'WackyRaces.network.connected&&WackyRaces.network.room.players.length===2',timeout=30000)
   await wait(host,'WackyRaces.network.room.players.length===2')
   await check('host waits until friend is ready',await host.locator('#roomStart').is_disabled())
   await guest.click('#roomReady');await wait(host,'!document.getElementById("roomStart").disabled')
   await host.screenshot(path=str(OUT/'friends-lobby.png'))
   await check('both clients share the same roster',await host.evaluate('JSON.stringify(WackyRaces.network.room.players)')==await guest.evaluate('JSON.stringify(WackyRaces.network.room.players)'))
   invite=await host.input_value('#roomInvite');await check('share URL includes only a code, not a player pass','room='+code in invite and 'token=' not in invite)
   await host.evaluate("Object.defineProperty(navigator,'share',{configurable:true,value:async data=>window.sharedInvite=data})")
   await host.click('#roomShare');await check('native Share receives a safe invitation',await host.evaluate('window.sharedInvite.url.includes("room="+WackyRaces.network.room.code)&&!window.sharedInvite.url.includes(WackyRaces.network.token)'))
   await host.click('#roomStart');await wait(host,'WackyRaces.screen==="race"&&WackyRaces.race.countdown===0',timeout=30000);await wait(guest,'WackyRaces.screen==="race"&&WackyRaces.race.countdown===0',timeout=30000)
   await check('both browsers launch the same Dublin race',await host.evaluate('WackyRaces.race.track.id===5') and await guest.evaluate('WackyRaces.race.track.id===5'))
   await check('friend controls their own bus, not the host kart',await guest.evaluate('WackyRaces.race.racers[0].id===WackyRaces.network.id&&WackyRaces.race.racers[0].vehicle==="bus"'))
   for client in [host,guest]:
    await wait(client,'document.querySelectorAll("#raceOrderRows li").length===7')
    await check('online grid and left race order both have seven racers',await client.evaluate('WackyRaces.race.racers.length===7&&WackyRaces.race.traffic.length===0&&document.querySelector("#raceOrderRows .is-you").dataset.driverId===String(WackyRaces.network.id)'))
   await host.wait_for_timeout(2500)
   # Both scenes have rendered. Drain their software-GPU work before capture,
   # rather than continually queuing two scenes while the screenshot waits.
   await host.evaluate('WackyRaces.renderer.render=()=>{}');await guest.evaluate('WackyRaces.renderer.render=()=>{}')
   await host.screenshot(path=str(OUT/'online-race.png'),timeout=90000)
   await check('cartoon textures load for every driver',await host.evaluate('WackyRaces.renderer.photoImages.every(i=>i.complete&&i.naturalWidth>0)'))
   await host.wait_for_timeout(2200)
   before=await state(host);await host.keyboard.down('ArrowRight')
   await wait(host,'WackyRaces.race.racers[0].steer>.8&&WackyRaces.race.racers[0].vx>1',timeout=15000)
   await host.keyboard.up('ArrowRight');after=await state(host)
   await check('host right input changes the host car in the shared simulation',after['x']>before['x'] or await host.evaluate('WackyRaces.race.racers[0].vx>1'))
   await guest.keyboard.down('ArrowLeft');await wait(guest,'WackyRaces.race.racers[0].steer<-.8&&WackyRaces.race.racers[0].vx<0',timeout=15000);await guest.keyboard.up('ArrowLeft')
   await check('guest left input reaches their separate car',await guest.evaluate('WackyRaces.race.racers[0].vx<0'))
   a=await host.evaluate('WackyRaces.network.latest.racers.map(p=>({id:p.id,s:p.s}))');b=await guest.evaluate('WackyRaces.network.latest.racers.map(p=>({id:p.id,s:p.s}))')
   await check('both clients receive the same authoritative positions',max(abs(x['s']-next(y['s'] for y in b if y['id']==x['id'])) for x in a)<7)
   old=await state(guest);await host.click('#pauseButton');await check('online menu explains that the race continues','continues' in await host.locator('#pauseTitle').inner_text());await guest.wait_for_timeout(1200)
   await check('opening host settings does not pause friends',(await state(guest))['time']>old['time']+.5)
   await host.click('#pauseSettings');await host.click('#settingsShare');await check('Share button works inside game settings',await host.evaluate('window.sharedInvite.url.includes("room="+WackyRaces.network.room.code)'))
   await host.locator('[data-close=settingsDialog]').click();await host.click('#resumeRace')
   own=(await state(host))['id'];await host.evaluate('WackyRaces.network.socket.close()');await wait(host,'WackyRaces.network.attempt>0||!WackyRaces.network.connected',timeout=10000);await wait(host,'WackyRaces.network.connected',timeout=30000)
   await check('network interruption reconnects to the same player slot',(await state(host))['id']==own)
   await check('a disconnected host is replaced safely',(await state(guest))['host']==(await state(guest))['id'])
   if FIXTURE:
    import aiohttp
    async with aiohttp.ClientSession() as session:await session.post('http://127.0.0.1:8765/__test/finish',json={'code':code})
   await wait(host,'document.getElementById("resultsDialog").open',timeout=210000);await wait(guest,'document.getElementById("resultsDialog").open',timeout=210000)
   await check('friends receive matching final classifications',(await host.locator('#resultRows').inner_text()).replace(' · YOU','')==(await guest.locator('#resultRows').inner_text()).replace(' · YOU',''))
   await check('online results leave solo records untouched',await host.evaluate('localStorage.getItem("proper-karted-records-v1")===null'))
   await guest.click('#resultNext');await wait(host,'WackyRaces.network.room.phase==="lobby"');await check('host can bring everyone back for another race',await host.locator('#friendsDialog').evaluate('(el)=>el.open'))
   await guest.click('#roomLeave');await check('leaving restores a working solo paddock',await guest.evaluate('!WackyRaces.network.active&&WackyRaces.screen==="menu"'))
   await host.click('#roomLeave');await host.bring_to_front();await host.click('#startRace');await host.wait_for_timeout(300);print('SOLO STATE',await host.evaluate('({hidden:document.hidden,focus:document.hasFocus(),phase:WackyRaces.race.phase,countdown:WackyRaces.race.countdown,active:WackyRaces.network.active})'),flush=True);await wait(host,'WackyRaces.race.countdown===0');await check('solo still starts after an online session',await host.evaluate('!WackyRaces.race.multiplayer'))
   await context.close()
   mobile_context=await browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,service_workers='block');mobile=await mobile_context.new_page();mobile.on('pageerror',lambda e:errors.append(str(e)));await load(mobile,'/');await mobile.wait_for_timeout(300)
   await check('phone homepage has no horizontal overflow',await mobile.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
   await mobile.screenshot(path=str(OUT/'home-mobile.png'),full_page=True,timeout=90000);await mobile.close()
   mobile=await mobile_context.new_page();mobile.on('pageerror',lambda e:errors.append(str(e)));await load(mobile,'/games/wacky-races/?friends=1');await check('phone lobby fits horizontally',await mobile.evaluate('document.getElementById("friendsDialog").getBoundingClientRect().right<=innerWidth'))
   await mobile.screenshot(path=str(OUT/'friends-mobile.png'),timeout=90000)
   await check('no uncaught browser application errors',not errors)
  finally:
   for f in fixtures:await f.close()
   await browser.close()
  report={'mode':'restricted browser with local WebSocket/Worker fixture' if FIXTURE else 'native browser HTTP/WebSocket with Workers runtime','checks':checks,'count':len(checks),'errors':errors,'passed':True,'graphics':graphics,'rendering':'A rendered frame is checked before drawing is disabled for long transport tests','completed':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
  (OUT/'browser-clients.json').write_text(json.dumps(report,indent=2));print(json.dumps({'passed':True,'count':len(checks)},indent=2))
if __name__=='__main__':
 try:asyncio.run(main())
 except Exception as e:
  (OUT/'browser-clients.json').write_text(json.dumps({'passed':False,'checks':checks,'errors':errors,'failure':str(e)},indent=2));raise
