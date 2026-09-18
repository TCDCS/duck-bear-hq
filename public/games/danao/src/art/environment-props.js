const DETAIL_REACTION_STRENGTH = Object.freeze({
  grab: 0.2,
  'light-hit': 0.34,
  'prop-throw': 0.52,
  'fall-reset': 0.48,
  'heavy-hit': 1,
  'fighter-throw': 1.12,
  'prop-break': 1.3,
  ko: 1.5,
});

const DETAIL_MARKERS = Object.freeze({
  ring: 'danao-detail-trolley-frame',
  courtyard: 'danao-detail-gong',
  rooftop: 'danao-detail-rooftop-duct',
});

function color3(B, hex) {
  const value = String(hex || '#ffffff').replace('#', '');
  return new B.Color3(
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255,
  );
}

function material(B, scene, name, hex, {
  emissive = 0,
  alpha = 1,
  specular = 0.05,
  specularPower = 32,
  ambient = 0.12,
} = {}) {
  const mat = new B.StandardMaterial(name, scene);
  const base = color3(B, hex);
  mat.diffuseColor = base;
  mat.ambientColor = base.scale(ambient);
  mat.specularColor = new B.Color3(specular, specular, specular);
  mat.specularPower = specularPower;
  mat.alpha = alpha;
  if (emissive) mat.emissiveColor = base.scale(emissive);
  return mat;
}

function box(B, scene, name, size, position, mat, parent, rotation = null) {
  const mesh = B.MeshBuilder.CreateBox(name, {
    width: size[0],
    height: size[1],
    depth: size[2],
  }, scene);
  mesh.parent = parent;
  mesh.position.set(position[0], position[1], position[2]);
  if (rotation) mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  mesh.material = mat;
  mesh.isPickable = false;
  return mesh;
}

function cylinder(B, scene, name, options, position, mat, parent, rotation = null) {
  const mesh = B.MeshBuilder.CreateCylinder(name, options, scene);
  mesh.parent = parent;
  mesh.position.set(position[0], position[1], position[2]);
  if (rotation) mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  mesh.material = mat;
  mesh.isPickable = false;
  return mesh;
}

function sphere(B, scene, name, diameter, position, mat, parent) {
  const mesh = B.MeshBuilder.CreateSphere(name, {
    diameter,
    segments: 10,
  }, scene);
  mesh.parent = parent;
  mesh.position.set(position[0], position[1], position[2]);
  mesh.material = mat;
  mesh.isPickable = false;
  return mesh;
}

function group(B, scene, root, name, position, rotationY = 0) {
  const node = new B.TransformNode(name, scene);
  node.parent = root;
  node.position.set(position[0], position[1], position[2]);
  node.rotation.y = rotationY;
  return node;
}

function reactiveEntry(node, response, radius = 8, phase = 0) {
  return {
    node,
    response,
    radius,
    phase,
    baseY: node.position.y,
    baseRx: node.rotation.x,
    baseRy: node.rotation.y,
    baseRz: node.rotation.z,
    baseScale: node.scaling?.x || 1,
    kickAt: -Infinity,
    kickStrength: 0,
  };
}

function addTrolley(B, scene, root, mats, position, rotationY, index) {
  const trolley = group(B, scene, root, 'danao-detail-trolley-group', position, rotationY);
  const frame = box(B, scene, 'danao-detail-trolley-frame', [1.28, 0.06, 0.72], [0, 0.52, 0], mats.metal, trolley);
  box(B, scene, 'danao-detail-trolley-handle', [1.16, 0.07, 0.07], [0, 1.08, 0.31], mats.handle, trolley);
  for (const x of [-0.54, 0.54]) {
    box(B, scene, 'danao-detail-trolley-upright', [0.055, 0.98, 0.055], [x, 0.73, 0.3], mats.metal, trolley, [0.08, 0, 0]);
  }
  for (let row = 0; row < 4; row++) {
    box(B, scene, 'danao-detail-trolley-basket-wire', [1.08, 0.032, 0.032], [0, 0.43 + row * 0.16, -0.2 + row * 0.08], mats.metal, trolley);
  }
  for (let col = -2; col <= 2; col++) {
    box(B, scene, 'danao-detail-trolley-basket-wire', [0.032, 0.58, 0.62], [col * 0.22, 0.67, 0], mats.metal, trolley, [0.08, 0, 0]);
  }
  for (const x of [-0.48, 0.48]) {
    for (const z of [-0.26, 0.26]) {
      cylinder(B, scene, 'danao-detail-trolley-wheel', {
        height: 0.08,
        diameter: 0.2,
        tessellation: 12,
      }, [x, 0.12, z], mats.dark, trolley, [Math.PI / 2, 0, 0]);
    }
  }
  frame.metadata = { danaoDetail: 'trolley', index };
  return reactiveEntry(trolley, 'rattle', 9, index * 0.7);
}

