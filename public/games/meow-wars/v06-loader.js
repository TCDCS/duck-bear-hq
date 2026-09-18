/* Meow Wars v0.6 HD production loader.
   Preserves the proven v0.5 gameplay payload and injects the v0.6 visual layer
   before Phaser creates the game instance. */
(async () => {
  const payloadUrls = Array.from({ length: 6 }, (_, i) => `./v05-payload-${i + 1}.txt?v=5`);
  const payloadParts = await Promise.all(payloadUrls.map(async (url) => {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Missing Meow Wars v0.5 payload: ${url}`);
    return response.text();
  }));
  const packed = payloadParts.join('').replace(/\s+/g, '');
  const bytes = Uint8Array.from(atob(packed), (c) => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const v05Source = await new Response(stream).text();

  const hdResponse = await fetch('./v06-hd.js?v=6', { cache: 'no-store' });
  if (!hdResponse.ok) throw new Error('Missing Meow Wars v0.6 HD layer');
  const hdSource = await hdResponse.text();

  const bootMarker = 'new Phaser.Game(config);';
  const bootIndex = v05Source.lastIndexOf(bootMarker);
  const source = bootIndex >= 0
    ? v05Source.slice(0, bootIndex) + '\n;/* v0.6 HD injection */\n' + hdSource + '\n' + v05Source.slice(bootIndex)
    : v05Source + '\n;/* v0.6 HD late injection */\n' + hdSource;

  const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
  const script = document.createElement('script');
  script.src = url;
  script.onload = () => URL.revokeObjectURL(url);
  script.onerror = () => {
    URL.revokeObjectURL(url);
    throw new Error('Unable to start Meow Wars v0.6 HD');
  };
  document.body.appendChild(script);
})().catch((error) => {
  console.error(error);
  const message = document.createElement('div');
  message.textContent = 'Meow Wars could not start. Please refresh this page in a current browser.';
  message.style.cssText = 'color:white;font:700 18px Arial;padding:24px;text-align:center';
  document.body.appendChild(message);
});