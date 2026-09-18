import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const baseUrl = process.env.MEOW_WARS_URL || 'http://127.0.0.1:4173/games/meow-wars/';
const variant = process.env.MEOW_WARS_VARIANT || 'after';
const arenaCount = Number(process.env.MEOW_WARS_ARENAS || 7);
const expectedBuild = process.env.MEOW_WARS_BUILD || '';
const outputDir = new URL('../artifacts/meow-wars-v16/', import.meta.url);
await mkdir(outputDir, { recursive: true });

const arenaNames = [
  'garden-siege',
  'rooftop-rumble',
  'junkyard-jamboree',
  'taj-mahal',
  'hapenny-bridge-spire',
  'westminster-bridge-big-ben',
  'donabate-beach'
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1
});

const runtimeErrors = [];
page.on('pageerror', (error) => runtimeErrors.push('pageerror: ' + error.message));
page.on('console', (message) => {
  if (message.type() === 'error') runtimeErrors.push('console: ' + message.text());
});

async function waitForGame() {
  await page.locator('canvas').waitFor({ state: 'visible', timeout: 30000 });
  if (expectedBuild) {
    await page.waitForFunction((build) => globalThis.__MEOW_WARS_BUILD === build, expectedBuild, { timeout: 30000 });
  }
  await page.waitForTimeout(320);
}

async function openMenu() {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await waitForGame();
}

async function logicalPoint(x, y) {
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Meow Wars canvas is not visible');
  return {
    x: box.x + (x / 1280) * box.width,
    y: box.y + (y / 720) * box.height
  };
}

async function logicalClick(x, y) {
  const point = await logicalPoint(x, y);
  await page.mouse.click(point.x, point.y);
}

function output(name) {
  return new URL(name, outputDir).pathname;
}

async function startArena(index) {
  await openMenu();
  for (let i = 0; i < index; i += 1) {
    await logicalClick(955, 257);
    await page.waitForTimeout(70);
  }
  await logicalClick(640, 603);
  await page.waitForFunction(() => typeof globalThis.__meowWarsActionLog === 'function', { timeout: 20000 });
  await page.waitForTimeout(620);
}

async function forceReturnToMenu() {
  await page.evaluate(() => {
    const scene = globalThis.__MEOW_WARS_GAME_SCENE;
    if (!scene) throw new Error('GameScene unavailable for menu regression');
    scene.gameOver = true;
  });
  await page.keyboard.down('m');
  await page.waitForTimeout(110);
  await page.keyboard.up('m');
  await page.waitForFunction(() => {
    return !!globalThis.__MEOW_WARS_MENU_SCENE?.sys?.isActive?.();
  }, { timeout: 5000 });
  await page.waitForTimeout(200);
}

async function chooseArenaFromReturnedMenu(index) {
  for (let i = 0; i < index; i += 1) {
    await logicalClick(955, 257);
    await page.waitForTimeout(70);
  }
  const selected = await page.evaluate(() => {
    const menu = globalThis.__MEOW_WARS_MENU_SCENE;
    return { index: menu?.arenaIndex, name: menu?.arenaText?.text };
  });
  if (selected.index !== index) throw new Error('Returned-menu arena selection mismatch: ' + JSON.stringify(selected));
  await logicalClick(640, 603);
}