function addStoreDetails(B, scene, root, reactive, materials) {
  const mats = {
    metal: material(B, scene, 'danao-detail-store-metal', '#aab6bc', { specular: 0.4, specularPower: 96, ambient: 0.18 }),
    dark: material(B, scene, 'danao-detail-store-dark', '#26333c', { specular: 0.12, specularPower: 52, ambient: 0.08 }),
    handle: material(B, scene, 'danao-detail-store-handle', '#e73735', { specular: 0.18, specularPower: 64, ambient: 0.15 }),
    crate: material(B, scene, 'danao-detail-store-crate', '#3279b6', { specular: 0.14, specularPower: 40, ambient: 0.14 }),
    crateRed: material(B, scene, 'danao-detail-store-crate-red', '#d74642', { specular: 0.14, specularPower: 40, ambient: 0.14 }),
    productA: material(B, scene, 'danao-detail-store-product-a', '#f2c74f'),
    productB: material(B, scene, 'danao-detail-store-product-b', '#66a85c'),
    screen: material(B, scene, 'danao-detail-store-screen', '#76d7ff', { emissive: 0.65, specular: 0.28, specularPower: 90, ambient: 0.18 }),
    bezel: material(B, scene, 'danao-detail-store-bezel', '#202a31', { specular: 0.16, specularPower: 56, ambient: 0.08 }),
  };
  materials.push(...Object.values(mats));

  reactive.push(addTrolley(B, scene, root, mats, [8.55, 0, 5.7], -0.48, 0));
  reactive.push(addTrolley(B, scene, root, mats, [9.4, 0, 6.05], -0.5, 1));
  reactive.push(addTrolley(B, scene, root, mats, [10.25, 0, 6.4], -0.52, 2));

  const display = group(B, scene, root, 'danao-detail-checkout-display-group', [-0.2, 0, -7.05], Math.PI);
  box(B, scene, 'danao-detail-checkout-display-post', [0.08, 0.74, 0.08], [0, 0.49, 0], mats.bezel, display);
  box(B, scene, 'danao-detail-checkout-display', [0.75, 0.42, 0.12], [0, 0.96, 0], mats.bezel, display, [-0.08, 0, 0]);
  box(B, scene, 'danao-detail-checkout-screen', [0.62, 0.31, 0.025], [0, 0.96, -0.066], mats.screen, display, [-0.08, 0, 0]);
  reactive.push(reactiveEntry(display, 'screen', 10, 0.3));

  for (let stack = 0; stack < 3; stack++) {
    const crateGroup = group(B, scene, root, 'danao-detail-crate-group', [-10.8 + stack * 1.1, 0, -5.7 + (stack % 2) * 0.25], 0.08 * stack);
    const crateMat = stack % 2 ? mats.crateRed : mats.crate;
    for (let level = 0; level < 2 + (stack % 2); level++) {
      box(B, scene, 'danao-detail-produce-crate', [0.92, 0.34, 0.72], [0, 0.18 + level * 0.35, 0], crateMat, crateGroup);
      for (let item = 0; item < 4; item++) {
        sphere(B, scene, 'danao-detail-produce-item', 0.16, [
          -0.3 + (item % 2) * 0.3,
          0.37 + level * 0.35,
          -0.18 + Math.floor(item / 2) * 0.3,
        ], (item + level) % 2 ? mats.productA : mats.productB, crateGroup);
      }
    }
    reactive.push(reactiveEntry(crateGroup, 'rattle', 9, stack + 1.2));
  }
}

