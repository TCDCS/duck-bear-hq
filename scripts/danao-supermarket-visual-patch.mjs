const replaceRequired = (source, before, after, label) => {
  if (!source.includes(before)) throw new Error(`Danao supermarket visual patch marker missing: ${label}`);
  return source.replace(before, after);
};

const replaceRegexRequired = (source, pattern, replacement, label) => {
  if (!pattern.test(source)) throw new Error(`Danao supermarket visual patch marker missing: ${label}`);
  pattern.lastIndex = 0;
  return source.replace(pattern, replacement);
};

const ARM_BEFORE = "const arm = stylizeMesh(B, B.MeshBuilder.CreateCylinder(`${style.id}-arm`, { height: 0.78, diameter: 0.27, tessellation: 12 }, scene));";
const ARM_AFTER = `const arm = style.id === 'hero'
? stylizeMesh(B, B.MeshBuilder.CreateCapsule('hero-arm-soft', { height: 0.86, radius: 0.15, tessellation: 18, capSubdivisions: 6 }, scene))
: stylizeMesh(B, B.MeshBuilder.CreateCylinder(\`\${style.id}-arm\`, { height: 0.78, diameter: 0.27, tessellation: 12 }, scene));`;

const LEG_BEFORE = "const leg = stylizeMesh(B, B.MeshBuilder.CreateCylinder(`${style.id}-leg`, { height: 0.7, diameter: 0.33, tessellation: 12 }, scene));";
const LEG_AFTER = `const leg = style.id === 'hero'
? stylizeMesh(B, B.MeshBuilder.CreateCapsule('hero-leg-soft', { height: 0.78, radius: 0.18, tessellation: 18, capSubdivisions: 6 }, scene))
: stylizeMesh(B, B.MeshBuilder.CreateCylinder(\`\${style.id}-leg\`, { height: 0.7, diameter: 0.33, tessellation: 12 }, scene));`;

const HERO_BADGE_BEFORE = `const badge = stylizeMesh(B, B.MeshBuilder.CreateSphere('hero-mango-badge', { diameter: 0.22, segments: 10 }, scene));
badge.parent = root;
badge.position.set(0, 0.14, 0.56);
badge.scaling.z = 0.35;
badge.material = accent;`;

const HERO_BADGE_AFTER = HERO_BADGE_BEFORE + `
for (const side of [-1, 1]) {
  const ear = stylizeMesh(B, B.MeshBuilder.CreateSphere('hero-ear', { diameter: 0.24, segments: 12 }, scene));
  ear.parent = root;
  ear.position.set(side * 0.43, 1.0, 0.04);
  ear.scaling.set(0.38, 0.85, 0.55);
  ear.material = skin;
}
for (const x of [-0.28, -0.1, 0.1, 0.28]) {
  const fringe = stylizeMesh(B, B.MeshBuilder.CreateSphere('hero-hair-fringe', { diameter: 0.25, segments: 12 }, scene));
  fringe.parent = root;
  fringe.position.set(x, 1.25 - Math.abs(x) * 0.12, 0.27);
  fringe.scaling.set(0.9, 0.55, 0.55);
  fringe.material = hairMat;
}
const heroMouth = B.MeshBuilder.CreateSphere('hero-face-mouth', { diameter: 0.16, segments: 12 }, scene);
heroMouth.parent = root;
heroMouth.position.set(0, 0.83, 0.48);
heroMouth.scaling.set(1.35, 0.28, 0.34);
heroMouth.material = dark;
const heroNose = B.MeshBuilder.CreateSphere('hero-face-nose', { diameter: 0.12, segments: 10 }, scene);
heroNose.parent = root;
heroNose.position.set(0, 0.94, 0.5);
heroNose.scaling.set(0.75, 0.85, 0.65);
heroNose.material = skin;`;

