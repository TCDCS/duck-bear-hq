const PALETTE = Object.freeze({
  ink: '#241b28',
  courtyardRed: '#a72f2f',
  courtyardGold: '#f0c64a',
  courtyardStone: '#d8b978',
  courtyardGreen: '#497d55',
  roofBlue: '#244f67',
  roofTeal: '#4c7a7d',
  roofRed: '#a82e39',
  roofGold: '#f1c957',
  roofNight: '#272741',
  windowWarm: '#f5c86a',
});

function color3(B, hex) {
  const value = String(hex).replace('#', '');
  return new B.Color3(
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255,
  );
}

function material(B, scene, name, hex, emissive = 0, alpha = 1) {
  const mat = new B.StandardMaterial(name, scene);
  mat.diffuseColor = color3(B, hex);
  mat.specularColor = new B.Color3(0.04, 0.04, 0.04);
  mat.alpha = alpha;
  if (emissive) mat.emissiveColor = color3(B, hex).scale(emissive);
  return mat;
}

function box(B, scene, name, size, position, mat, rotation = null) {
  const mesh = B.MeshBuilder.CreateBox(name, {
    width: size[0],
    height: size[1],
    depth: size[2],
  }, scene);
  mesh.position.set(position[0], position[1], position[2]);
  if (rotation) mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  mesh.material = mat;
  mesh.isPickable = false;
  return mesh;
}

function cylinder(B, scene, name, options, position, mat, rotation = null) {
  const mesh = B.MeshBuilder.CreateCylinder(name, options, scene);
  mesh.position.set(position[0], position[1], position[2]);
  if (rotation) mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  mesh.material = mat;
  mesh.isPickable = false;
  return mesh;
}

function sphere(B, scene, name, diameter, position, mat) {
  const mesh = B.MeshBuilder.CreateSphere(name, { diameter, segments: 12 }, scene);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.material = mat;
  mesh.isPickable = false;
  return mesh;
}

function addCourtyardFloorDetail(B, scene, mats) {
  for (let i = -7; i <= 7; i++) {
    const width = i % 2 === 0 ? 0.045 : 0.025;
    box(B, scene, 'courtyard-polish-stone-line-x', [width, 0.018, 15.8], [i, 0.018, 0], mats.line);
    box(B, scene, 'courtyard-polish-stone-line-z', [15.8, 0.018, width], [0, 0.019, i], mats.line);
  }

  for (const diameter of [4.8, 6.1]) {
    const ring = B.MeshBuilder.CreateTorus('courtyard-polish-medallion', {
      diameter,
      thickness: 0.055,
      tessellation: 48,
    }, scene);
    ring.position.y = 0.035;
    ring.rotation.x = Math.PI / 2;
    ring.material = mats.gold;
    ring.isPickable = false;
  }
}

