/* Meow Wars v0.9 production loader.
 * Preserves the real v0.5 gameplay payload and layers:
 * v0.6 HD environments, v0.7.1 Dublin/game-feel,
 * v0.8 battle polish, then v0.9 battle presentation.
 */
const VERSION = '0.9.0';
const BUILD = 'mw-v09-battle-presentation-20260918a';

async function readProductionSource() {
  const urls = Array.from({ length: 6 }, (_, i) => './v05-payload-' + (i + 1) + '.txt?v=9a');
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
  if (occurrences < 1) throw new Error('Meow Wars Phaser 4 tint anchor missing');
  const replacement = 'cat.sprite.setTint?.(0xffffff);\n        cat.sprite.setTintMode?.(Phaser.TintModes.FILL);';
  return source.split(legacy).join(replacement);
}

async function readLayer(url, label) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error('Missing Meow Wars ' + label);
  return response.text();
}

function composeSource(v05, hd, gamefeel, polish, presentation) {
  const upgraded = upgradePhaser4Tint(upgradeRenderResolution(v05));
  const marker = 'new Phaser.Game(config);';
  const index = upgraded.lastIndexOf(marker);
  if (index < 0) throw new Error('Meow Wars Phaser boot anchor missing');

  return upgraded.slice(0, index) +
    '\n;/* Meow Wars v0.6 HD injection */\n' + hd +
    '\n;/* Meow Wars v0.7.1 Dublin + game-feel injection */\n' + gamefeel +
    '\n;/* Meow Wars v0.8 battle-polish injection */\n' + polish +
    '\n;/* Meow Wars v0.9 battle-presentation injection */\n' + presentation + '\n' +
    upgraded.slice(index);
}

async function start() {
  const [v05, hd, gamefeel, polish, presentation] = await Promise.all([
    readProductionSource(),
    readLayer('./v06-hd.js?v=9a', 'v0.6 HD layer'),
    readLayer('./v07-gamefeel.js?v=9a', 'v0.7.1 game-feel layer'),
    readLayer('./v08-battle-polish.js?v=9a', 'v0.8 battle-polish layer'),
    readLayer('./v09-battle-presentation.js?v=9a', 'v0.9 battle-presentation layer')
  ]);

  const source = composeSource(v05, hd, gamefeel, polish, presentation);
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
