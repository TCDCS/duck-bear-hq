import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const baseUrl = process.env.MEOW_WARS_URL || 'http://127.0.0.1:8787/games/meow-wars/';
const outputDir = new URL('../artifacts/meow-wars-v12-online/', import.meta.url);
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const hostContext = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1
});
const guestContext = await browser.newContext({
  viewport: { width: 900, height: 700 },
  deviceScaleFactor: 1,
  hasTouch: true,
  isMobile: true
});
const host = await hostContext.newPage();
const guest = await guestContext.newPage();

const errors = [];
for (const [page, label] of [[host, 'host'], [guest, 'guest']]) {
  page.on('pageerror', (error) => errors.push(label + ' pageerror: ' + error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(label + ' console: ' + message.text());
  });
}

function out(name) {
  return new URL(name, outputDir).pathname;
}

async function waitGame(page) {
  await page.locator('canvas').waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForFunction(() =>
    globalThis.__MEOW_WARS_BUILD === 'mw-v12-online-rooms-20260918a',
    null,
    { timeout: 30000 }
  );
  await page.waitForTimeout(350);
}

async function logicalPoint(page, x, y) {
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('Canvas missing');
  return {
    x: box.x + (x / 1280) * box.width,
    y: box.y + (y / 720) * box.height
  };
}

async function logicalClick(page, x, y) {
  const point = await logicalPoint(page, x, y);
  await page.mouse.click(point.x, point.y);
}