function addCourtyardArchitecture(B, scene, mats, animated) {
  for (const x of [-7.45, 7.45]) {
    for (const z of [-7.45, 7.45]) {
      cylinder(B, scene, 'courtyard-polish-pillar', {
        height: 4.25,
        diameter: 0.44,
        tessellation: 14,
      }, [x, 2.12, z], mats.red);
      cylinder(B, scene, 'courtyard-polish-pillar-base', {
        height: 0.18,
        diameter: 0.7,
        tessellation: 14,
      }, [x, 0.09, z], mats.gold);
      const lantern = sphere(B, scene, 'courtyard-polish-corner-lantern', 0.62, [x, 3.35, z], mats.lantern);
      lantern.scaling.y = 1.18;
      animated.push({ mesh: lantern, baseY: lantern.position.y, phase: (x + z) * 0.4, kind: 'bob' });

      if (B.PointLight) {
        const light = new B.PointLight(
          'courtyard-polish-lantern-light',
          new B.Vector3(x * 0.92, 3.1, z * 0.92),
          scene,
        );
        light.diffuse = color3(B, '#ffbd55');
        light.intensity = 0.27;
        light.range = 6.4;
      }
    }
  }

  for (const z of [-7.45, 7.45]) {
    box(B, scene, 'courtyard-polish-beam-x', [15.25, 0.28, 0.35], [0, 3.95, z], mats.dark);
  }
  for (const x of [-7.45, 7.45]) {
    box(B, scene, 'courtyard-polish-beam-z', [0.35, 0.28, 15.25], [x, 3.95, 0], mats.dark);
  }

  for (const [x, z, yaw] of [
    [-10.5, 11.6, 0.04],
    [0, 12.0, 0],
    [10.5, 11.6, -0.04],
  ]) {
    box(B, scene, 'courtyard-polish-pagoda-body', [5.1, 3.4, 3.1], [x, 1.7, z], mats.shadow, [0, yaw, 0]);
    box(B, scene, 'courtyard-polish-pagoda-roof', [6.4, 0.38, 3.9], [x, 3.55, z], mats.dark, [0.04, yaw, 0]);
    box(B, scene, 'courtyard-polish-pagoda-roof', [4.6, 0.3, 3.0], [x, 4.1, z], mats.red, [-0.04, yaw, 0]);
  }

  for (const [x, z] of [[-6.3, 5.3], [6.3, 5.3], [-6.3, -5.3], [6.3, -5.3]]) {
    const pot = cylinder(B, scene, 'courtyard-polish-planter', {
      height: 0.72,
      diameterTop: 0.85,
      diameterBottom: 1.0,
      tessellation: 12,
    }, [x, 0.36, z], mats.stone);
    for (let i = 0; i < 6; i++) {
      const stalk = cylinder(B, scene, 'courtyard-polish-bamboo', {
        height: 1.4 + (i % 3) * 0.28,
        diameter: 0.08,
        tessellation: 7,
      }, [x - 0.25 + (i % 3) * 0.25, 1.15 + (i % 3) * 0.14, z - 0.18 + Math.floor(i / 3) * 0.35], mats.green);
      stalk.rotation.z = (i - 2.5) * 0.035;
    }
    pot.rotation.y = (x + z) * 0.03;
  }

  for (const [x, z, side] of [[-7.0, -3.8, -1], [7.0, 3.8, 1], [-7.0, 3.8, -1], [7.0, -3.8, 1]]) {
    const banner = box(B, scene, 'courtyard-polish-banner', [0.06, 1.7, 0.72], [x, 2.75, z], side > 0 ? mats.red : mats.gold);
    banner.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    animated.push({ mesh: banner, baseRot: banner.rotation.z, phase: z * 0.4, kind: 'sway' });
  }
}

function polishCourtyard(B, scene) {
  const mats = {
    dark: material(B, scene, 'courtyard-polish-dark', PALETTE.ink),
    red: material(B, scene, 'courtyard-polish-red', PALETTE.courtyardRed),
    gold: material(B, scene, 'courtyard-polish-gold', PALETTE.courtyardGold, 0.12),
    stone: material(B, scene, 'courtyard-polish-stone', PALETTE.courtyardStone),
    line: material(B, scene, 'courtyard-polish-line', '#8d714d'),
    green: material(B, scene, 'courtyard-polish-green', PALETTE.courtyardGreen),
    lantern: material(B, scene, 'courtyard-polish-lantern', '#e94538', 0.34),
    shadow: material(B, scene, 'courtyard-polish-shadow', '#47313b'),
  };
  const animated = [];
  scene.clearColor = new B.Color4(0.45, 0.72, 0.82, 1);
  addCourtyardFloorDetail(B, scene, mats);
  addCourtyardArchitecture(B, scene, mats, animated);
  return animated;
}

function addRooftopTiles(B, scene, mats) {
  for (let z = -6.5; z <= 6.5; z += 0.72) {
    box(B, scene, 'rooftop-polish-tile-row', [13.4, 0.035, 0.055], [0, 0.035, z], mats.tileLine);
  }
  for (let x = -6.4; x <= 6.4; x += 1.45) {
    box(B, scene, 'rooftop-polish-tile-seam', [0.045, 0.038, 13.2], [x, 0.038, 0], mats.tileLine);
  }
}

