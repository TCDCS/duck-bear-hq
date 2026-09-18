const STORE_COLORS = Object.freeze({
  blue: '#00539f',
  red: '#ee1c25',
  green: '#4f9b4a',
  warm: '#e9b15e',
  cream: '#fff7df',
  ink: '#24313c',
});

function color3(B, hex) {
  const value = String(hex).replace('#', '');
  return new B.Color3(
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255,
  );
}

function material(B, scene, name, hex, emissive = 0) {
  const mat = new B.StandardMaterial(name, scene);
  mat.diffuseColor = color3(B, hex);
  mat.specularColor = new B.Color3(0.05, 0.05, 0.05);
  if (emissive) mat.emissiveColor = color3(B, hex).scale(emissive);
  return mat;
}

function box(B, scene, name, size, position, mat) {
  const mesh = B.MeshBuilder.CreateBox(name, {
    width: size[0],
    height: size[1],
    depth: size[2],
  }, scene);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.material = mat;
  mesh.isPickable = false;
  return mesh;
}

function label(B, scene, name, text, position, width, bg, fg = '#ffffff', yaw = Math.PI) {
  if (!B.DynamicTexture) return null;
  const texture = new B.DynamicTexture(name + '-texture', { width: 512, height: 160 }, scene, true);
  texture.hasAlpha = false;
  texture.drawText(text, null, 104, 'bold 58px Arial', fg, bg, true, true);

  const mat = new B.StandardMaterial(name + '-mat', scene);
  mat.diffuseTexture = texture;
  mat.emissiveColor = color3(B, bg).scale(0.22);
  mat.specularColor = B.Color3.Black();

  const plane = B.MeshBuilder.CreatePlane(name, { width, height: width * 0.28 }, scene);
  plane.position.set(position[0], position[1], position[2]);
  plane.rotation.y = yaw;
  plane.material = mat;
  plane.isPickable = false;
  return plane;
}

function improveShelfSightlines(scene) {
  for (const mesh of scene.meshes || []) {
    if (mesh.name === 'supermarket-aisle-shelf') {
      mesh.position.y = 0.18 + (mesh.position.y - 0.18) * 0.74;
    } else if (mesh.name === 'supermarket-product-row') {
      mesh.position.y = 0.36 + (mesh.position.y - 0.42) * 0.72;
    } else if (mesh.name === 'supermarket-shelf-end') {
      mesh.scaling.y *= 0.72;
      mesh.position.y = 0.9;
    }
  }
}

function fixStoreLighting(B, scene) {
  const sharedWhite = scene.getMaterialByName?.('store-white');
  if (sharedWhite) {
    sharedWhite.emissiveColor = new B.Color3(0.035, 0.035, 0.03);
    sharedWhite.ambientColor = new B.Color3(0.2, 0.2, 0.19);
  }

  const lightMat = material(B, scene, 'store-polish-light-panel', '#fff9df', 0.72);
  for (const mesh of scene.meshes || []) {
    if (mesh.name === 'supermarket-ceiling-light') mesh.material = lightMat;
  }

  scene.clearColor = new B.Color4(0.76, 0.84, 0.9, 1);
}

function addFloorZones(B, scene) {
  const blue = material(B, scene, 'store-polish-blue', STORE_COLORS.blue);
  const red = material(B, scene, 'store-polish-red', STORE_COLORS.red);
  const green = material(B, scene, 'store-polish-green', STORE_COLORS.green);
  const warm = material(B, scene, 'store-polish-warm', STORE_COLORS.warm);

  box(B, scene, 'store-polish-checkout-blue-line', [12.4, 0.028, 0.13], [-2.0, 0.028, -7.85], blue);
  box(B, scene, 'store-polish-checkout-red-line', [12.4, 0.029, 0.08], [-2.0, 0.03, -7.58], red);
  box(B, scene, 'store-polish-produce-zone', [4.25, 0.026, 3.35], [8.8, 0.027, -3.7], green);
  box(B, scene, 'store-polish-bakery-zone', [2.15, 0.026, 4.5], [-11.35, 0.027, 4.9], warm);
}

function addStoreDetails(B, scene) {
  const red = material(B, scene, 'store-polish-basket-red', STORE_COLORS.red);
  const blue = material(B, scene, 'store-polish-basket-blue', STORE_COLORS.blue);
  const dark = material(B, scene, 'store-polish-dark', STORE_COLORS.ink);
  const canMats = [
    material(B, scene, 'store-polish-can-red', '#d84b45'),
    material(B, scene, 'store-polish-can-blue', '#4d81bd'),
    material(B, scene, 'store-polish-can-gold', '#e0b84c'),
    material(B, scene, 'store-polish-can-green', '#69a25c'),
  ];

  for (let i = 0; i < 4; i++) {
    const basket = box(
      B,
      scene,
      'store-polish-basket',
      [0.82 - i * 0.055, 0.15, 0.55 - i * 0.035],
      [4.45, 0.12 + i * 0.13, -6.95],
      i % 2 ? blue : red,
    );
    basket.rotation.y = -0.12;
  }

  const aisleXs = [-6.3, -2.1, 2.1, 6.3];
  for (let aisle = 0; aisle < aisleXs.length; aisle++) {
    const x = aisleXs[aisle];
    const boardMat = aisle % 2 ? red : blue;
    box(B, scene, 'store-polish-endcap-board', [1.35, 0.58, 0.08], [x, 1.34, -2.43], boardMat);
    label(
      B,
      scene,
      'store-polish-endcap-label',
      ['MEAL DEAL', 'SNACKS', 'DRINKS', 'HOUSEHOLD'][aisle],
      [x, 2.28, -2.48],
      1.62,
      aisle % 2 ? STORE_COLORS.red : STORE_COLORS.blue,
    );

    for (let row = 0; row < 3; row++) {
      for (let item = 0; item < 4; item++) {
        const can = B.MeshBuilder.CreateCylinder('store-polish-can', {
          height: 0.29,
          diameter: 0.18,
          tessellation: 10,
        }, scene);
        can.position.set(
          x - 0.42 + item * 0.28,
          0.34 + row * 0.34,
          -2.52,
        );
        can.material = canMats[(aisle + row + item) % canMats.length];
        can.isPickable = false;
      }
    }
  }

  for (const [x, text, bg] of [
    [-8.8, 'BAKERY', STORE_COLORS.red],
    [-3.7, 'MEALS', STORE_COLORS.blue],
    [3.2, 'GROCERIES', STORE_COLORS.blue],
    [8.7, 'FRESH', STORE_COLORS.green],
  ]) {
    label(B, scene, 'store-polish-department-sign', text, [x, 4.2, 9.2], 2.4, bg, '#ffffff', Math.PI);
  }

  for (const x of [-7.1, -3.3, 0.5, 4.3]) {
    box(B, scene, 'store-polish-queue-post', [0.07, 1.05, 0.07], [x, 0.53, -5.25], dark);
    box(B, scene, 'store-polish-queue-rail', [3.0, 0.055, 0.055], [x + 1.45, 0.92, -5.25], blue);
  }
}

export function polishCheckoutChaos(B, scene, arenaId) {
  if (!B || !scene || arenaId !== 'ring') return false;
  scene.metadata ||= {};
  if (scene.metadata.danaoStorePolished) return true;
  scene.metadata.danaoStorePolished = true;

  improveShelfSightlines(scene);
  fixStoreLighting(B, scene);
  addFloorZones(B, scene);
  addStoreDetails(B, scene);
  return true;
}
