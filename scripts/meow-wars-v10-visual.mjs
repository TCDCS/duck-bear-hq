import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const baseUrl = process.env.MEOW_WARS_URL || 'http://127.0.0.1:4173/games/meow-wars/';
const variant = process.env.MEOW_WARS_VARIANT || 'after';
const arenaCount = Number(process.env.MEOW_WARS_ARENAS || 7);
const expectedBuild = process.env.MEOW_WARS_BUILD || '';
const outputDir = new URL('../artifacts/meow-wars-v10/', import.meta.url);
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
const desktop = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1
});

const runtimeErrors = [];
function captureErrors(page, label) {
  page.on('pageerror', (error) => runtimeErrors.push(label + ' pageerror: ' + error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(label + ' console: ' + message.text());
  });
}
captureErrors(desktop, 'desktop');

async function waitForGame(page) {
  await page.locator('canvas').waitFor({ state: 'visible', timeout: 30000 });
  if (expectedBuild) {
    await page.waitForFunction((build) => globalThis.__MEOW_WARS_BUILD === build, expectedBuild, { timeout: 30000 });
  }
  await page.waitForTimeout(320);
}

async function openMenu(page = desktop) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await waitForGame(page);
}

async function logicalPoint(page, x, y) {
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Meow Wars canvas is not visible');
  return {
    x: box.x + (x / 1280) * box.width,
    y: box.y + (y / 720) * box.height
  };
}

async function logicalClick(page, x, y) {
  const point = await logicalPoint(page, x, y);
  await page.mouse.click(point.x, point.y);
}

function output(name) {
  return new URL(name, outputDir).pathname;
}

try {
  await openMenu();
  await desktop.screenshot({ path: output(`${variant}-00-menu.png`), fullPage: true });

  if (variant === 'after') {
    // Default release settings panel.
    await logicalClick(desktop, 1160, 45);
    await desktop.waitForTimeout(180);
    await desktop.screenshot({ path: output('after-00-settings.png'), fullPage: true });

    // Prove a real setting persists across reload, then restore the default.
    await logicalClick(desktop, 880, 154);
    await desktop.waitForFunction(() => globalThis.__MEOW_WARS_SETTINGS?.aimAssist === false, { timeout: 3000 });
    const storedOff = await desktop.evaluate(() => JSON.parse(localStorage.getItem('meow-wars-v10-settings') || '{}').aimAssist);
    if (storedOff !== false) throw new Error('Aim-assist OFF did not persist to localStorage');

    await openMenu();
    await desktop.waitForFunction(() => globalThis.__MEOW_WARS_SETTINGS?.aimAssist === false, { timeout: 3000 });
    await logicalClick(desktop, 1160, 45);
    await desktop.waitForTimeout(100);
    await desktop.screenshot({ path: output('after-00b-settings-persisted.png'), fullPage: true });

    await logicalClick(desktop, 880, 154);
    await desktop.waitForFunction(() => globalThis.__MEOW_WARS_SETTINGS?.aimAssist === true, { timeout: 3000 });
    await logicalClick(desktop, 640, 590);
    await desktop.waitForTimeout(100);
  }

  for (let arenaIndex = 0; arenaIndex < arenaCount; arenaIndex += 1) {
    await openMenu();
    for (let i = 0; i < arenaIndex; i += 1) {
      await logicalClick(desktop, 955, 257);
      await desktop.waitForTimeout(90);
    }

    await logicalClick(desktop, 640, 603);
    await desktop.waitForFunction(() => typeof globalThis.__meowWarsActionLog === 'function', { timeout: 20000 });
    await desktop.waitForTimeout(520);

    const name = arenaNames[arenaIndex] || `arena-${arenaIndex + 1}`;
    await desktop.screenshot({
      path: output(`${variant}-${String(arenaIndex + 1).padStart(2, '0')}-${name}.png`),
      fullPage: true
    });

    if (variant === 'after' && arenaIndex === 0) {
      await desktop.waitForFunction(() => globalThis.__MEOW_WARS_V10_STATS?.settingsApplied > 0, { timeout: 3000 });
      await desktop.keyboard.down('Space');
      await desktop.waitForTimeout(720);
      await desktop.keyboard.up('Space');
      await desktop.waitForFunction(() => globalThis.__MEOW_WARS_V08_STATS?.terrainDebris > 0, { timeout: 9000 });
      await desktop.waitForTimeout(120);
      await desktop.screenshot({ path: output('after-01b-v10-battle.png'), fullPage: true });
    }
  }

  if (variant === 'after') {
    // Mobile/touch proof in a separate real touch-capable browser context.
    const mobileContext = await browser.newContext({
      viewport: { width: 900, height: 700 },
      deviceScaleFactor: 1,
      hasTouch: true,
      isMobile: true
    });
    const mobile = await mobileContext.newPage();
    captureErrors(mobile, 'mobile');

    await mobile.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await waitForGame(mobile);
    await logicalClick(mobile, 640, 603);
    await mobile.waitForFunction(() => typeof globalThis.__meowWarsActionLog === 'function', { timeout: 20000 });
    await mobile.waitForFunction(() => globalThis.__MEOW_WARS_V10_STATS?.touchUiCreated > 0, { timeout: 4000 });
    await mobile.waitForFunction(() => globalThis.__MEOW_WARS_V10_STATS?.touchInputFrames > 0, { timeout: 4000 });
    await mobile.waitForTimeout(250);
    await mobile.screenshot({ path: output('after-mobile-touch.png'), fullPage: true });

    // Exercise an actual on-screen control.
    await logicalClick(mobile, 126, 565);
    await mobile.waitForFunction(() => globalThis.__MEOW_WARS_V10_STATS?.touchControlEvents > 0, { timeout: 3000 });
    await mobile.waitForTimeout(100);
    await mobile.screenshot({ path: output('after-mobile-touch-input.png'), fullPage: true });

    const mobileStats = await mobile.evaluate(() => ({
      stats: globalThis.__MEOW_WARS_V10_STATS,
      settings: globalThis.__MEOW_WARS_SETTINGS,
      build: globalThis.__MEOW_WARS_BUILD
    }));
    if (!mobileStats.stats || mobileStats.stats.touchUiCreated < 1 || mobileStats.stats.touchControlEvents < 1) {
      throw new Error('v1.0 touch controls did not activate: ' + JSON.stringify(mobileStats));
    }
    if (mobileStats.build !== 'mw-v10-release-20260918a') {
      throw new Error('Unexpected mobile build: ' + mobileStats.build);
    }

    await mobileContext.close();

    const desktopRelease = await desktop.evaluate(() => ({
      settings: globalThis.__MEOW_WARS_SETTINGS,
      stats: globalThis.__MEOW_WARS_V10_STATS
    }));
    if (!desktopRelease.settings || desktopRelease.settings.aimAssist !== true) {
      throw new Error('Release settings were not restored after persistence proof');
    }
  }

  if (runtimeErrors.length) {
    throw new Error('Browser errors:\n' + [...new Set(runtimeErrors)].join('\n'));
  }
} finally {
  await browser.close();
}
