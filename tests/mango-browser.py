"""Native browser acceptance: normal menus and device events, never game-state setters.
Run against Wrangler locally or the live site. Clock control accelerates time only.
"""
from pathlib import Path
import datetime, hashlib, json, os, sys, time
from playwright.sync_api import sync_playwright, expect
BASE=os.environ.get('BASE_URL','http://127.0.0.1:8787').rstrip('/')
OUT=Path(os.environ.get('MANGO_REPORT_DIR','verification/mango/browser'));OUT.mkdir(parents=True,exist_ok=True)
LEVELS=['dublin','london','taj','sichuan','neimenggu','liaoning']
PLACES=['Dublin','London','Taj Mahal','Sichuan','Neimenggu','Liaoning']
report={'base':BASE,'checks':[],'campaign':[],'errors':[],'physicalHardwareTested':False}
def check(name,value,detail=None):
 report['checks'].append({'name':name,'passed':bool(value),'detail':detail})
 print(('PASS ' if value else 'FAIL ')+name,flush=True)
 if not value:raise AssertionError(name+': '+str(detail))
def inspect(page):return page.evaluate('window.MangoMayhem.inspect()')
def wait_ready(page):page.wait_for_function('window.MangoMayhem && window.MangoMayhem.inspect().version')
def new_player(page,name):
 page.get_by_role('button',name='Start adventure',exact=False).click()
 page.locator('#createProfileForm input[name=nickname]').fill(name)
 page.locator('#createProfileForm button[type=submit]').click()
 page.get_by_role('button',name='Skip story & play',exact=False).click()
def install_driver(page):
 pilot=Path('tests/helpers/mango-pilot.mjs').read_text().replace('export function pilotInput','function pilotInput')
 page.evaluate('''()=>{'''+pilot+'''
  const held=new Set(),memory={};window.mangoPilotStats={helperDialogs:0,keyEvents:0};
  function key(code,down){window.mangoPilotStats.keyEvents++;document.dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code,key:code==='Space'?' ':code,bubbles:true,cancelable:true}));if(down)held.add(code);else held.delete(code);}
  window.stopMangoPilot=()=>{clearInterval(window.mangoPilotTimer);for(const code of [...held])key(code,false);};
  window.mangoPilotTimer=setInterval(()=>{
   const s=window.MangoMayhem.inspect();
   if(s.view==='helper'){window.mangoPilotStats.helperDialogs++;for(const code of [...held])key(code,false);document.querySelector('[data-action="resume"]')?.click();return;}
   if(s.view!=='playing'){for(const code of [...held])key(code,false);return;}
   const input=pilotInput(s.world,memory),desired=new Set();
   if(input.axis>.15)desired.add('ArrowRight');if(input.axis<-.15)desired.add('ArrowLeft');if(input.jumpHeld)desired.add('Space');if(input.spinPressed)desired.add('KeyX');
   if(input.jumpPressed&&held.has('Space'))key('Space',false);
   if(input.spinPressed&&held.has('KeyX'))key('KeyX',false);
   for(const code of [...held])if(!desired.has(code))key(code,false);
   for(const code of desired)if(!held.has(code))key(code,true);
  },16);
 }''')
def stop_driver(page):page.evaluate('window.stopMangoPilot?.()')
def load_game(page,suffix='?verify=1'):
 page.goto(BASE+'/games/mango-mayhem/'+suffix,wait_until='networkidle');wait_ready(page)
