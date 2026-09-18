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

function composeV14(){
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
    read('public/games/meow-wars/v14-atmosphere-materials.js')
  ];

  const marker='new Phaser.Game(config);';
  const index=source.lastIndexOf(marker);
  assert.ok(index>0);
  return source.slice(0,index)+'\n'+layers.join('\n')+'\n'+source.slice(index);
}

test('Meow Wars v1.4 composes and compiles over the real production and online stack',()=>{
  const source=composeV14();
  assert.doesNotThrow(()=>new Function(source));
  assert.match(source,/mw-v14-atmosphere-materials-20260918a/);
  assert.match(source,/mw-v13-environment-depth-20260918a/);
  assert.match(source,/mw-v12-online-rooms-20260918a/);
  assert.doesNotMatch(source,/setTintFill/);
});

test('Meow Wars v1.4 gives all seven maps a distinct lighting and atmosphere identity',()=>{
  const env=read('public/games/meow-wars/v14-atmosphere-materials.js');
  const moods=[
    'Warm Afternoon','Neon Dusk','Rust Sunset','Golden Hour',
    'Rainy Evening','Thames Evening','Sea Mist'
  ];
  for(const mood of moods)assert.ok(env.includes(mood),mood);
  for(const marker of [
    'setupLighting','setupAtmosphere','updateAtmosphere','setupDublinLightLife',
    'setupWestminsterLightLife','cloud-shadow','neon','dust','petal','traffic','mist'
  ])assert.ok(env.includes(marker),marker);
});

test('Meow Wars v1.4 adds realistic material classes and damage reactions',()=>{
  const env=read('public/games/meow-wars/v14-atmosphere-materials.js');
  for(const material of ['glass','metal','wood','rubber','plastic','stone'])
    assert.ok(env.includes("'"+material+"'"),material);

  for(const marker of [
    'PROP_MATERIAL','spawnMaterialBurst','reactToPropChanges','snapshotProps',
    'setupDamagePresentation','updateDamagePresentation','drawPropMaterialDetail',
    'materialDamageStates:true','propMaterialMicroDetail:true','propMaterialDetails',
    'greenhouse','oil-drum','pub-barrels','wheelie-bin','lifebuoy'
  ])assert.ok(env.includes(marker),marker);

  assert.match(env,/scene\.add\.triangle/);
  assert.match(env,/stats\.materialHits/);
  assert.match(env,/stats\.materialBursts/);
  assert.match(env,/stats\.propMaterialDetails/);
  assert.match(env,/Multi-angle highlights suggest panes/);
  assert.match(env,/Tyre-like diagonal tread marks/);
});

test('Meow Wars v1.4 improves wet-surface light/reflection while remaining cosmetic-only',()=>{
  const env=read('public/games/meow-wars/v14-atmosphere-materials.js');

  assert.match(env,/updateSurface/);
  assert.match(env,/wetSurfaceLight:true/);
  assert.match(env,/oconnell-bridge-spire/);
  assert.match(env,/westminster-bridge-big-ben/);
  assert.match(env,/donabate-beach/);
  assert.match(env,/taj-mahal/);

  assert.doesNotMatch(env,/carveCircle\(/);
  assert.doesNotMatch(env,/damageCat\(/);
  assert.doesNotMatch(env,/fireCurrentWeapon\(/);
  assert.doesNotMatch(env,/teamAmmo\[/);
  assert.doesNotMatch(env,/turnRemainingMs\s*=/);
});

test('Meow Wars v1.4 preserves v1.3 environment depth and v1.2 online/mobile rooms',()=>{
  const v13=read('public/games/meow-wars/v13-environment-depth.js');
  const v12=read('public/games/meow-wars/v12-online.js');
  const v10=read('public/games/meow-wars/v10-release.js');
  const routes=read('src/game-routes.js');

  assert.match(v13,/Rainy Liffey/);
  assert.match(v13,/createWaterGraphics/);
  assert.match(v13,/setupPropPresentation/);
  assert.match(v12,/ONLINE 1V1/);
  assert.match(v12,/scheduleReconnect/);
  assert.match(v12,/sendHostSnapshot/);
  assert.match(v12,/applyGuestSnapshot/);
  assert.match(v10,/createTouchUi/);
  assert.match(routes,/routeMeowWarsMultiplayer/);
});

test('Meow Wars v1.4 shell and loader expose atmosphere-material release',()=>{
  const html=read('public/games/meow-wars/index.html');
  const loader=read('public/games/meow-wars/v14-loader.mjs');

  assert.match(html,/v14-loader\.mjs\?v=14a/);
  assert.match(html,/data-version="1\.4\.0"/);
  assert.match(html,/data-build="mw-v14-atmosphere-materials-20260918a"/);
  assert.match(loader,/v13-environment-depth\.js\?v=14a/);
  assert.match(loader,/v14-atmosphere-materials\.js\?v=14a/);
  assert.match(loader,/__MEOW_WARS_LOADER_BUILD/);
});
