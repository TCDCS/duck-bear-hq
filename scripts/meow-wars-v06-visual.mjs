import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const baseUrl = process.env.MEOW_WARS_URL || 'http://127.0.0.1:4173/games/meow-wars/';
const variant = process.env.MEOW_WARS_VARIANT || 'after';
const arenaCount = Number(process.env.MEOW_WARS_ARENAS || (variant === 'before' ? 3 : 7));
const expectedBuild = process.env.MEOW_WARS_BUILD || '';
const outputDir = new URL('../artifacts/meow-wars-v06/', import.meta.url);
await mkdir(outputDir, { recursive: true });

const arenaNames = variant === 'before'
  ? ['garden-siege', 'rooftop-rumble', 'junkyard-jamboree']
  : ['garden-siege', 'rooftop-rumble', 'junkyard-jamboree', 'taj-mahal', 'oconnell-bridge-spire', 'westminster-bridge-big-ben', 'donabate-beach'];

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

async function openMenu() {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 45000 });
  await page.locator('canvas').waitFor({ state: 'visible', timeout: 30000 });
  if (expectedBuild) {
    await page.waitForFunction((build) => globalThis.__MEOW_WARS_BUILD === build, expectedBuild, { timeout: 30000 });
  }
  await page.waitForTimeout(250);
}

async function logicalClick(x, y) {
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Meow Wars canvas is not visible');
  await page.mouse.click(
    box.x + (x / 1280) * box.width,
    box.y + (y / 720) * box.height
  );
}

function output(name) {
  return new URL(name, outputDir).pathname;
}

try {
  await openMenu();
  await page.screenshot({ path: output(`${variant}-00-menu.png`), fullPage: true });

  if (variant === 'after') {
    await logicalClick(1245, 25);
    await page.waitForTimeout(150);
    await page.screenshot({ path: output('after-00-settings.png'), fullPage: true });
    await logicalClick(640, 505);
    await page.waitForTimeout(100);
  }

  for (let arenaIndex = 0; arenaIndex < arenaCount; arenaIndex += 1) {
    await openMenu();
    for (let i = 0; i < arenaIndex; i += 1) {
      await logicalClick(955, 257);
      await page.waitForTimeout(80);
    }

    await logicalClick(640, 603);
    await page.waitForFunction(() => typeof globalThis.__meowWarsActionLog === 'function', { timeout: 20000 });
    await page.waitForTimeout(350);

    const name = arenaNames[arenaIndex] || `arena-${arenaIndex + 1}`;
    await page.screenshot({
      path: output(`${variant}-${String(arenaIndex + 1).padStart(2, '0')}-${name}.png`),
      fullPage: true
    });
  }

  if (runtimeErrors.length) {
    throw new Error('Browser errors:\n' + [...new Set(runtimeErrors)].join('\n'));
  }
} finally {
  await browser.close();
}