async function logicalHold(page, x, y, ms) {
  const point = await logicalPoint(page, x, y);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

async function roomCode(page) {
  return page.evaluate(() => globalThis.__MEOW_WARS_ONLINE?.room?.code || '');
}

try {
  const version = await fetch(new URL('/api/meow-wars/version', baseUrl)).then((r) => r.json());
  if (!version.multiplayer || version.maxPlayers !== 2) {
    throw new Error('Meow Wars room API unavailable: ' + JSON.stringify(version));
  }

  await Promise.all([
    host.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }),
    guest.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 45000 })
  ]);
  await Promise.all([waitGame(host), waitGame(guest)]);
  await Promise.all([
    host.locator('#mw-online-launcher').waitFor({ state: 'visible', timeout: 15000 }),
    guest.locator('#mw-online-launcher').waitFor({ state: 'visible', timeout: 15000 })
  ]);

  // Host chooses Ha'penny Bridge before creating the room.
  for (let i = 0; i < 4; i += 1) {
    await logicalClick(host, 955, 257);
    await host.waitForTimeout(80);
  }

  await host.locator('#mw-online-launcher').click();
  await host.locator('#mw-online-overlay').waitFor({ state: 'visible', timeout: 5000 });
  await host.locator('#mw-online-name').fill('Blue Host');
  await host.locator('#mw-online-create').click();
  await host.waitForFunction(() =>
    /^\d{4}$/.test(globalThis.__MEOW_WARS_ONLINE?.room?.code || '') &&
    globalThis.__MEOW_WARS_ONLINE?.connected,
    null,
    { timeout: 10000 }
  );
  const code = await roomCode(host);

  await host.screenshot({ path: out('host-room-created.png'), fullPage: true });

  await guest.locator('#mw-online-launcher').click();
  await guest.locator('#mw-online-overlay').waitFor({ state: 'visible', timeout: 5000 });
  await guest.locator('#mw-online-name').fill('Red Mobile');
  await guest.locator('#mw-online-code').fill(code);
  await guest.locator('#mw-online-join').click();

  await Promise.all([
    host.waitForFunction(() =>
      globalThis.__MEOW_WARS_ONLINE?.room?.players?.length === 2 &&
      globalThis.__MEOW_WARS_ONLINE.room.players.every((p) => p.connected),
      null,
      { timeout: 10000 }
    ),
    guest.waitForFunction(() =>
      globalThis.__MEOW_WARS_ONLINE?.connected &&
      globalThis.__MEOW_WARS_ONLINE?.room?.players?.length === 2,
      null,
      { timeout: 10000 }
    )
  ]);

  const identities = await Promise.all([
    host.evaluate(() => ({
      id: globalThis.__MEOW_WARS_ONLINE.session.id,
      team: globalThis.__MEOW_WARS_ONLINE.session.team,
      arena: globalThis.__MEOW_WARS_ONLINE.room.settings.arenaId
    })),
    guest.evaluate(() => ({
      id: globalThis.__MEOW_WARS_ONLINE.session.id,
      team: globalThis.__MEOW_WARS_ONLINE.session.team,
      arena: globalThis.__MEOW_WARS_ONLINE.room.settings.arenaId
    }))
  ]);
  if (identities[0].id !== 0 || identities[0].team !== 0 ||
      identities[1].id !== 1 || identities[1].team !== 1 ||
      identities[0].arena !== 'oconnell-bridge-spire' ||
      identities[1].arena !== 'oconnell-bridge-spire') {
    throw new Error('Unexpected online identities/setup: ' + JSON.stringify(identities));
  }

  await guest.locator('#mw-online-ready').click();
  await host.waitForFunction(() =>
    globalThis.__MEOW_WARS_ONLINE.room.players.find((p) => p.id === 1)?.ready === true,
    null,
    { timeout: 5000 }
  );
  await host.screenshot({ path: out('host-room-ready.png'), fullPage: true });
  await guest.screenshot({ path: out('guest-mobile-ready.png'), fullPage: true });

  await host.locator('#mw-online-start').click();

  await Promise.all([
    host.waitForFunction(() =>
      globalThis.__MEOW_WARS_GAME_SCENE?.mode === 'online' &&
      globalThis.__MEOW_WARS_ACTIVE_ARENA === 'oconnell-bridge-spire',
      null,
      { timeout: 15000 }
    ),
    guest.waitForFunction(() =>
      globalThis.__MEOW_WARS_GAME_SCENE?.mode === 'online' &&
      globalThis.__MEOW_WARS_ACTIVE_ARENA === 'oconnell-bridge-spire',
      null,
      { timeout: 15000 }
    )
  ]);

  await Promise.all([
    host.waitForFunction(() => globalThis.__MEOW_WARS_V12_STATS?.snapshotsSent > 0, null, { timeout: 5000 }),
    guest.waitForFunction(() =>
      globalThis.__MEOW_WARS_V12_STATS?.snapshotsReceived > 0 &&
      globalThis.__MEOW_WARS_V10_STATS?.touchUiCreated > 0,
      null,
      { timeout: 5000 }
    )
  ]);

  await host.screenshot({ path: out('host-online-battle.png'), fullPage: true });
  await guest.screenshot({ path: out('guest-mobile-online-battle.png'), fullPage: true });

  // Advance the authoritative host to the red player's turn.
  await host.evaluate(() => globalThis.__MEOW_WARS_GAME_SCENE.endTurn('online-e2e'));
  await Promise.all([
    host.waitForFunction(() => globalThis.__MEOW_WARS_GAME_SCENE?.activeCat?.().team === 1, null, { timeout: 5000 }),
    guest.waitForFunction(() => globalThis.__MEOW_WARS_GAME_SCENE?.activeCat?.().team === 1, null, { timeout: 5000 })
  ]);

  const beforeX = await host.evaluate(() => globalThis.__MEOW_WARS_GAME_SCENE.activeCat().x);

  // Use the actual mobile right-arrow control long enough to produce a state intent.
  await logicalHold(guest, 126, 565, 420);
  await Promise.all([
    guest.waitForFunction(() =>
      globalThis.__MEOW_WARS_V12_STATS?.intentsSent > 0 &&
      globalThis.__MEOW_WARS_V10_STATS?.touchControlEvents > 0,
      null,
      { timeout: 5000 }
    ),
    host.waitForFunction(() => globalThis.__MEOW_WARS_V12_STATS?.intentsApplied > 0, null, { timeout: 5000 })
  ]);

  const afterX = await host.evaluate(() => globalThis.__MEOW_WARS_GAME_SCENE.activeCat().x);
  if (!(afterX > beforeX + 1)) {
    throw new Error('Guest mobile movement was not applied authoritatively: ' + JSON.stringify({ beforeX, afterX }));
  }

  const intentsBeforeFire = await host.evaluate(() => globalThis.__MEOW_WARS_V12_STATS.intentsApplied);
  await logicalHold(guest, 1198, 585, 520);
  await host.waitForFunction((before) =>
    globalThis.__MEOW_WARS_V12_STATS?.intentsApplied > before,
    intentsBeforeFire,
    { timeout: 5000 }
  );
  await host.waitForFunction(() =>
    globalThis.__MEOW_WARS_GAME_SCENE?.actionLocked ||
    globalThis.__MEOW_WARS_GAME_SCENE?.projectiles?.length > 0,
    null,
    { timeout: 5000 }
  );

  await guest.screenshot({ path: out('guest-mobile-fired.png'), fullPage: true });

  // Reload the mobile guest: localStorage room pass must reconnect to the same active battle.
  const tokenBefore = await guest.evaluate(() => globalThis.__MEOW_WARS_ONLINE.session.token);
  await guest.reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
  await waitGame(guest);

  await guest.waitForFunction(() =>
    globalThis.__MEOW_WARS_ONLINE?.connected &&
    globalThis.__MEOW_WARS_ONLINE?.room?.phase === 'battle' &&
    globalThis.__MEOW_WARS_GAME_SCENE?.mode === 'online',
    null,
    { timeout: 20000 }
  );
  await host.waitForFunction(() =>
    globalThis.__MEOW_WARS_ONLINE?.room?.players?.find((p) => p.id === 1)?.connected === true,
    null,
    { timeout: 10000 }
  );
  await guest.waitForFunction(() => globalThis.__MEOW_WARS_V12_STATS?.snapshotsReceived > 0, null, { timeout: 7000 });

  const reconnect = await guest.evaluate(() => ({
    token: globalThis.__MEOW_WARS_ONLINE.session.token,
    id: globalThis.__MEOW_WARS_ONLINE.session.id,
    team: globalThis.__MEOW_WARS_ONLINE.session.team,
    arena: globalThis.__MEOW_WARS_ACTIVE_ARENA,
    connected: globalThis.__MEOW_WARS_ONLINE.connected,
    room: globalThis.__MEOW_WARS_ONLINE.room.code
  }));
  if (reconnect.token !== tokenBefore || reconnect.id !== 1 || reconnect.team !== 1 ||
      reconnect.arena !== 'oconnell-bridge-spire' || reconnect.room !== code || !reconnect.connected) {
    throw new Error('Mobile reconnect did not restore the room: ' + JSON.stringify(reconnect));
  }

  await guest.screenshot({ path: out('guest-mobile-reconnected.png'), fullPage: true });

  const finalState = await Promise.all([
    host.evaluate(() => ({
      room: globalThis.__MEOW_WARS_ONLINE.room,
      stats: globalThis.__MEOW_WARS_V12_STATS,
      build: globalThis.__MEOW_WARS_BUILD
    })),
    guest.evaluate(() => ({
      room: globalThis.__MEOW_WARS_ONLINE.room,
      stats: globalThis.__MEOW_WARS_V12_STATS,
      build: globalThis.__MEOW_WARS_BUILD
    }))
  ]);

  if (finalState.some((state) => state.build !== 'mw-v12-online-rooms-20260918a')) {
    throw new Error('Unexpected online build: ' + JSON.stringify(finalState.map((x) => x.build)));
  }

  if (errors.length) {
    throw new Error('Browser errors:\n' + [...new Set(errors)].join('\n'));
  }

  console.log(JSON.stringify({
    ok: true,
    code,
    hostSnapshots: finalState[0].stats.snapshotsSent,
    guestSnapshots: finalState[1].stats.snapshotsReceived,
    guestReconnects: finalState[1].stats.reconnectSuccesses,
    intentsApplied: finalState[0].stats.intentsApplied
  }, null, 2));
} finally {
  await hostContext.close();
  await guestContext.close();
  await browser.close();
}