def clock_pause(page):page.clock.pause_at('2026-09-13T10:00:00Z')
def source_checks(context):
 manifest=context.request.get(BASE+'/games/mango-mayhem/release.json').json()
 check('release manifest version',manifest['version']=='1.0.0')
 for url,expected in manifest['files'].items():
  response=context.request.get(BASE+url)
  check('published source '+url,response.ok and hashlib.sha256(response.body()).hexdigest()==expected)
 missing=context.request.get(BASE+'/games/mango-mayhem/no-such-file.mjs');check('unknown game asset is a real 404',missing.status==404)
 check('bare game URL redirects',context.request.get(BASE+'/games/mango-mayhem',max_redirects=0).status in (301,308))
 check('public schema health',context.request.get(BASE+'/api/mango/health').status==200)
 check('anonymous profile read refused',context.request.get(BASE+'/api/mango/profiles').status==401)
 check('HEAD contains no body',context.request.head(BASE+'/games/mango-mayhem/main.mjs').body()==b'')
 return manifest
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1280,'height':900},device_scale_factor=1)
 page=context.new_page();page.set_default_timeout(12000)
 page.on('pageerror',lambda e:report['errors'].append(str(e)))
 private_requests=[];page.on('request',lambda r:private_requests.append(r.url) if '/api/bootstrap' in r.url or '/media/' in r.url else None)
 try:
  manifest=source_checks(context);report['sourceHash']=manifest['sourceHash']
  page.goto(BASE+'/games/',wait_until='networkidle')
  check('games hub includes both games',page.get_by_role('heading',name='Mango Mayhem',exact=True).count()==1 and page.get_by_role('heading',name='Wacky Races',exact=True).count()==1)
  page.screenshot(path=str(OUT/'games-hub.png'),full_page=True)
  # Clock must be installed before the game creates its first timer.
  page.clock.install(time='2026-09-13T09:00:00Z')
  load_game(page,'?verify=1&play=1');clock_pause(page)
  check('opening and legacy play query show title',inspect(page)['view']=='title' and inspect(page)['world'] is None)
  check('audio is not created before a gesture',not inspect(page)['audio']['unlocked'])
  page.screenshot(path=str(OUT/'title.png'))
  new_player(page,'Browser Mango')
  page.clock.run_for(120)
  check('five hearts at start',inspect(page)['world']['player']['hearts']==5)
  initial=inspect(page)['world']['player']['x'];page.clock.run_for(300)
  check('not an automatic runner',abs(inspect(page)['world']['player']['x']-initial)<.1)
  page.keyboard.down('ArrowRight');page.clock.run_for(700);page.keyboard.up('ArrowRight')
  check('keyboard movement advances the character',inspect(page)['world']['player']['x']>initial+80)
  page.keyboard.press('Escape');page.clock.run_for(20)
  before=inspect(page)['world']['tick'];page.clock.run_for(700)
  check('pause freezes physics',inspect(page)['view']=='paused' and inspect(page)['world']['tick']==before)
  page.get_by_role('button',name='Settings',exact=True).click()
  page.locator('[data-setting=reducedMotion]').check()
  page.locator('[data-setting=effects]').evaluate("el=>{el.value='42';el.dispatchEvent(new Event('input',{bubbles:true}));}")
  page.get_by_role('button',name='Done',exact=True).click()
  page.get_by_role('button',name='Back to the adventure').click();page.clock.run_for(20)
  check('settings saved and resume works',inspect(page)['settings']['reducedMotion'] and inspect(page)['view']=='playing')
  page.evaluate("window.dispatchEvent(new Event('blur'))");page.clock.run_for(30)
  check('losing focus pauses deliberately',inspect(page)['view']=='paused')
  page.get_by_role('button',name='Back to the adventure').click()
  # Complete all six courses through the same keyboard event handlers used by players.
  for i,level in enumerate(LEVELS):
   if i:
    page.get_by_role('button',name='Next destination').click()
    page.get_by_role('button',name='Skip story & play').click()
   install_driver(page)
   screenshot_saved=False
   for seconds in range(220):
    page.clock.run_for(1000);s=inspect(page)
    if s['lastError']:raise AssertionError(s['lastError'])
    if s['view']=='playing' and s['world']['phase']=='boss' and not screenshot_saved:
     page.screenshot(path=str(OUT/(level+'-boss.png')));screenshot_saved=True
    if s['view']=='results':break
   stop_driver(page);s=inspect(page)
   check(level+' completed by controls',s['view']=='results',{'view':s['view'],'x':s['world']['player']['x'],'hearts':s['world']['player']['hearts'],'phase':s['world']['phase'],'bossHp':s['world']['boss']['hp']})
   check(level+' progress saved',s['progress']['levels'][level]['cleared'])
   check(level+' helper met',page.evaluate('window.mangoPilotStats.helperDialogs')==1)
   check(level+' checkpoints reached',s['world']['checkpointIndex']==3)
   check(level+' mangos collected',len(s['progress']['levels'][level]['mangoIds'])>=20)
   report['campaign'].append({'level':level,'ticks':s['world']['tick'],'respawns':s['world']['respawns'],'mangos':len(s['progress']['levels'][level]['mangoIds']),'bossDefeated':s['world']['boss']['dead']})
   page.screenshot(path=str(OUT/(level+'-result.png')))
   page.get_by_role('button',name='Wear it!',exact=True).click()
   check(level+' costume can be equipped',inspect(page)['progress']['equippedCostume']!='starter')
  page.get_by_role('button',name='Explore the world again').click()
  check('all six destinations unlocked',page.locator('.level-card:not([disabled])').count()==6)
  page.screenshot(path=str(OUT/'world-map-complete.png'))
  page.get_by_role('button',name='Back',exact=True).click();page.get_by_role('button',name='Wardrobe',exact=True).click()
  check('seven costumes unlocked',page.locator('.costume-card:not([disabled])').count()==7)
  page.screenshot(path=str(OUT/'wardrobe.png'))
  page.reload(wait_until='networkidle');wait_ready(page);page.clock.run_for(100)
  check('reload returns to menu with saved progress',inspect(page)['view']=='title' and all(v['cleared'] for v in inspect(page)['progress']['levels'].values()))
  # Ensure the read-only inspection result cannot mutate the engine.
  page.get_by_role('button',name='World map',exact=True).click();page.locator('[data-action=level][data-id=dublin]').click();page.get_by_role('button',name='Skip story & play').click();page.clock.run_for(100)
  old=inspect(page)['world']['player']['hearts'];page.evaluate('window.MangoMayhem.inspect().world.player.hearts=999');check('diagnostics cannot change game state',inspect(page)['world']['player']['hearts']==old)
  page.keyboard.press('Escape');page.clock.run_for(20)
  # Storage failure is visible and does not crash the game.
  denied=browser.new_context(viewport={'width':960,'height':700});denied.add_init_script("Storage.prototype.setItem=function(){throw new DOMException('Quota reached','QuotaExceededError')}")
  dp=denied.new_page();load_game(dp);new_player(dp,'No storage');dp.wait_for_timeout(100)
  check('storage failure is disclosed', 'unavailable' in dp.locator('#saveStatus').inner_text().lower());check('storage failure still permits play',inspect(dp)['view']=='playing');denied.close()
  # Actual touch input through Chromium's input dispatcher; two simultaneous fingers.
  touch=browser.new_context(viewport={'width':844,'height':390},is_mobile=True,has_touch=True,device_scale_factor=2)
  tp=touch.new_page();tp.on('pageerror',lambda e:report['errors'].append('Touch: '+str(e)));tp.clock.install(time='2026-09-13T09:00:00Z');load_game(tp);clock_pause(tp);new_player(tp,'Touch Mango');tp.clock.run_for(100)
  check('landscape controls fit the viewport',tp.locator('#gameShell').bounding_box()['y']+tp.locator('#gameShell').bounding_box()['height']<=391)
  check('touch controls shown',tp.locator('#touchControls').is_visible())
  right=tp.locator('[data-control=right]').bounding_box();jump=tp.locator('[data-control=jump]').bounding_box();client=touch.new_cdp_session(tp)
  point=lambda b,i:{'x':b['x']+b['width']/2,'y':b['y']+b['height']/2,'id':i}
  start_x=inspect(tp)['world']['player']['x'];client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[point(right,1)]});tp.clock.run_for(300)
  client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[point(right,1),point(jump,2)]});tp.clock.run_for(160)
  check('touch move and jump together',inspect(tp)['world']['player']['x']>start_x+30 and inspect(tp)['world']['player']['vy']<0)
  client.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});tp.clock.run_for(300)
  tp.screenshot(path=str(OUT/'touch-landscape.png'))
  tp.get_by_role('button',name='Pause game').click();tp.clock.run_for(20)
  # Standard-layout gamepad injection exercises the browser adapter, not physical hardware.
  gp=browser.new_context(viewport={'width':960,'height':700});gp.add_init_script("window.testPad={connected:true,mapping:'standard',id:'Acceptance standard controller',axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[window.testPad]});")
  pp=gp.new_page();pp.clock.install(time='2026-09-13T09:00:00Z');load_game(pp);clock_pause(pp);new_player(pp,'Pad Mango');pp.clock.run_for(100)
  start_x=inspect(pp)['world']['player']['x'];pp.evaluate('testPad.axes[0]=1;testPad.buttons[0].pressed=true');pp.clock.run_for(180)
  check('gamepad moves and jumps',inspect(pp)['world']['player']['x']>start_x+20 and inspect(pp)['world']['player']['vy']<0)
  pp.evaluate('testPad.axes[0]=0;testPad.buttons[0].pressed=false;testPad.buttons[9].pressed=true');pp.clock.run_for(40)
  check('gamepad Start pauses',inspect(pp)['view']=='paused');pp.evaluate('testPad.buttons[9].pressed=false');pp.clock.run_for(40)
  pp.get_by_role('button',name='Back to the adventure').click();pp.clock.run_for(30);pp.evaluate('testPad.connected=false');pp.clock.run_for(40)
  check('controller disconnect pauses',inspect(pp)['view']=='paused')
  pp.evaluate('testPad.connected=true');pp.clock.run_for(80);check('controller reconnect does not auto-resume',inspect(pp)['view']=='paused')
  check('no private bootstrap or media requested by public game',not private_requests)
  # Performance measurements use a fresh real clock, not accelerated test time.
  perf=browser.new_context(viewport={'width':1280,'height':800},device_scale_factor=1);pf=perf.new_page();load_game(pf);new_player(pf,'Performance Mango');pf.keyboard.down('ArrowRight');pf.wait_for_timeout(1300);pf.keyboard.up('ArrowRight');pf.wait_for_timeout(1600);report['softwareBrowserDrawTiming']=inspect(pf)['render'];check('normal-clock renderer produced frames',report['softwareBrowserDrawTiming']['samples']>=30)
  check('browser runtime remained error-free',not report['errors'],report['errors'])
  report['status']='passed';report['authenticatedCloudTests']='See local Workers auth/profile report; no production account credentials are used.'
 except Exception as exc:
  report['status']='failed';report['failure']=str(exc)
  try:page.screenshot(path=str(OUT/'failure.png'));report['lastSnapshot']=inspect(page)
  except Exception:pass
  raise
 finally:
  (OUT/'report.json').write_text(json.dumps(report,indent=2,default=str));browser.close()
print(json.dumps({'status':report['status'],'checks':len(report['checks']),'campaign':report['campaign']},indent=2))