try {
  await openMenu();
  await page.screenshot({ path: output(`${variant}-00-menu.png`), fullPage: true });

  if (variant === 'after') {
    const menuDiag = await page.evaluate(() => {
      const menu=globalThis.__MEOW_WARS_MENU_SCENE;
      const launcher=document.getElementById('mw-online-launcher');
      const visibleTexts=(menu?.children?.list || [])
        .filter((child)=>typeof child?.text==='string' && child.visible!==false)
        .map((child)=>child.text);
      return {
        cpuX:menu?.cpuButton?.x,
        localX:menu?.localButton?.x,
        launcherDisplay:launcher?getComputedStyle(launcher).display:null,
        visibleTexts,
        stats:globalThis.__MEOW_WARS_V16_STATS
      };
    });
    if (menuDiag.cpuX !== 365 || menuDiag.localX !== 640 ||
        menuDiag.launcherDisplay !== 'none' ||
        !menuDiag.visibleTexts.includes('ONLINE 1V1') ||
        menuDiag.visibleTexts.some((text)=>
          text.startsWith('SELECTED  ·') ||
          text.startsWith('LIVING BATTLEFIELDS ·') ||
          text.startsWith('ATMOSPHERE + MATERIAL DETAIL') ||
          text.startsWith('LAYERED SCENE DEPTH ·'))) {
      throw new Error('v1.6 menu cleanup failed: '+JSON.stringify(menuDiag));
    }
  }

  for (let arenaIndex = 0; arenaIndex < arenaCount; arenaIndex += 1) {
    await startArena(arenaIndex);
    const name = arenaNames[arenaIndex] || `arena-${arenaIndex + 1}`;

    if (variant === 'after') {
      await page.waitForFunction((expected) => globalThis.__MEOW_WARS_ACTIVE_ARENA === expected,
        arenaIndex === 4 ? 'oconnell-bridge-spire' : arenaNames[arenaIndex], { timeout: 5000 });
      await page.waitForFunction(() => globalThis.__MEOW_WARS_V11_STATS?.propsCreated >= 4, { timeout: 4000 });
      await page.waitForFunction(() => globalThis.__MEOW_WARS_V13_STATS?.scenesEnhanced > 0, { timeout: 4000 });
      await page.waitForFunction(() => globalThis.__MEOW_WARS_V14_STATS?.scenesLit > 0, { timeout: 4000 });
      await page.waitForFunction(() => globalThis.__MEOW_WARS_V15_STATS?.scenesLayered > 0, { timeout: 4000 });
      await page.waitForFunction(() => globalThis.__MEOW_WARS_V15_STATS?.depthFrames > 2, { timeout: 4000 });
      await page.waitForFunction(() => globalThis.__MEOW_WARS_V15_STATS?.groundDetails > 0, { timeout: 4000 });
      await page.waitForFunction(() => globalThis.__MEOW_WARS_V16_STATS?.menusCleaned > 0, { timeout: 4000 });
    }

    await page.screenshot({
      path: output(`${variant}-${String(arenaIndex + 1).padStart(2, '0')}-${name}.png`),
      fullPage: true
    });

    if (variant === 'after' && (arenaIndex === 4 || arenaIndex === 5)) {
      await page.waitForFunction((isDublin) => {
        const stats=globalThis.__MEOW_WARS_V16_STATS;
        return stats?.legacyTrafficRemoved > 0 &&
          stats?.legacyBoatsRemoved > 0 &&
          stats?.patrolBoatsCreated > 0 &&
          stats?.roadVehiclesCreated >= (isDublin ? 2 : 1) &&
          stats?.boatFrames > 2 &&
          stats?.roadFrames > 2;
      }, arenaIndex === 4, { timeout: 5000 });
      await page.screenshot({
        path: output('after-city-' + String(arenaIndex + 1).padStart(2, '0') + '-' + name + '.png'),
        fullPage: true
      });
    }

    if (variant === 'after' && [3,4,5,6].includes(arenaIndex)) {
      await page.waitForFunction(() => globalThis.__MEOW_WARS_V13_STATS?.waterFrames > 5, { timeout: 4000 });
      await page.waitForFunction(() => globalThis.__MEOW_WARS_V15_STATS?.nearWaterFrames > 5, { timeout: 4000 });
      if (arenaIndex === 4 || arenaIndex === 5) {
        await page.waitForFunction(() => globalThis.__MEOW_WARS_V13_STATS?.weatherFrames > 2, { timeout: 4000 });
      }
      await page.screenshot({
        path: output('after-depth-' + String(arenaIndex + 1).padStart(2, '0') + '-' + name + '.png'),
        fullPage: true
      });
    }

    if (variant === 'after' && arenaIndex === 0) {
      const beforeProps = await page.evaluate(() => {
        const scene = globalThis.__MEOW_WARS_GAME_SCENE;
        return scene.__mw11Props.map((p) => ({ type:p.type, hp:p.hp, x:p.x, y:p.y }));
      });
      if (beforeProps.length < 4) throw new Error('Garden realistic props missing: ' + JSON.stringify(beforeProps));

      await page.evaluate(() => {
        const scene = globalThis.__MEOW_WARS_GAME_SCENE;
        const prop = scene.__mw11Props[0];
        scene.explode(prop.x, prop.y - 18, {
          id:'dynamite', family:'conventional', damage:120, blastRadius:82, craterScale:1.15
        }, 'blue-1');
      });
      await page.waitForFunction(() => globalThis.__MEOW_WARS_V11_STATS?.propsDestroyed > 0, { timeout: 5000 });
      await page.waitForFunction(() =>
        globalThis.__MEOW_WARS_V14_STATS?.materialHits > 0 &&
        globalThis.__MEOW_WARS_V14_STATS?.materialBursts > 0,
        { timeout: 5000 }
      );
      await page.screenshot({ path: output('after-01b-prop-destruction.png'), fullPage: true });
    }
  }

  if (variant === 'after') {
    await startArena(0);
    await forceReturnToMenu();
    await page.screenshot({ path: output('after-menu-return.png'), fullPage: true });

    await chooseArenaFromReturnedMenu(4);
    await page.waitForFunction(() => globalThis.__MEOW_WARS_ACTIVE_ARENA === 'oconnell-bridge-spire', { timeout: 7000 });
    await page.waitForFunction(() => globalThis.__MEOW_WARS_LAST_CONFIRMED_ARENA === 'oconnell-bridge-spire', { timeout: 5000 });
    await page.waitForTimeout(520);
    await page.screenshot({ path: output('after-menu-return-dublin.png'), fullPage: true });

    await forceReturnToMenu();
    await chooseArenaFromReturnedMenu(5);
    await page.waitForFunction(() => globalThis.__MEOW_WARS_ACTIVE_ARENA === 'westminster-bridge-big-ben', { timeout: 7000 });
    await page.waitForFunction(() => globalThis.__MEOW_WARS_LAST_CONFIRMED_ARENA === 'westminster-bridge-big-ben', { timeout: 5000 });
    await page.waitForTimeout(520);
    await page.screenshot({ path: output('after-menu-return-westminster.png'), fullPage: true });

    const transition = await page.evaluate(() => ({
      v11: globalThis.__MEOW_WARS_V11_STATS,
      v15: globalThis.__MEOW_WARS_V15_STATS,
      v16: globalThis.__MEOW_WARS_V16_STATS,
      build: globalThis.__MEOW_WARS_BUILD,
      info: globalThis.__MEOW_WARS_BUILD_INFO?.()
    }));
    if (transition.v11.menuReturns < 2 ||
        transition.v11.requestedArenaStarts < 2 ||
        transition.v11.confirmedArenaStarts < 2) {
      throw new Error('Menu return regression counters failed: ' + JSON.stringify(transition));
    }
    if (transition.v15.transitionAudits < 2 || transition.v15.transitionRepairs !== 0) {
      throw new Error('v1.5 transition audit failed: ' + JSON.stringify(transition));
    }
    if (transition.build !== 'mw-v16-menu-city-life-20260918a') {
      throw new Error('Unexpected v1.6 build: ' + transition.build);
    }
  }

  if (runtimeErrors.length) {
    throw new Error('Browser errors:\n' + [...new Set(runtimeErrors)].join('\n'));
  }
} finally {
  await browser.close();
}