function addRooftopSkyline(B, scene, mats) {
  const buildings = [
    [-11.6, 11.5, 3.5, 7.6],
    [-7.6, 12.6, 2.7, 5.2],
    [-3.9, 11.9, 3.0, 8.7],
    [0.4, 12.8, 3.5, 6.2],
    [4.7, 11.8, 3.1, 9.4],
    [8.5, 12.7, 3.5, 7.1],
    [12.0, 11.5, 2.6, 5.8],
  ];

  for (let i = 0; i < buildings.length; i++) {
    const [x, z, w, h] = buildings[i];
    const depth = 2.2 + (i % 3) * 0.45;
    box(B, scene, 'rooftop-polish-skyline', [w, h, depth], [x, h / 2 - 0.4, z], i % 2 ? mats.buildingA : mats.buildingB);
    for (let row = 0; row < Math.floor(h / 1.15); row++) {
      for (let col = 0; col < Math.max(1, Math.floor(w / 0.9)); col++) {
        if ((row + col + i) % 3 === 0) continue;
        box(B, scene, 'rooftop-polish-window', [0.28, 0.32, 0.035], [
          x - w * 0.32 + col * 0.62,
          0.65 + row * 0.82,
          z - depth / 2 - 0.02,
        ], (row + col) % 2 ? mats.window : mats.windowDim);
      }
    }
  }
}

function addRooftopDetails(B, scene, mats, animated) {
  const tank = cylinder(B, scene, 'rooftop-polish-water-tank', {
    height: 1.9,
    diameter: 2.1,
    tessellation: 16,
  }, [-8.55, 3.25, 3.4], mats.waterTank);
  cylinder(B, scene, 'rooftop-polish-water-tank-cap', {
    height: 0.28,
    diameterTop: 0.25,
    diameterBottom: 2.18,
    tessellation: 16,
  }, [-8.55, 4.34, 3.4], mats.dark);
  for (const [dx, dz] of [[-0.65, -0.65], [0.65, -0.65], [-0.65, 0.65], [0.65, 0.65]]) {
    box(B, scene, 'rooftop-polish-water-tank-leg', [0.12, 2.2, 0.12], [-8.55 + dx, 1.45, 3.4 + dz], mats.dark);
  }
  tank.rotation.y = 0.08;

  for (const [x, z, yaw] of [[-5.5, 5.65, -0.08], [4.9, -5.4, 0.12]]) {
    box(B, scene, 'rooftop-polish-ac-unit', [1.6, 0.9, 0.85], [x, 0.45, z], mats.ac, [0, yaw, 0]);
    const fan = cylinder(B, scene, 'rooftop-polish-ac-fan', {
      height: 0.045,
      diameter: 0.52,
      tessellation: 18,
    }, [x, 0.5, z - 0.44], mats.dark, [Math.PI / 2, 0, 0]);
    animated.push({ mesh: fan, phase: x, kind: 'spin' });
  }

  const bulbColors = [mats.bulbWarm, mats.bulbRed, mats.bulbTeal];
  box(B, scene, 'rooftop-polish-string-wire', [11.0, 0.035, 0.035], [0, 3.65, 5.55], mats.dark);
  for (let i = 0; i < 9; i++) {
    const x = -5.0 + i * 1.25;
    const bulb = sphere(B, scene, 'rooftop-polish-string-bulb', 0.18, [x, 3.45 - (i % 2) * 0.12, 5.55], bulbColors[i % bulbColors.length]);
    animated.push({ mesh: bulb, baseScale: 1, phase: i * 0.6, kind: 'pulse' });
  }

  for (let i = 0; i < 5; i++) {
    const cloth = box(B, scene, 'rooftop-polish-laundry', [0.65 + (i % 2) * 0.2, 0.7, 0.035], [-2.0 + i * 1.0, 2.15 - (i % 2) * 0.12, -5.12], i % 2 ? mats.laundryA : mats.laundryB);
    cloth.rotation.y = Math.PI;
    animated.push({ mesh: cloth, baseRot: cloth.rotation.z, phase: i * 0.7, kind: 'sway' });
  }

  for (const [x, z, h] of [[-5.9, -3.4, 2.2], [5.8, 3.0, 2.7], [3.6, -5.6, 1.8]]) {
    const mast = cylinder(B, scene, 'rooftop-polish-neon-mast', {
      height: h,
      diameter: 0.07,
      tessellation: 7,
    }, [x, h / 2, z], mats.dark);
    mast.rotation.z = 0.02;
    const glow = box(B, scene, 'rooftop-polish-neon-box', [1.25, 0.52, 0.08], [x, h - 0.25, z], x < 0 ? mats.neonRed : mats.neonBlue);
    glow.rotation.y = x < 0 ? 0.35 : -0.28;
  }
}

