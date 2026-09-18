const CLOSE_MARKER = "\n} else {\nfloor = box('arena-floor'";

const DETAIL_BLOCK = `
const retailNavy = makeMaterial(B, scene, 'supermarket-retail-navy', '#17324d');
const retailBlueLight = makeMaterial(B, scene, 'supermarket-retail-blue-light', '#dcebf5');
const promoYellow = makeMaterial(B, scene, 'supermarket-promo-yellow', '#ffd84f');
const wallPanel = makeMaterial(B, scene, 'supermarket-wall-panel-mat', '#d6e1e8');
const serviceMat = makeMaterial(B, scene, 'supermarket-service-mat', '#2c6cab');
const produceTrim = makeMaterial(B, scene, 'supermarket-produce-trim', '#4f8f46');

for (const [x, z, w, d] of [
  [0, -9.35, arena.size.x - 0.8, 0.22],
  [0, 9.35, arena.size.x - 0.8, 0.22],
  [-12.35, 0, 0.22, arena.size.z - 0.8],
  [12.35, 0, 0.22, arena.size.z - 0.8],
]) {
  box('supermarket-floor-border', [w, 0.035, d], [x, 0.026, z], tescoBlue, null, false);
}

for (const x of [-5.6, -1.8, 2.0]) {
  box('supermarket-checkout-lane-strip', [2.65, 0.025, 2.4], [x, 0.022, -5.25], retailBlueLight, null, false);
  box('supermarket-checkout-lane-arrow', [0.58, 0.03, 1.5], [x, 0.038, -4.9], tescoRed, null, false);
  box('supermarket-cashier-screen', [0.5, 0.42, 0.12], [x + 0.72, 1.3, -6.62], retailNavy, null, false);
  box('supermarket-impulse-rack', [0.35, 1.0, 0.72], [x - 1.18, 0.5, -6.1], shelfMat);
  for (let snack = 0; snack < 5; snack++) {
    box(
      'supermarket-impulse-product',
      [0.2, 0.16, 0.22],
      [x - 1.18, 0.25 + snack * 0.16, -6.12],
      productMats[(snack + Math.round(x * 10)) % productMats.length < 0 ? snack % productMats.length : (snack + Math.abs(Math.round(x * 10))) % productMats.length],
      null,
      false,
    );
  }
}

box('supermarket-service-desk', [4.8, 1.15, 1.45], [7.2, 0.58, -7.5], serviceMat);
box('supermarket-service-trim', [4.85, 0.18, 1.5], [7.2, 1.18, -7.5], tescoRed);
sign('supermarket-service-sign', 'CUSTOMER SERVICE', [7.2, 2.25, -7.78], [4.1, 0.72], Math.PI, '#00539f', '#ffffff');

for (const x of [-11.0, -8.7]) {
  const entryGlass = box('supermarket-entry-glass', [2.0, 3.25, 0.07], [x, 1.63, -9.25], glassMat, null, false);
  entryGlass.material.alpha = 0.34;
  box('supermarket-entry-frame', [0.08, 3.4, 0.11], [x - 1.0, 1.7, -9.23], retailNavy, null, false);
  box('supermarket-entry-frame', [0.08, 3.4, 0.11], [x + 1.0, 1.7, -9.23], retailNavy, null, false);
}
sign('supermarket-entry-sign', 'WELCOME', [-9.85, 3.75, -9.15], [4.2, 0.65], Math.PI, '#00539f', '#ffffff');

box('supermarket-bakery-canopy', [0.22, 2.0, 4.7], [-12.18, 2.4, 4.9], tescoRed, null, false);
box('supermarket-bakery-warm-panel', [0.18, 1.6, 4.4], [-12.06, 1.25, 4.9], creamMat, null, false);

box('supermarket-produce-awning', [3.7, 0.18, 0.25], [8.8, 2.42, -5.02], produceTrim, null, false);
for (const x of [7.25, 8.25, 9.25, 10.25]) {
  cylinder('supermarket-produce-awning-post', { height: 2.35, diameter: 0.08, tessellation: 8 }, [x, 1.18, -5.02], produceTrim, null, false);
}

for (let aisleIndex = 0; aisleIndex < aisleXs.length; aisleIndex++) {
  const x = aisleXs[aisleIndex];
  for (const z of [-2.52, 4.92]) {
    box('supermarket-endcap-promo', [1.42, 1.5, 0.16], [x, 1.0, z], aisleIndex % 2 ? promoYellow : tescoRed, null, false);
    sign(
      'supermarket-endcap-price',
      aisleIndex % 2 ? 'SPECIAL' : 'SAVE',
      [x, 2.03, z + (z < 0 ? -0.11 : 0.11)],
      [1.25, 0.42],
      z < 0 ? Math.PI : 0,
      aisleIndex % 2 ? '#ffd84f' : '#ee1c25',
      aisleIndex % 2 ? '#17324d' : '#ffffff',
    );
  }
}

for (const [x, z, text, bg] of [
  [-8.3, 6.8, 'BAKERY FRESH', '#ee1c25'],
  [0, 7.2, 'CLUBCARD PRICES', '#00539f'],
  [8.0, 6.8, 'FRESH & CHILLED', '#4f8f46'],
]) {
  sign('supermarket-promo-banner', text, [x, 4.25, z], [4.0, 0.78], Math.PI, bg, '#ffffff');
}

for (const z of [-6.0, -1.5, 3.0, 7.0]) {
  box('supermarket-light-truss', [arena.size.x - 2.0, 0.07, 0.09], [0, 4.82, z], retailNavy, null, false);
}

box('supermarket-wall-panelling-back', [arena.size.x - 0.55, 1.7, 0.08], [0, 1.1, 9.43], wallPanel, null, false);
box('supermarket-wall-panelling-left', [0.08, 1.7, arena.size.z - 0.55], [-12.67, 1.1, 0], wallPanel, null, false);
box('supermarket-wall-panelling-right', [0.08, 1.7, arena.size.z - 0.55], [12.67, 1.1, 0], wallPanel, null, false);
`;

export function patchDanaoSupermarketArtVisuals(source) {
  const out = String(source);
  if (!out.includes(CLOSE_MARKER)) throw new Error('Danao supermarket art visual patch marker missing');
  if (out.includes('supermarket-service-desk')) return out;
  return out.replace(CLOSE_MARKER, DETAIL_BLOCK + CLOSE_MARKER);
}
