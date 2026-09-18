import { VERSION, BUILD, patchSource } from './v06-patch.mjs?v=6';

async function readProductionSource() {
  const urls = Array.from({ length: 6 }, (_, i) => `./v05-payload-${i + 1}.txt?v=6`);
  const parts = await Promise.all(urls.map(async (url) => {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Missing Meow Wars payload: ${url}`);
    return response.text();
  }));
  const payload = parts.join('').replace(/\s+/g, '');
  const bytes = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

function startPatchedGame(source) {
  const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
  const script = document.createElement('script');
  script.src = url;
  script.onload = () => URL.revokeObjectURL(url);
  script.onerror = () => {
    URL.revokeObjectURL(url);
    throw new Error('Unable to start Meow Wars v' + VERSION);
  };
  document.body.appendChild(script);
}

(async () => {
  const source = await readProductionSource();
  const patched = patchSource(source);
  globalThis.__MEOW_WARS_VERSION = VERSION;
  globalThis.__MEOW_WARS_BUILD = BUILD;
  const host = document.getElementById('game');
  if (host) {
    host.dataset.version = VERSION;
    host.dataset.build = BUILD;
  }
  startPatchedGame(patched);
})().catch((error) => {
  console.error(error);
  const message = document.createElement('div');
  message.textContent = 'Meow Wars could not start. Please refresh this page in a current browser.';
  message.style.cssText = 'color:white;font:700 18px Arial;padding:24px;text-align:center';
  document.body.appendChild(message);
});