function polishRooftop(B, scene) {
  const mats = {
    dark: material(B, scene, 'rooftop-polish-dark', PALETTE.ink),
    tileLine: material(B, scene, 'rooftop-polish-tile-line', '#314d56'),
    buildingA: material(B, scene, 'rooftop-polish-building-a', '#30344a'),
    buildingB: material(B, scene, 'rooftop-polish-building-b', '#3b3144'),
    window: material(B, scene, 'rooftop-polish-window-warm', PALETTE.windowWarm, 0.45),
    windowDim: material(B, scene, 'rooftop-polish-window-dim', '#6b8da1', 0.18),
    waterTank: material(B, scene, 'rooftop-polish-water-tank-mat', '#6d777c'),
    ac: material(B, scene, 'rooftop-polish-ac-mat', '#8b9a9d'),
    bulbWarm: material(B, scene, 'rooftop-polish-bulb-warm', '#ffd36e', 0.72),
    bulbRed: material(B, scene, 'rooftop-polish-bulb-red', '#f16658', 0.65),
    bulbTeal: material(B, scene, 'rooftop-polish-bulb-teal', '#72d4c7', 0.65),
    laundryA: material(B, scene, 'rooftop-polish-laundry-a', '#e6c268'),
    laundryB: material(B, scene, 'rooftop-polish-laundry-b', '#be5260'),
    neonRed: material(B, scene, 'rooftop-polish-neon-red', '#d23d54', 0.55),
    neonBlue: material(B, scene, 'rooftop-polish-neon-blue', '#4d95b8', 0.55),
  };
  const animated = [];
  scene.clearColor = new B.Color4(0.34, 0.25, 0.42, 1);
  addRooftopTiles(B, scene, mats);
  addRooftopSkyline(B, scene, mats);
  addRooftopDetails(B, scene, mats, animated);

  if (B.HemisphericLight) {
    const fill = new B.HemisphericLight('rooftop-polish-fill', new B.Vector3(0.2, 1, -0.2), scene);
    fill.diffuse = color3(B, '#d9c5d8');
    fill.groundColor = color3(B, '#503d4d');
    fill.intensity = 0.28;
  }
  return animated;
}

function attachAmbientAnimation(scene, animated) {
  if (!animated.length || !scene.onBeforeRenderObservable?.add) return;
  scene.onBeforeRenderObservable.add(() => {
    const now = performance.now() * 0.001;
    for (const item of animated) {
      if (!item.mesh || item.mesh.isDisposed?.()) continue;
      if (item.kind === 'sway') {
        item.mesh.rotation.z = (item.baseRot || 0) + Math.sin(now * 1.5 + item.phase) * 0.07;
      } else if (item.kind === 'bob') {
        item.mesh.position.y = item.baseY + Math.sin(now * 1.2 + item.phase) * 0.035;
      } else if (item.kind === 'spin') {
        item.mesh.rotation.z += 0.055;
      } else if (item.kind === 'pulse') {
        const scale = item.baseScale + Math.sin(now * 2.1 + item.phase) * 0.08;
        item.mesh.scaling.setAll(scale);
      }
    }
  });
}

export function polishDanaoArena(B, scene, arenaId) {
  if (!B || !scene || !arenaId || arenaId === 'ring') return false;
  scene.metadata ||= {};
  const marker = 'danaoArenaPolish_' + arenaId;
  if (scene.metadata[marker]) return true;
  scene.metadata[marker] = true;

  const animated = arenaId === 'courtyard'
    ? polishCourtyard(B, scene)
    : arenaId === 'rooftop'
      ? polishRooftop(B, scene)
      : [];

  attachAmbientAnimation(scene, animated);
  return animated.length > 0;
}