function addCourtyardDetails(B, scene, root, reactive, materials) {
  const mats = {
    wood: material(B, scene, 'danao-detail-courtyard-wood', '#6c3628', { specular: 0.1, specularPower: 30, ambient: 0.12 }),
    dark: material(B, scene, 'danao-detail-courtyard-dark', '#2d2326', { specular: 0.08, specularPower: 36, ambient: 0.08 }),
    gold: material(B, scene, 'danao-detail-courtyard-gold', '#d8ad38', { emissive: 0.08, specular: 0.34, specularPower: 82, ambient: 0.16 }),
    brass: material(B, scene, 'danao-detail-courtyard-brass', '#b8842f', { specular: 0.42, specularPower: 104, ambient: 0.16 }),
    drum: material(B, scene, 'danao-detail-courtyard-drum', '#9d302f', { specular: 0.18, specularPower: 52, ambient: 0.14 }),
    drumSkin: material(B, scene, 'danao-detail-courtyard-drum-skin', '#dbc99d'),
    stone: material(B, scene, 'danao-detail-courtyard-stone', '#c1a374', { specular: 0.07, specularPower: 20, ambient: 0.18 }),
    lantern: material(B, scene, 'danao-detail-courtyard-lantern', '#e74335', { emissive: 0.24, specular: 0.2, specularPower: 64, ambient: 0.14 }),
  };
  materials.push(...Object.values(mats));

  const gongStand = group(B, scene, root, 'danao-detail-gong-group', [0, 0, 7.15], 0);
  for (const x of [-0.95, 0.95]) {
    box(B, scene, 'danao-detail-gong-stand', [0.12, 2.55, 0.12], [x, 1.27, 0], mats.wood, gongStand);
    box(B, scene, 'danao-detail-gong-foot', [0.78, 0.12, 0.5], [x, 0.08, 0], mats.dark, gongStand);
  }
  box(B, scene, 'danao-detail-gong-beam', [2.2, 0.16, 0.14], [0, 2.42, 0], mats.wood, gongStand);
  const gong = cylinder(B, scene, 'danao-detail-gong', {
    height: 0.13,
    diameter: 1.46,
    tessellation: 28,
  }, [0, 1.57, 0], mats.brass, gongStand, [Math.PI / 2, 0, 0]);
  cylinder(B, scene, 'danao-detail-gong-center', {
    height: 0.15,
    diameter: 0.34,
    tessellation: 20,
  }, [0, 1.57, -0.03], mats.gold, gongStand, [Math.PI / 2, 0, 0]);
  gong.metadata = { danaoDetail: 'gong' };
  reactive.push(reactiveEntry(gongStand, 'gong', 10, 0.4));

  for (const [x, z, phase] of [[-5.3, 6.0, 0], [5.3, 6.0, 1.2]]) {
    const drum = group(B, scene, root, 'danao-detail-drum-group', [x, 0, z], 0);
    cylinder(B, scene, 'danao-detail-drum', {
      height: 0.95,
      diameter: 1.08,
      tessellation: 20,
    }, [0, 0.62, 0], mats.drum, drum);
    cylinder(B, scene, 'danao-detail-drum-skin', {
      height: 0.05,
      diameter: 1.12,
      tessellation: 20,
    }, [0, 1.12, 0], mats.drumSkin, drum);
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      sphere(B, scene, 'danao-detail-drum-stud', 0.08, [
        Math.cos(angle) * 0.47,
        1.08,
        Math.sin(angle) * 0.47,
      ], mats.gold, drum);
    }
    reactive.push(reactiveEntry(drum, 'drum', 9, phase));
  }

  for (const [x, z, phase] of [[-6.8, 0.2, 0.4], [6.8, -0.2, 1.1]]) {
    const stand = group(B, scene, root, 'danao-detail-lantern-stand-group', [x, 0, z], 0);
    box(B, scene, 'danao-detail-lantern-stand', [0.1, 2.55, 0.1], [0, 1.28, 0], mats.dark, stand);
    box(B, scene, 'danao-detail-lantern-arm', [0.78, 0.08, 0.08], [x < 0 ? 0.34 : -0.34, 2.35, 0], mats.dark, stand);
    const lantern = sphere(B, scene, 'danao-detail-hanging-lantern', 0.54, [x < 0 ? 0.67 : -0.67, 1.92, 0], mats.lantern, stand);
    lantern.scaling.y = 1.2;
    reactive.push(reactiveEntry(stand, 'lantern', 9, phase));
  }

  for (const [x, z, flip] of [[-4.5, -6.65, -1], [4.5, -6.65, 1]]) {
    const lion = group(B, scene, root, 'danao-detail-stone-lion-group', [x, 0, z], flip * 0.08);
    box(B, scene, 'danao-detail-stone-lion-plinth', [1.0, 0.24, 0.82], [0, 0.12, 0], mats.stone, lion);
    sphere(B, scene, 'danao-detail-stone-lion-body', 0.68, [0, 0.62, 0], mats.stone, lion);
    sphere(B, scene, 'danao-detail-stone-lion-head', 0.52, [0, 1.0, -0.16], mats.stone, lion);
    for (const lx of [-0.22, 0.22]) sphere(B, scene, 'danao-detail-stone-lion-paw', 0.24, [lx, 0.35, -0.32], mats.stone, lion);
  }
}

