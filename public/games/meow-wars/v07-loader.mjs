/* Meow Wars v0.7 production loader.
 * Preserves the proven v0.5 gameplay payload, then layers v0.6 HD art
 * and the v0.7 landmark/game-feel pass before Phaser boots.
 */
const VERSION = '0.7.0';
const BUILD = 'mw-v07-gamefeel-20260918a';

async function readProductionSource() {
  const urls = Array.from({ length: 6 }, (_, i) => './v05-payload-' + (i + 1) + '.txt?v=7a');
  const parts = await Promise.all(urls.map(async (url) => {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error('Missing Meow Wars production payload: ' + url);
    return response.text();
  }));
  const payload = parts.join('').replace(/\s+/g, '');
  const bytes = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

function upgradeRenderResolution(source) {
  const pattern = /function preferredRenderResolution\s*\([^)]*\)\s*\{[\s\S]*?\n\}/g;
  const matches = [...source.matchAll(pattern)];
  if (matches.length !== 1) throw new Error('Meow Wars render-resolution anchor mismatch');
  const replacement =
    "function preferredRenderResolution(devicePixelRatio = 1) {\n" +
    "    const viewportScale = Math.max((globalThis.innerWidth || 1280) / 1280, (globalThis.innerHeight || 720) / 720);\n" +
    "    const mobileCap = (globalThis.innerWidth || 1280) < 800 ? 2 : 3;\n" +
    "    return Math.min(mobileCap, 3, Math.max(1, devicePixelRatio, viewportScale));\n" +
    "}";
  const match = matches[0];
  return source.slice(0, match.index) + replacement + source.slice(match.index + match[0].length);
}

function upgradePhaser4Tint(source) {
  const legacy = 'cat.sprite.setTintFill?.(0xffffff);';
  const occurrences = source.split(legacy).length - 1;
  if (occurrences !== 1) throw new Error('Meow Wars Phaser 4 tint anchor mismatch');
  return source.replace(
    legacy,
    'cat.sprite.setTint?.(0xffffff);\n        cat.sprite.setTintMode?.(Phaser.TintModes.FILL);'
  );
}

async function readLayer(url, label) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error('Missing Meow Wars ' + label);
  return response.text();
}

function composeSource(v05Source, hdSource, gamefeelSource) {
  const upgraded = upgradePhaser4Tint(upgradeRenderResolution(v05Source));
  const marker = 'new Phaser.Game(config);';
  const index = upgraded.lastIndexOf(marker);
  if (index < 0) throw new Error('Meow Wars Phaser boot anchor missing');
  return upgraded.slice(0, index) +
    '\n;/* Meow Wars v0.6 HD injection */\n' + hdSource +
    '\n;/* Meow Wars v0.7 landmark + game-feel injection */\n' + gamefeelSource + '\n' +
    upgraded.slice(index);
}

async function start() {
  const [v05Source, hdSource, gamefeelSource] = await Promise.all([
    readProductionSource(),
    readLayer('./v06-hd.js?v=7a', 'v0.6 HD layer'),
    readLayer('./v07-gamefeel.js?v=7a', 'v0.7 game-feel layer')
  ]);
  const source = composeSource(v05Source, hdSource, gamefeelSource);
  globalThis.__MEOW_WARS_LOADER_VERSION = VERSION;
  globalThis.__MEOW_WARS_LOADER_BUILD = BUILD;

  const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
  const script = document.createElement('script');
  script.src = url;
  script.dataset.meowWarsVersion = VERSION;
  script.dataset.meowWarsBuild = BUILD;
  script.onload = () => URL.revokeObjectURL(url);
  script.onerror = () => {
    URL.revokeObjectURL(url);
    throw new Error('Unable to start Meow Wars ' + VERSION + ' (' + BUILD + ')');
  };
  document.body.appendChild(script);
}

start().catch((error) => {
  console.error(error);
  const message = document.createElement('div');
  message.innerHTML = '<strong>Meow Wars could not start.</strong><br>Please refresh this page in a current browser.';
  message.style.cssText = 'color:white;font:700 18px Arial;padding:24px;text-align:center;line-height:1.5';
  document.body.appendChild(message);
});
