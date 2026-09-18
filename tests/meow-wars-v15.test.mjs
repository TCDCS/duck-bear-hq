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

function composeV15(){
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
    read('public/games/meow-wars/v15-scene-depth.js')
  ];

  const marker='new Phaser.Game(config);';
  const index=source.lastIndexOf(marker);
  assert.ok(index>0);
  return source.slice(0,index)+'\n'+layers.join('\n')+'\n'+source.slice(index);
}

test('Meow Wars v1.5 composes and compiles over the complete production stack',()=>{
  const source=composeV15();
  assert.doesNotThrow(()=>new Function(source));
  assert.match(source,/mw-v15-scene-depth-20260918a/);
  assert.match(source,/mw-v14-atmosphere-materials-20260918a/);
  assert.match(source,/mw-v12-online-rooms-20260918a/);
  assert.doesNotMatch(source,/setTintFill/);
});

test('Meow Wars v1.5 gives every map stronger layered scene depth',()=>{
  const env=read('public/games/meow-wars/v15-scene-depth.js');
  for(const marker of [
    'drawGardenDepth','drawRooftopDepth','drawJunkyardDepth','drawTajDepth',
    'drawDublinDepth','drawWestminsterDepth','drawBeachDepth',
    'drawGroundClutter','createDepthLayers','updateNearWater','updateObjects',
    'foregroundFraming:true','groundMicroDetail:true','nearWaterDetail:true'
  ]) assert.ok(env.includes(marker),marker);

  for(const kind of ['leaf','beacon','smoke','bird','rain-splash','grass'])
    assert.ok(env.includes("'"+kind+"'"),kind);
});

test('Meow Wars v1.5 keeps its new scene layer cosmetic-only',()=>{
  const env=read('public/games/meow-wars/v15-scene-depth.js');
  assert.match(env,/cosmeticOnly:true/);
  assert.doesNotMatch(env,/carveCircle\(/);
  assert.doesNotMatch(env,/damageCat\(/);
  assert.doesNotMatch(env,/fireCurrentWeapon\(/);
  assert.doesNotMatch(env,/teamAmmo\[/);
  assert.doesNotMatch(env,/turnRemainingMs\s*=/);
  assert.doesNotMatch(env,/\.hp\s*[-+]?=/);
});

test('Meow Wars v1.5 audits the existing menu-to-new-arena fix without replacing the proven path',()=>{
  const env=read('public/games/meow-wars/v15-scene-depth.js');
  assert.match(env,/const v14MenuStart=MenuScene\.prototype\.start/);
  assert.match(env,/const result=v14MenuStart\.call\(this\)/);
  assert.match(env,/auditMenuTransition\(this,arena\.id,payload\)/);
  assert.match(env,/__MEOW_WARS_LAST_CONFIRMED_ARENA/);
  assert.match(env,/if\(!menuActive \|\| gameActive\) return/);
  assert.match(env,/transitionRepairs/);
  assert.match(env,/scene\.input\?\.keyboard\?\.resetKeys\?\.\(\)/);
  assert.match(env,/scene\.scene\.start\('GameScene',payload\)/);
});

test('Meow Wars v1.5 preserves v1.4 materials and v1.2 online/mobile rooms',()=>{
  const v14=read('public/games/meow-wars/v14-atmosphere-materials.js');
  const v12=read('public/games/meow-wars/v12-online.js');
  const v10=read('public/games/meow-wars/v10-release.js');
  const routes=read('src/game-routes.js');

  assert.match(v14,/materialDamageStates:true/);
  assert.match(v14,/propMaterialMicroDetail:true/);
  assert.match(v12,/ONLINE 1V1/);
  assert.match(v12,/scheduleReconnect/);
  assert.match(v12,/sendHostSnapshot/);
  assert.match(v12,/applyGuestSnapshot/);
  assert.match(v10,/createTouchUi/);
  assert.match(routes,/routeMeowWarsMultiplayer/);
});

test('Meow Wars v1.5 shell and loader expose the scene-depth release',()=>{
  const html=read('public/games/meow-wars/index.html');
  const loader=read('public/games/meow-wars/v15-loader.mjs');

  assert.match(html,/v15-loader\.mjs\?v=15a/);
  assert.match(html,/data-version="1\.5\.0"/);
  assert.match(html,/data-build="mw-v15-scene-depth-20260918a"/);
  assert.match(loader,/v14-atmosphere-materials\.js\?v=15a/);
  assert.match(loader,/v15-scene-depth\.js\?v=15a/);
  assert.match(loader,/__MEOW_WARS_LOADER_BUILD/);
});