function addRooftopDetails(B, scene, root, reactive, materials) {
  const mats = {
    metal: material(B, scene, 'danao-detail-rooftop-metal', '#76878b', { specular: 0.36, specularPower: 92, ambient: 0.16 }),
    dark: material(B, scene, 'danao-detail-rooftop-dark', '#26303a', { specular: 0.1, specularPower: 44, ambient: 0.08 }),
    duct: material(B, scene, 'danao-detail-rooftop-duct-mat', '#9ba6a4', { specular: 0.3, specularPower: 82, ambient: 0.16 }),
    vent: material(B, scene, 'danao-detail-rooftop-vent-mat', '#69777b', { specular: 0.24, specularPower: 72, ambient: 0.13 }),
    pipe: material(B, scene, 'danao-detail-rooftop-pipe-mat', '#a85c42', { specular: 0.2, specularPower: 58, ambient: 0.13 }),
    neon: material(B, scene, 'danao-detail-rooftop-neon', '#f05c68', { emissive: 0.62, specular: 0.28, specularPower: 78, ambient: 0.18 }),
    neonBlue: material(B, scene, 'danao-detail-rooftop-neon-blue', '#5fb6d1', { emissive: 0.58, specular: 0.28, specularPower: 78, ambient: 0.18 }),
  };
  materials.push(...Object.values(mats));

  const duct = group(B, scene, root, 'danao-detail-rooftop-duct-group', [-1.2, 0, 5.85], 0);
  box(B, scene, 'danao-detail-rooftop-duct', [4.8, 0.55, 0.8], [0, 0.42, 0], mats.duct, duct);
  box(B, scene, 'danao-detail-rooftop-duct-joint', [0.7, 0.82, 0.82], [2.05, 0.56, 0], mats.metal, duct);
  for (let i = 0; i < 6; i++) {
    box(B, scene, 'danao-detail-rooftop-duct-rib', [0.05, 0.61, 0.84], [-1.8 + i * 0.72, 0.43, 0], mats.dark, duct);
  }
  reactive.push(reactiveEntry(duct, 'duct', 10, 0.2));

  for (const [x, z, phase] of [[-3.8, -4.6, 0], [1.5, -5.25, 0.8], [5.65, 1.2, 1.7]]) {
    const vent = group(B, scene, root, 'danao-detail-rooftop-vent-group', [x, 0, z], 0);
    box(B, scene, 'danao-detail-rooftop-vent', [1.0, 0.72, 0.9], [0, 0.36, 0], mats.vent, vent);
    for (let slat = 0; slat < 5; slat++) {
      box(B, scene, 'danao-detail-rooftop-vent-slat', [0.66, 0.045, 0.04], [0, 0.18 + slat * 0.1, -0.47], mats.dark, vent, [0.16, 0, 0]);
    }
    reactive.push(reactiveEntry(vent, 'rattle', 8.5, phase));
  }

  for (const [z, y] of [[-3.2, 0.24], [3.8, 0.28]]) {
    const pipes = group(B, scene, root, 'danao-detail-rooftop-pipe-group', [6.2, 0, z], 0);
    for (let i = 0; i < 3; i++) {
      cylinder(B, scene, 'danao-detail-rooftop-pipe', {
        height: 3.8,
        diameter: 0.09,
        tessellation: 10,
      }, [-0.28 + i * 0.28, y, 0], mats.pipe, pipes, [0, 0, Math.PI / 2]);
    }
  }

  const sign = group(B, scene, root, 'danao-detail-rooftop-sign-group', [5.2, 0, -5.85], -0.08);
  box(B, scene, 'danao-detail-rooftop-sign-post', [0.09, 2.7, 0.09], [-0.88, 1.35, 0], mats.dark, sign);
  box(B, scene, 'danao-detail-rooftop-sign-post', [0.09, 2.7, 0.09], [0.88, 1.35, 0], mats.dark, sign);
  box(B, scene, 'danao-detail-rooftop-sign', [2.3, 0.82, 0.12], [0, 2.18, 0], mats.dark, sign);
  for (let i = 0; i < 5; i++) {
    box(B, scene, 'danao-detail-rooftop-sign-light', [0.31, 0.42, 0.035], [-0.72 + i * 0.36, 2.18, -0.075], i % 2 ? mats.neonBlue : mats.neon, sign);
  }
  reactive.push(reactiveEntry(sign, 'sign', 10, 1.3));

  const aerial = group(B, scene, root, 'danao-detail-rooftop-aerial-group', [-6.25, 0, -4.9], 0);
  box(B, scene, 'danao-detail-rooftop-aerial-mast', [0.07, 3.2, 0.07], [0, 1.6, 0], mats.dark, aerial);
  for (let i = 0; i < 5; i++) {
    box(B, scene, 'danao-detail-rooftop-aerial-bar', [1.3 - i * 0.12, 0.045, 0.045], [0, 1.55 + i * 0.3, 0], mats.metal, aerial, [0, 0.12 * i, 0.08]);
  }
  reactive.push(reactiveEntry(aerial, 'aerial', 9, 2.2));
}

