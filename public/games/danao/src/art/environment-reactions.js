const ARENA_AMBIENT = Object.freeze({
  ring: Object.freeze({
    debris: ['#d84b45', '#4d81bd', '#e0b84c', '#69a25c'],
    puff: '#d8e1e6',
    debrisCount: 6,
  }),
  courtyard: Object.freeze({
    debris: ['#c8493f', '#efc85d', '#d67f42', '#f0d88a'],
    puff: '#c9aa74',
    debrisCount: 5,
  }),
  rooftop: Object.freeze({
    debris: ['#d5c9a7', '#ad5965', '#5f8fa0', '#e2b958'],
    puff: '#b7c8cd',
    debrisCount: 4,
  }),
});

const STRENGTH = Object.freeze({
  pickup: 0.15,
  grab: 0.28,
  'light-hit': 0.36,
  'prop-throw': 0.48,
  'fall-reset': 0.5,
  'heavy-hit': 1,
  'fighter-throw': 1.15,
  'prop-break': 1.28,
  ko: 1.5,
});

export function environmentReactionProfile(event = {}) {
  const arenaId = ARENA_AMBIENT[event.arenaId] ? event.arenaId : 'courtyard';
  const strength = STRENGTH[event.type] || 0;
  return {
    arenaId,
    strength,
    debrisCount: strength > 0.2 ? ARENA_AMBIENT[arenaId].debrisCount : 0,
  };
}

function color3(B, hex) {
  const value = String(hex || '#ffffff').replace('#', '');
  return new B.Color3(
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255,
  );
}

function makeMaterial(B, scene, name, hex, { alpha = 1, emissive = 0 } = {}) {
  const mat = new B.StandardMaterial(name, scene);
  mat.diffuseColor = color3(B, hex);
  mat.specularColor = new B.Color3(0.03, 0.03, 0.03);
  mat.alpha = alpha;
  if (emissive) mat.emissiveColor = color3(B, hex).scale(emissive);
  return mat;
}

function clampCoordinate(value, limit = 30) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(-limit, Math.min(limit, number));
}

function createReactivePool(B, scene, arenaId, root) {
  const config = ARENA_AMBIENT[arenaId] || ARENA_AMBIENT.courtyard;
  const debrisMaterials = config.debris.map((hex, index) =>
    makeMaterial(B, scene, `danao-reactive-debris-mat-${arenaId}-${index}`, hex));
  const puffMaterial = makeMaterial(
    B,
    scene,
    `danao-reactive-puff-mat-${arenaId}`,
    config.puff,
    { alpha: 0.42 },
  );

  const debris = [];
  for (let i = 0; i < 24; i++) {
    const mesh = B.MeshBuilder.CreateBox('danao-reactive-debris', {
      width: arenaId === 'courtyard' ? 0.12 : 0.18,
      height: arenaId === 'ring' ? 0.11 : 0.035,
      depth: arenaId === 'rooftop' ? 0.28 : 0.16,
    }, scene);
    mesh.parent = root;
    mesh.material = debrisMaterials[i % debrisMaterials.length];
    mesh.visibility = 0;
    mesh.isPickable = false;
    debris.push({
      mesh,
      active: false,
      startedAt: 0,
      duration: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      rx: 0,
      ry: 0,
      rz: 0,
    });
  }

  const puffs = [];
  for (let i = 0; i < 14; i++) {
    const mesh = B.MeshBuilder.CreateSphere('danao-reactive-puff', {
      diameter: 0.42,
      segments: 7,
    }, scene);
    mesh.parent = root;
    mesh.material = puffMaterial;
    mesh.visibility = 0;
    mesh.isPickable = false;
    mesh.scaling.set(1, 0.28, 1);
    puffs.push({
      mesh,
      active: false,
      startedAt: 0,
      duration: 0,
      driftX: 0,
      driftZ: 0,
    });
  }

  return {
    debris,
    puffs,
    debrisCursor: 0,
    puffCursor: 0,
    materials: [...debrisMaterials, puffMaterial],
  };
}

function createCourtyardAmbient(B, scene, root) {
  const red = makeMaterial(B, scene, 'danao-courtyard-petal-red-mat', '#c94b43', { alpha: 0.78 });
  const gold = makeMaterial(B, scene, 'danao-courtyard-petal-gold-mat', '#efc85d', { alpha: 0.72 });
  const meshes = [];
  for (let i = 0; i < 14; i++) {
    const mesh = B.MeshBuilder.CreateBox('danao-courtyard-petal', {
      width: 0.1 + (i % 3) * 0.025,
      height: 0.02,
      depth: 0.2 + (i % 2) * 0.04,
    }, scene);
    mesh.parent = root;
    mesh.material = i % 3 ? red : gold;
    mesh.isPickable = false;
    meshes.push({
      mesh,
      lane: -6.8 + (i % 8) * 1.85,
      offset: (i * 1.37) % 15,
      phase: i * 0.61,
      speed: 0.38 + (i % 4) * 0.05,
    });
  }
  return {
    meshes: meshes.map((entry) => entry.mesh),
    materials: [red, gold],
    tick(seconds) {
      for (const entry of meshes) {
        const travel = (seconds * entry.speed + entry.offset) % 15;
        entry.mesh.position.x = -7.5 + travel;
        entry.mesh.position.z = entry.lane + Math.sin(seconds * 0.8 + entry.phase) * 0.38;
        entry.mesh.position.y = 0.2 + (entry.phase % 0.35) + Math.sin(seconds * 1.6 + entry.phase) * 0.08;
        entry.mesh.rotation.y = seconds * 0.9 + entry.phase;
        entry.mesh.rotation.z = Math.sin(seconds * 2 + entry.phase) * 0.55;
      }
    },
  };
}

