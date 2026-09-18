import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const root=new URL('../',import.meta.url);
const read=(path)=>readFileSync(new URL(path,root),'utf8');

function productionV05Source(){
  const payload=Array.from({length:6},(_,i)=>read('public/games/meow-wars/v05-payload-'+(i+1)+'.txt'))
    .join('').replace(/\s+/g,'');
  return gunzipSync(Buffer.from(payload,'base64')).toString('utf8');
}

function composeV16(){
  let source=productionV05Source();
  const renderPattern=/function preferredRenderResolution\s*\([^)]*\)\s*\{[\s\S]*?\n\}/g;
  const matches=[...source.matchAll(renderPattern)];
  assert.equal(matches.length,1);
  const replacement=
    "function preferredRenderResolution(devicePixelRatio = 1) {\n"+
    "    const viewportScale = Math.max((globalThis.innerWidth || 1280) / 1280, (globalThis.innerHeight || 720) / 720);\n"+
    "    const mobileCap = (globalThis.innerWidth || 1280) < 800 ? 2 : 3;\n"+
    "    return Math.min(mobileCap, 3, Math.max(1, devicePixelRatio, viewportScale));\n"+
    "}";
  const match=matches[0];
  source=source.slice(0,match.index)+replacement+source.slice(match.index+match[0].length);

  const legacyTint='cat.sprite.setTintFill?.(0xffffff);';
  assert.ok(source.includes(legacyTint));
  source=source.split(legacyTint).join(
    'cat.sprite.setTint?.(0xffffff);\n        cat.sprite.setTintMode?.(Phaser.TintModes.FILL);'
  );

  const layers=[
    read('public/games/meow-wars/v06-hd.js'),
    read('public/games/meow-wars/v07-gamefeel.js'),
    read('public/games/meow-wars/v08-battle-polish.js'),
    read('public/games/meow-wars/v09-battle-presentation.js'),
    read('public/games/meow-wars/v10-release.js'),
    read('public/games/meow-wars/v11-living-battlefields.js'),
    read('public/games/meow-wars/v12-online.js'),
    read('public/games/meow-wars/v13-environment-depth.js'),
    read('public/games/meow-wars/v14-atmosphere-materials.js'),
    read('public/games/meow-wars/v15-scene-depth.js'),
    read('public/games/meow-wars/v16-menu-city-life.js')
  ];

  const marker='new Phaser.Game(config);';
  const index=source.lastIndexOf(marker);
  assert.ok(index>0);
  return source.slice(0,index)+'\n'+layers.join('\n')+'\n'+source.slice(index);
}

test('Meow Wars v1.6 composes and compiles over the complete production stack',()=>{
  const source=composeV16();
  assert.doesNotThrow(()=>new Function(source));
  assert.match(source,/mw-v16-menu-city-life-20260918a/);
  assert.match(source,/mw-v15-scene-depth-20260918a/);
  assert.match(source,/mw-v12-online-rooms-20260918a/);
  assert.doesNotMatch(source,/setTintFill/);
});

test('Meow Wars v1.6 tidies the main menu into one mode row and one feature line',()=>{
  const env=read('public/games/meow-wars/v16-menu-city-life.js');
  for(const marker of [
    'hideMenuNoise','threeModeRow:true','technicalRibbonsCollapsed:true',
    'sideSignClutterMasked:true','compactControls:true',
    "'ONLINE 1V1'","'7 BATTLEFIELDS  •  WEATHER  •  DESTRUCTIBLE PROPS  •  ONLINE 1V1'"
  ]) assert.ok(env.includes(marker),marker);
  assert.match(env,/scene\.cpuButton\?\.setPosition\?\.\(365,167\)/);
  assert.match(env,/scene\.localButton\?\.setPosition\?\.\(640,167\)/);
  assert.match(env,/scene\.add\.rectangle\(915,167,235,48/);
  assert.match(env,/launcher\.style\.display='none'/);
});

test('Meow Wars v1.6 separates city river craft from far-bank road traffic',()=>{
  const env=read('public/games/meow-wars/v16-menu-city-life.js');
  for(const marker of [
    'retireLegacyCityTraffic','makePatrolBoat','makeDoubleDecker','makeSplashTour','addFarRoad',
    "label:'GARDA'","label:'POLICE'","label:'DUBLIN'","label:'LONDON'",
    "'SPLASH TOUR'","separatedTrafficBands:true"
  ]) assert.ok(env.includes(marker),marker);
  assert.match(env,/item\.kind!=='traffic'/);
  assert.match(env,/item\.kind!=='boat' && item\.kind!=='boat-left'/);
  assert.match(env,/patrolBoatsCreated/);
  assert.match(env,/roadVehiclesCreated/);
});

test('Meow Wars v1.6 city polish remains cosmetic-only',()=>{
  const env=read('public/games/meow-wars/v16-menu-city-life.js');
  assert.doesNotMatch(env,/carveCircle\(/);
  assert.doesNotMatch(env,/damageCat\(/);
  assert.doesNotMatch(env,/fireCurrentWeapon\(/);
  assert.doesNotMatch(env,/teamAmmo\[/);
  assert.doesNotMatch(env,/turnRemainingMs\s*=/);
  assert.doesNotMatch(env,/\.hp\s*[-+]?=/);
});

test('Meow Wars v1.6 preserves v1.5 transition safeguards and v1.2 online authority',()=>{
  const v15=read('public/games/meow-wars/v15-scene-depth.js');
  const v12=read('public/games/meow-wars/v12-online.js');
  assert.match(v15,/auditMenuTransition/);
  assert.match(v15,/transitionRepairs/);
  assert.match(v12,/sendHostSnapshot/);
  assert.match(v12,/applyGuestSnapshot/);
  assert.match(v12,/scheduleReconnect/);
  assert.match(v12,/ONLINE 1V1/);
});

test('Meow Wars v1.6 shell and loader expose the menu-city-life release',()=>{
  const html=read('public/games/meow-wars/index.html');
  const loader=read('public/games/meow-wars/v16-loader.mjs');
  assert.match(html,/v16-loader\.mjs\?v=16a/);
  assert.match(html,/data-version="1\.6\.0"/);
  assert.match(html,/data-build="mw-v16-menu-city-life-20260918a"/);
  assert.match(loader,/v15-scene-depth\.js\?v=16a/);
  assert.match(loader,/v16-menu-city-life\.js\?v=16a/);
  assert.match(loader,/__MEOW_WARS_LOADER_BUILD/);
});
