"""Menu-first selection, seven-car fields and live standings against a running site."""
import asyncio,json,os,time
from pathlib import Path
from playwright.async_api import async_playwright
BASE=os.environ.get('BASE_URL','http://127.0.0.1:8787').rstrip('/')
OUT=Path('verification');OUT.mkdir(exist_ok=True)
checks=[];errors=[]
async def check(label,value):
 if not value:raise AssertionError(label)
 checks.append(label);print('PASS',label,flush=True)
async def wait(page,expression,seconds=45):
 deadline=time.monotonic()+seconds;last=0
 while time.monotonic()<deadline:
  if await page.evaluate('()=>Boolean('+expression+')'):return
  if time.monotonic()-last>10:
   last=time.monotonic();print('WAIT STATE',await page.evaluate('()=>({screen:window.WackyRaces?.screen,phase:window.WackyRaces?.race.phase,countdown:window.WackyRaces?.race.countdown,hidden:document.hidden,focus:document.hasFocus(),dialogs:[...document.querySelectorAll("dialog[open]")].map(d=>d.id),tick:window.WackyRaces?.renderer.tick})'),flush=True)
  await asyncio.sleep(.1)
 print('FINAL WAIT STATE',await page.evaluate('()=>({screen:window.WackyRaces?.screen,phase:window.WackyRaces?.race.phase,countdown:window.WackyRaces?.race.countdown,hidden:document.hidden,tick:window.WackyRaces?.renderer.tick})'),flush=True)
 await page.evaluate('()=>{if(window.WackyRaces)WackyRaces.renderer.render=()=>{}}')
 await page.screenshot(path=str(OUT/'setup-timeout.png'),timeout=90000)
 raise AssertionError('Timed out: '+expression)
