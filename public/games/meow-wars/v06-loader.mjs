/* Meow Wars v0.6 production loader.
 * Preserves the proven v0.5 gameplay/animation payload and injects the
 * v0.6 HD environment layer before Phaser creates the game instance.
 */
const VERSION = '0.6.0';
const BUILD = 'mw-v06-env-20260918b';

async function readProductionSource() {
  const urls = Array.from({ length: 6 }, (_, i) => './v05-payload-' + (i + 1) + '.txt?v=6b');
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
  const anchor = 'return Math.min(2, Math.max(1, devicePixelRatio));';
  if (!source.includes(anchor)) throw new Error('Meow Wars render-resolution anchor missing');
  return source.replace(anchor,
    "const viewportScale = Math.max((globalThis.innerWidth || 1280) / 1280, (globalThis.innerHeight || 720) / 720);\n" +
    "    const mobileCap = (globalThis.innerWidth || 1280) < 800 ? 2 : 3;\n" +
    "    return Math.min(mobileCap, 3, Math.max(1, devicePixelRatio, viewportScale));"
  );
}

async function readHdLayer() {
  const response = await fetch('./v06-hd.js?v=6b', { cache: 'no-store' });
  if (!response.ok) throw new Error('Missing Meow Wars v0.6 HD layer');
  return response.text();
}

function composeSource(v05Source, hdSource) {
  const upgraded = upgradeRenderResolution(v05Source);
  const marker = 'new Phaser.Game(config);';
  const index = upgraded.lastIndexOf(marker);
  if (index < 0) throw new Error('Meow Wars Phaser boot anchor missing');
  return upgraded.slice(0, index) +
    '\n;/* Meow Wars v0.6 HD injection */\n' + hdSource + '\n' +
    upgraded.slice(index);
}

async function start() {
  const [v05Source, hdSource] = await Promise.all([readProductionSource(), readHdLayer()]);
  const source = composeSource(v05Source, hdSource);
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