const SUPERMARKET_BLOCK = `if (arena.id === 'ring') {
floor = box('supermarket-floor', [arena.size.x, 0.34, arena.size.z], [0, -0.17, 0], floorMat);
box('supermarket-under', [arena.size.x + 0.8, 0.55, arena.size.z + 0.8], [0, -0.55, 0], darkMat, null, false);

const tescoBlue = makeMaterial(B, scene, 'tesco-blue', '#00539f');
const tescoRed = makeMaterial(B, scene, 'tesco-red', '#ee1c25');
const storeWhite = makeMaterial(B, scene, 'store-white', '#f8f8f4');
const shelfMat = makeMaterial(B, scene, 'supermarket-shelf-metal', '#d8dde1');
const beltMat = makeMaterial(B, scene, 'checkout-belt', '#34383e');
const glassMat = makeMaterial(B, scene, 'freezer-glass', '#d9f1f7', { alpha: 0.58 });
const produceGreen = makeMaterial(B, scene, 'produce-green', '#66a94e');
const produceOrange = makeMaterial(B, scene, 'produce-orange', '#f29a38');
const produceRed = makeMaterial(B, scene, 'produce-red', '#d94b4b');
const productMats = [
  makeMaterial(B, scene, 'product-red', '#dd4b49'),
  makeMaterial(B, scene, 'product-blue', '#4e81c4'),
  makeMaterial(B, scene, 'product-yellow', '#edc84d'),
  makeMaterial(B, scene, 'product-green', '#69a75e'),
  makeMaterial(B, scene, 'product-purple', '#8e6cb1'),
  makeMaterial(B, scene, 'product-orange', '#e88b45'),
];

for (let x = -12; x <= 12; x += 2) {
  box('supermarket-floor-tile-x', [0.035, 0.012, arena.size.z - 0.3], [x, 0.012, 0], steelMat, null, false);
}
for (let z = -9; z <= 9; z += 2) {
  box('supermarket-floor-tile-z', [arena.size.x - 0.3, 0.012, 0.035], [0, 0.013, z], steelMat, null, false);
}

box('supermarket-back-wall', [arena.size.x, 5.2, 0.32], [0, 2.6, 9.65], storeWhite, null, false);
box('supermarket-left-wall', [0.3, 5.2, arena.size.z], [-12.85, 2.6, 0], storeWhite, null, false);
box('supermarket-right-wall', [0.3, 5.2, arena.size.z], [12.85, 2.6, 0], storeWhite, null, false);
box('supermarket-blue-band', [arena.size.x - 0.4, 0.55, 0.12], [0, 4.4, 9.43], tescoBlue, null, false);
box('supermarket-red-band', [arena.size.x - 0.4, 0.22, 0.13], [0, 3.95, 9.42], tescoRed, null, false);

if (B.Texture) {
  const logoPlane = B.MeshBuilder.CreatePlane('tesco-superstore-sign', { width: 7.6, height: 2.35 }, scene);
  logoPlane.position.set(0, 3.15, 9.4);
  logoPlane.rotation.y = Math.PI;
  const logoTexture = new B.Texture(TESCO_LOGO_DATA_URI, scene, false, false);
  logoTexture.hasAlpha = false;
  const logoMat = new B.StandardMaterial('tesco-superstore-sign-mat', scene);
  logoMat.diffuseTexture = logoTexture;
  logoMat.emissiveColor = new B.Color3(0.16, 0.16, 0.16);
  logoMat.specularColor = B.Color3.Black();
  logoPlane.material = logoMat;
}

for (let x = -10; x <= 10; x += 4) {
  for (let z = -7.4; z <= 7.2; z += 4.8) {
    const panel = box('supermarket-ceiling-light', [2.5, 0.08, 0.72], [x, 5.05, z], storeWhite, null, false);
    panel.material.emissiveColor = new B.Color3(0.65, 0.65, 0.6);
  }
}
for (const [x, z] of [[-8,-4],[0,-4],[8,-4],[-8,4],[0,4],[8,4]]) {
  const light = new B.PointLight('supermarket-light-' + x + '-' + z, new B.Vector3(x, 4.7, z), scene);
  light.diffuse = new B.Color3(1.0, 0.97, 0.9);
  light.intensity = 0.25;
  light.range = 10;
}

const aisleXs = [-6.3, -2.1, 2.1, 6.3];
for (let aisleIndex = 0; aisleIndex < aisleXs.length; aisleIndex++) {
  const x = aisleXs[aisleIndex];
  for (const y of [0.18, 0.72, 1.26, 1.8, 2.32]) {
    box('supermarket-aisle-shelf', [1.5, 0.09, 7.1], [x, y, 1.2], shelfMat);
  }
  for (const z of [-2.3, 4.7]) {
    box('supermarket-shelf-end', [1.6, 2.5, 0.18], [x, 1.25, z], tescoBlue);
  }
  for (let row = 0; row < 4; row++) {
    for (let item = 0; item < 10; item++) {
      const z = -1.88 + item * 0.62;
      for (const side of [-1, 1]) {
        const product = box('supermarket-product-row', [0.22, 0.34 + (item % 3) * 0.05, 0.34], [x + side * 0.48, 0.42 + row * 0.54, z], productMats[(aisleIndex + row + item) % productMats.length], null, false);
        product.rotation.y = side > 0 ? -0.06 : 0.06;
      }
    }
  }
  sign('supermarket-aisle-sign', 'AISLE ' + (aisleIndex + 1), [x, 3.65, -1.65], [2.2, 0.7], Math.PI, '#00539f', '#ffffff');
}

for (const [index, x] of [-5.6, -1.8, 2.0].entries()) {
  box('supermarket-checkout', [2.8, 0.9, 1.2], [x, 0.45, -6.6], tescoBlue);
  box('supermarket-conveyor', [1.65, 0.09, 0.78], [x - 0.35, 0.94, -6.6], beltMat, null, false);
  box('supermarket-checkout-trim', [0.22, 1.1, 1.28], [x + 1.18, 0.58, -6.6], tescoRed);
  const pole = cylinder('checkout-number-pole', { height: 2.4, diameter: 0.08, tessellation: 8 }, [x + 1.15, 2.0, -6.6], steelMat, null, false);
  sign('supermarket-checkout-number', String(index + 1), [x + 1.15, 3.08, -6.58], [0.7, 0.7], Math.PI, '#ee1c25', '#ffffff');
}

box('supermarket-produce-island', [3.4, 0.75, 2.8], [8.8, 0.38, -3.7], woodMat);
for (let ix = 0; ix < 6; ix++) {
  for (let iz = 0; iz < 4; iz++) {
    const fruit = B.MeshBuilder.CreateSphere('supermarket-produce-item', { diameter: 0.32 + ((ix + iz) % 2) * 0.05, segments: 10 }, scene);
    fruit.position.set(7.55 + ix * 0.48, 0.88 + ((ix + iz) % 3) * 0.04, -4.55 + iz * 0.55);
    fruit.material = [produceGreen, produceOrange, produceRed][(ix + iz) % 3];
  }
}
sign('supermarket-produce-sign', 'FRESH PRODUCE', [8.8, 3.25, -3.7], [3.2, 0.72], -Math.PI / 2, '#69a75e', '#ffffff');

for (const z of [-4.8, -1.6, 1.6, 4.8]) {
  box('supermarket-freezer-wall', [0.75, 2.85, 2.75], [11.85, 1.43, z], storeWhite);
  const glass = box('supermarket-freezer-glass', [0.045, 2.2, 2.15], [11.42, 1.45, z], glassMat, null, false);
  glass.material.alpha = 0.52;
  box('supermarket-freezer-handle', [0.08, 1.1, 0.08], [11.37, 1.43, z + 0.72], steelMat, null, false);
}
sign('supermarket-chilled-sign', 'CHILLED', [11.25, 4.0, 0], [4.6, 0.75], -Math.PI / 2, '#00539f', '#ffffff');

box('supermarket-stockroom-door', [3.2, 3.5, 0.22], [7.7, 1.75, 9.38], steelMat);
sign('supermarket-stockroom-sign', 'STAFF ONLY', [7.7, 3.2, 9.25], [2.6, 0.65], Math.PI, '#34383e', '#ffffff');

box('supermarket-trolley-bay', [4.2, 0.16, 2.2], [-9.9, 0.08, -6.8], shelfMat, null, false);
for (let trolley = 0; trolley < 4; trolley++) {
  const tz = -7.55 + trolley * 0.48;
  box('supermarket-trolley-basket', [1.55, 0.62, 0.34], [-9.9, 0.7, tz], steelMat);
  cylinder('supermarket-trolley-handle', { height: 1.72, diameter: 0.07, tessellation: 8 }, [-9.9, 1.13, tz + 0.25], tescoBlue, [0, 0, Math.PI / 2], false);
  for (const x of [-10.5, -9.3]) {
    const wheel = cylinder('supermarket-trolley-wheel', { height: 0.12, diameter: 0.24, tessellation: 12 }, [x, 0.18, tz], darkMat, [Math.PI / 2, 0, 0], false);
  }
}
sign('supermarket-bakery-sign', 'BAKERY', [-10.7, 3.7, 4.9], [3.0, 0.72], Math.PI / 2, '#ee1c25', '#ffffff');
box('supermarket-bakery-display', [2.0, 1.2, 4.2], [-11.4, 0.6, 4.9], woodMat);
for (let row = 0; row < 4; row++) {
  for (let item = 0; item < 5; item++) {
    cylinder('supermarket-bread-loaf', { height: 0.7, diameter: 0.2, tessellation: 10 }, [-10.75, 0.45 + row * 0.18, 3.35 + item * 0.7], creamMat, [Math.PI / 2, 0, 0], false);
  }
}
`;

export function patchDanaoSupermarketVisuals(source) {
  let out = String(source);
  if (!out.includes("TESCO_LOGO_DATA_URI")) {
    out = "import { TESCO_LOGO_DATA_URI } from '../art/tesco-brand.js';\n" + out;
  }
  out = replaceRequired(out, ARM_BEFORE, ARM_AFTER, 'hero arm');
  out = replaceRequired(out, LEG_BEFORE, LEG_AFTER, 'hero leg');
  out = replaceRegexRequired(
    out,
    /(const badge = stylizeMesh\(B, B\.MeshBuilder\.CreateSphere\('hero-mango-badge',[\s\S]*?badge\.material = accent;)/,
    (match) => match + HERO_BADGE_AFTER.slice(HERO_BADGE_BEFORE.length),
    'hero face',
  );
  out = replaceRegexRequired(
    out,
    /if \(arena\.id === 'ring' && arena\.ring\) \{[\s\S]*?\n\} else \{\nfloor = box\('arena-floor'/,
    SUPERMARKET_BLOCK + "\n} else {\nfloor = box('arena-floor'",
    'wrestling arena block',
  );
  return out;
}