function clampCoordinate(value, limit = 30) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(-limit, Math.min(limit, number));
}

function sceneDisposed(scene) {
  return typeof scene?.isDisposed === 'function' ? scene.isDisposed() : Boolean(scene?.isDisposed);
}

function animateReactive(entry, now) {
  if (!entry?.node || entry.node.isDisposed?.()) return;
  const elapsed = Math.max(0, (now - entry.kickAt) / 1000);
  const reaction = entry.kickStrength > 0 ? entry.kickStrength * Math.exp(-elapsed * 3.6) : 0;
  const seconds = now / 1000;
  const wave = Math.sin(elapsed * 18 + entry.phase);
  const ambient = Math.sin(seconds * 1.15 + entry.phase);

  entry.node.position.y = entry.baseY;
  entry.node.rotation.x = entry.baseRx;
  entry.node.rotation.y = entry.baseRy;
  entry.node.rotation.z = entry.baseRz;
  entry.node.scaling.setAll(entry.baseScale);

  if (entry.response === 'lantern') {
    entry.node.rotation.z += ambient * 0.015 + wave * reaction * 0.1;
  } else if (entry.response === 'gong') {
    entry.node.rotation.y += wave * reaction * 0.055;
    entry.node.rotation.z += Math.sin(elapsed * 14 + entry.phase) * reaction * 0.035;
  } else if (entry.response === 'drum') {
    entry.node.position.y += Math.abs(wave) * reaction * 0.11;
    entry.node.rotation.z += wave * reaction * 0.045;
  } else if (entry.response === 'screen') {
    const pulse = 1 + Math.abs(wave) * reaction * 0.045;
    entry.node.scaling.setAll(pulse);
  } else if (entry.response === 'duct') {
    entry.node.position.y += wave * reaction * 0.045;
    entry.node.rotation.z += wave * reaction * 0.018;
  } else if (entry.response === 'sign') {
    entry.node.rotation.z += ambient * 0.012 + wave * reaction * 0.075;
  } else if (entry.response === 'aerial') {
    entry.node.rotation.z += ambient * 0.008 + wave * reaction * 0.055;
  } else {
    entry.node.rotation.y += wave * reaction * 0.045;
    entry.node.position.y += Math.abs(wave) * reaction * 0.035;
  }

  if (reaction < 0.002) entry.kickStrength = 0;
}