function createRooftopAmbient(B, scene, root) {
  const steamMat = makeMaterial(B, scene, 'danao-rooftop-steam-mat', '#dbe3df', { alpha: 0.4, emissive: 0.05 });
  const emitters = [
    [-4.8, -1.8],
    [4.6, 1.6],
    [1.9, -4.4],
    [-5.5, 5.3],
  ];
  const meshes = [];
  for (let i = 0; i < 16; i++) {
    const mesh = B.MeshBuilder.CreateSphere('danao-rooftop-steam', {
      diameter: 0.34 + (i % 3) * 0.07,
      segments: 8,
    }, scene);
    mesh.parent = root;
    mesh.material = steamMat;
    mesh.isPickable = false;
    meshes.push({
      mesh,
      emitter: emitters[i % emitters.length],
      phase: (i / 16 + (i % emitters.length) * 0.13) % 1,
      sway: i * 0.7,
    });
  }
  return {
    meshes: meshes.map((entry) => entry.mesh),
    materials: [steamMat],
    tick(seconds) {
      for (const entry of meshes) {
        const t = (seconds * 0.18 + entry.phase) % 1;
        const [x, z] = entry.emitter;
        entry.mesh.position.x = x + Math.sin(seconds * 1.1 + entry.sway) * (0.06 + t * 0.18);
        entry.mesh.position.z = z + Math.cos(seconds * 0.75 + entry.sway) * 0.07;
        entry.mesh.position.y = 0.75 + t * 2.65;
        const scale = 0.42 + t * 1.28;
        entry.mesh.scaling.setAll(scale);
        entry.mesh.visibility = Math.sin(Math.PI * t) * 0.42;
      }
    },
  };
}

function createStoreAmbient(B, scene, root) {
  const scanMat = makeMaterial(B, scene, 'danao-store-scan-glow-mat', '#76d7ff', { alpha: 0.78, emissive: 0.75 });
  const scans = [-5.6, -1.8, 2].map((x, index) => {
    const mesh = B.MeshBuilder.CreateBox('danao-store-scan-glow', {
      width: 0.06,
      height: 0.028,
      depth: 0.72,
    }, scene);
    mesh.parent = root;
    mesh.position.set(x, 1.02, -6.6);
    mesh.material = scanMat;
    mesh.isPickable = false;
    return { mesh, x, phase: index * 0.37 };
  });
  return {
    meshes: scans.map((entry) => entry.mesh),
    materials: [scanMat],
    tick(seconds) {
      for (const entry of scans) {
        const sweep = (seconds * 0.55 + entry.phase) % 1;
        entry.mesh.position.x = entry.x - 0.56 + sweep * 1.12;
        entry.mesh.visibility = 0.48 + Math.sin(seconds * 4.1 + entry.phase) * 0.18;
      }
    },
  };
}

function createAmbient(B, scene, arenaId, root) {
  if (arenaId === 'ring') return createStoreAmbient(B, scene, root);
  if (arenaId === 'rooftop') return createRooftopAmbient(B, scene, root);
  return createCourtyardAmbient(B, scene, root);
}

function activatePuff(pool, position, now, seed, strength) {
  const item = pool.puffs[pool.puffCursor++ % pool.puffs.length];
  item.active = true;
  item.startedAt = now;
  item.duration = 360 + strength * 180;
  item.driftX = Math.sin(seed * 1.7) * 0.12;
  item.driftZ = Math.cos(seed * 1.3) * 0.12;
  item.mesh.position.set(position.x, Math.max(0.12, position.y * 0.22), position.z);
  item.mesh.scaling.set(0.38, 0.12, 0.38);
  item.mesh.visibility = 0.46;
}