async def main():
 async with async_playwright() as p:
  args={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']}
  if os.environ.get('BROWSER_PATH'):args['executable_path']=os.environ['BROWSER_PATH']
  browser=await p.chromium.launch(**args)
  try:
   context=await browser.new_context(viewport={'width':1280,'height':800},service_workers='block')
   await context.add_init_script("localStorage.setItem('proper-karted-settings-v1',JSON.stringify({quality:'low',sound:false,music:false,reduced:true}))")
   page=await context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
   await page.goto(BASE+'/',wait_until='domcontentloaded')
   await check('both homepage solo links open setup, not auto-play',await page.locator('a[href="/games/wacky-races/"]').count()==2 and await page.locator('a[href*="play=1"]').count()==0)
   await page.locator('a[href="/games/wacky-races/"]').first.click();await wait(page,'!!window.WackyRaces');await page.wait_for_timeout(3500)
   await check('opening the homepage game link stays in setup',await page.evaluate('WackyRaces.screen==="menu"&&document.getElementById("hud").hidden'))
   await check('level, vehicle, driver and settings controls are available',all([await page.locator('#'+i).is_visible() for i in ['trackNext','vehicle','driverOpen','settingsOpen','startRace']]))
   await page.locator('[data-track="5"]').click();await page.select_option('#vehicle','bus');await page.select_option('#difficulty','hard')
   await page.click('#driverOpen');await page.locator('.choose-driver').nth(4).click();await page.locator('[data-close=garageDialog]').first.click()
   await page.click('#settingsOpen');await page.locator('#steeringAssist').uncheck();await page.locator('[data-close=settingsDialog]').click()
   await check('choosing options does not start the race',await page.evaluate('WackyRaces.screen==="menu"&&WackyRaces.settings.vehicle==="bus"&&WackyRaces.settings.driver===4'))
   await page.screenshot(path=str(OUT/'race-setup-desktop.png'))
   await page.click('#startRace');await wait(page,'WackyRaces.screen==="race"&&WackyRaces.race.countdown===0')
   await check('Start uses selected Dublin, Mulan, bus, difficulty and assist settings',await page.evaluate('WackyRaces.race.track.id===5&&WackyRaces.race.racers[0].id===4&&WackyRaces.race.racers[0].vehicle==="bus"&&WackyRaces.race.difficulty==="hard"&&!WackyRaces.race.assist'))
   await check('only seven moving vehicles are on the race surface',await page.evaluate('WackyRaces.race.racers.length===7&&WackyRaces.race.traffic.length===0'))
   await wait(page,'document.querySelectorAll("#raceOrderRows li").length===7')
   await check('seven ranked rows highlight the correct player',await page.locator('#raceOrderRows .order-place').all_text_contents()==['1st','2nd','3rd','4th','5th','6th','7th'] and await page.locator('#raceOrderRows .is-you').get_attribute('data-driver-id')=='4')
   await check('standings are on the left',await page.locator('#raceOrder').evaluate('(e)=>e.getBoundingClientRect().right<innerWidth/2'))
   await page.evaluate('window.savedDraw=WackyRaces.renderer.render;WackyRaces.renderer.render=()=>{}')
   await page.screenshot(path=str(OUT/'seven-racers-standings.png'))
   await page.evaluate('WackyRaces.race.racers[0].s=500');await wait(page,'document.querySelector("#raceOrderRows li").dataset.driverId==="4"')
   await check('the list updates when you move into first place',await page.locator('#raceOrderRows li').first.get_attribute('data-driver-id')=='4')
   await page.evaluate('WackyRaces.race.racers[1].s=700');await wait(page,'document.querySelector("#raceOrderRows li").dataset.driverId===String(WackyRaces.race.racers[1].id)')
   await check('another racer overtaking changes the leader',await page.locator('#raceOrderRows li').first.get_attribute('data-driver-id')!='4')
   await page.locator('#raceOrder summary').click();await check('race order can be hidden',not await page.locator('#raceOrder').evaluate('(e)=>e.open'))
   await page.locator('#raceOrder summary').focus();await page.keyboard.press('Enter');await check('keyboard can reopen race order',await page.locator('#raceOrder').evaluate('(e)=>e.open'))
   await page.evaluate('WackyRaces.pause();document.getElementById("pauseDialog").close()')
   for width,height,label in [(390,844,'portrait'),(844,390,'landscape')]:
    await page.set_viewport_size({'width':width,'height':height});await page.evaluate('savedDraw.call(WackyRaces.renderer,WackyRaces.race,1/60,{menu:false,reduced:true})')
    await check(label+' standings fit without covering speed controls',await page.evaluate('(()=>{const a=document.getElementById("raceOrder").getBoundingClientRect(),b=document.querySelector(".race-bottom").getBoundingClientRect();return a.left>=0&&a.right<=innerWidth&&(a.bottom<=b.top+1||a.right<=b.left||a.left>=b.right)})()'))
    await page.locator('#raceOrderRows li').last.scroll_into_view_if_needed();await check(label+' last place is reachable',await page.locator('#raceOrderRows li').last.is_visible())
    await page.screenshot(path=str(OUT/('standings-'+label+'.png')))
   await page.close()
   for path in ['/games/wacky-races/?play=1','/games/proper-karted/?play=1']:
    page=await context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));await page.goto(BASE+path,wait_until='domcontentloaded');await wait(page,'!!window.WackyRaces');await page.wait_for_timeout(1200)
    await check('legacy link opens setup: '+path,await page.evaluate('WackyRaces.screen==="menu"&&document.getElementById("hud").hidden'));await page.close()
   await check('no uncaught application errors',not errors)
  finally:await browser.close()
if __name__=='__main__':
 report={'base':BASE,'scope':'menu, selected options, standings and seven-car grid','passed':False}
 try:asyncio.run(main());report['passed']=True
 except Exception as e:report['failure']=str(e);raise
 finally:
  report.update(checks=checks,count=len(checks),errors=errors,completed=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()));(OUT/'setup-browser.json').write_text(json.dumps(report,indent=2))