export function environmentDetailProfile(event = {}) {
  const strength = DETAIL_REACTION_STRENGTH[event.type] || 0;
  return {
    arenaId: DETAIL_MARKERS[event.arenaId] ? event.arenaId : 'courtyard',
    strength,
    radius: strength ? 5.5 + strength * 3.5 : 0,
  };
}

export function environmentDetailMarker(arenaId) {
  return DETAIL_MARKERS[arenaId] || DETAIL_MARKERS.courtyard;
}

export function mountEnvironmentDetails(B, scene, arenaId) {
  if (!B || !scene || !DETAIL_MARKERS[arenaId]) return null;
  scene.metadata ||= {};
  const existing = scene.metadata.danaoEnvironmentDetailController;
  if (existing?.arenaId === arenaId) return existing;

  const root = new B.TransformNode('danao-environment-detail-root', scene);
  const reactive = [];
  const materials = [];

  if (arenaId === 'ring') addStoreDetails(B, scene, root, reactive, materials);
  else if (arenaId === 'rooftop') addRooftopDetails(B, scene, root, reactive, materials);
  else addCourtyardDetails(B, scene, root, reactive, materials);

  const observer = scene.onBeforeRenderObservable?.add?.(() => {
    if (sceneDisposed(scene)) return;
    const now = globalThis.performance?.now?.() ?? Date.now();
    for (const entry of reactive) animateReactive(entry, now);
  }) || null;

  const controller = {
    arenaId,
    marker: DETAIL_MARKERS[arenaId],
    onFeedback(event = {}) {
      const profile = environmentDetailProfile({ ...event, arenaId });
      if (profile.strength < 0.3 || !reactive.length) return false;
      const x = clampCoordinate(event.x);
      const z = clampCoordinate(event.z);
      const now = globalThis.performance?.now?.() ?? Date.now();
      let reacted = 0;
      let nearest = null;
      let nearestDistance = Infinity;

      for (const entry of reactive) {
        const dx = entry.node.position.x - x;
        const dz = entry.node.position.z - z;
        const distance = Math.hypot(dx, dz);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = entry;
        }
        const radius = Math.max(profile.radius, entry.radius || 0);
        if (distance > radius) continue;
        const falloff = Math.max(0.22, 1 - distance / (radius * 1.18));
        entry.kickAt = now;
        entry.kickStrength = Math.max(entry.kickStrength, profile.strength * falloff);
        reacted += 1;
      }

      if (!reacted && nearest) {
        nearest.kickAt = now;
        nearest.kickStrength = Math.max(nearest.kickStrength, profile.strength * 0.25);
        reacted = 1;
      }

      if (reacted) {
        scene.metadata.danaoEnvironmentDetailReactionCount =
          Number(scene.metadata.danaoEnvironmentDetailReactionCount || 0) + 1;
        scene.metadata.danaoEnvironmentDetailActive = reacted;
        return true;
      }
      return false;
    },
    dispose() {
      if (observer && !sceneDisposed(scene)) scene.onBeforeRenderObservable?.remove?.(observer);
      if (!sceneDisposed(scene)) root.dispose?.(false, true);
      for (const mat of materials) mat?.dispose?.();
      if (scene.metadata?.danaoEnvironmentDetailController === controller) {
        scene.metadata.danaoEnvironmentDetailController = null;
      }
    },
  };

  scene.metadata.danaoEnvironmentDetailController = controller;
  scene.metadata.danaoEnvironmentDetailMarker = DETAIL_MARKERS[arenaId];
  return controller;
}