function activateDebris(pool, position, now, index, seed, strength, arenaId) {
  const item = pool.debris[pool.debrisCursor++ % pool.debris.length];
  const angle = seed * 1.11 + index * 1.7;
  const speed = 1.8 + strength * 2.3 + (index % 3) * 0.32;
  item.active = true;
  item.startedAt = now;
  item.duration = 520 + strength * 300 + (index % 4) * 45;
  item.vx = Math.cos(angle) * speed;
  item.vz = Math.sin(angle) * speed;
  item.vy = 2.6 + strength * 3.4 + (index % 2) * 0.7;
  item.rx = 2.1 + (index % 4) * 0.5;
  item.ry = 2.8 + (index % 3) * 0.6;
  item.rz = 1.7 + (index % 5) * 0.42;
  item.mesh.position.set(
    position.x + Math.cos(angle) * 0.18,
    Math.max(arenaId === 'ring' ? 0.28 : 0.18, Math.min(1.25, position.y * 0.28)),
    position.z + Math.sin(angle) * 0.18,
  );
  item.mesh.rotation.set(angle * 0.2, angle * 0.35, 0);
  item.mesh.scaling.setAll(0.78 + strength * 0.12);
  item.mesh.visibility = 1;
}

function updateReactive(pool, now) {
  for (const item of pool.debris) {
    if (!item.active) continue;
    const elapsedMs = now - item.startedAt;
    const t = Math.min(1, elapsedMs / item.duration);
    if (t >= 1) {
      item.active = false;
      item.mesh.visibility = 0;
      continue;
    }
    const seconds = elapsedMs / 1000;
    item.mesh.position.x += item.vx * 0.016;
    item.mesh.position.z += item.vz * 0.016;
    item.mesh.position.y += (item.vy - 12 * seconds) * 0.016;
    if (item.mesh.position.y < 0.06) item.mesh.position.y = 0.06;
    item.mesh.rotation.x += item.rx * 0.016;
    item.mesh.rotation.y += item.ry * 0.016;
    item.mesh.rotation.z += item.rz * 0.016;
    item.mesh.visibility = Math.max(0, 1 - t * 0.82);
  }

  for (const item of pool.puffs) {
    if (!item.active) continue;
    const t = Math.min(1, (now - item.startedAt) / item.duration);
    if (t >= 1) {
      item.active = false;
      item.mesh.visibility = 0;
      continue;
    }
    item.mesh.position.x += item.driftX * 0.016;
    item.mesh.position.z += item.driftZ * 0.016;
    item.mesh.position.y += 0.32 * 0.016;
    const scale = 0.38 + t * 1.15;
    item.mesh.scaling.set(scale, 0.12 + t * 0.16, scale);
    item.mesh.visibility = (1 - t) * 0.44;
  }
}

function sceneDisposed(scene) {
  return typeof scene?.isDisposed === 'function' ? scene.isDisposed() : Boolean(scene?.isDisposed);
}

export function mountEnvironmentReactions(B, scene, arenaId) {
  if (!B || !scene || !ARENA_AMBIENT[arenaId]) return null;
  scene.metadata ||= {};
  const existing = scene.metadata.danaoEnvironmentReactionController;
  if (existing?.arenaId === arenaId) return existing;

  const root = new B.TransformNode('danao-environment-reaction-root', scene);
  const pool = createReactivePool(B, scene, arenaId, root);
  const ambient = createAmbient(B, scene, arenaId, root);
  let eventCounter = 0;

  const observer = scene.onBeforeRenderObservable?.add?.(() => {
    if (sceneDisposed(scene)) return;
    const now = globalThis.performance?.now?.() ?? Date.now();
    ambient.tick(now * 0.001);
    updateReactive(pool, now);
  }) || null;

  const controller = {
    arenaId,
    onFeedback(event = {}) {
      const profile = environmentReactionProfile({ ...event, arenaId });
      if (profile.strength <= 0.2) return false;
      const now = globalThis.performance?.now?.() ?? Date.now();
      const position = {
        x: clampCoordinate(event.x),
        y: clampCoordinate(event.y, 8),
        z: clampCoordinate(event.z),
      };
      const seed = Number.isInteger(event.seq) ? event.seq : ++eventCounter;
      const puffCount = profile.strength >= 1 ? 3 : 2;
      for (let i = 0; i < puffCount; i++) {
        activatePuff(pool, {
          x: position.x + Math.sin(seed + i) * 0.28,
          y: position.y,
          z: position.z + Math.cos(seed + i) * 0.28,
        }, now, seed + i, profile.strength);
      }
      for (let i = 0; i < profile.debrisCount; i++) {
        activateDebris(pool, position, now, i, seed, profile.strength, arenaId);
      }
      scene.metadata.danaoEnvironmentReactionCount =
        Number(scene.metadata.danaoEnvironmentReactionCount || 0) + 1;
      return true;
    },
    dispose() {
      if (observer && !sceneDisposed(scene)) scene.onBeforeRenderObservable?.remove?.(observer);
      if (!sceneDisposed(scene)) root.dispose?.(false, true);
      for (const mat of [...pool.materials, ...ambient.materials]) mat?.dispose?.();
      if (scene.metadata?.danaoEnvironmentReactionController === controller) {
        scene.metadata.danaoEnvironmentReactionController = null;
      }
    },
  };

  scene.metadata.danaoEnvironmentReactionController = controller;
  return controller;
}
