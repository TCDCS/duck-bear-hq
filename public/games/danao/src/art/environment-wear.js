const WEAR_SEVERITY = Object.freeze({
  'light-hit': 1,
  'prop-throw': 1,
  'fall-reset': 1,
  'heavy-hit': 2,
  'fighter-throw': 2,
  'prop-break': 3,
  ko: 3,
});

const ARENA_WEAR = Object.freeze({
  ring: Object.freeze({
    marker: 'danao-wear-ring-dent',
    targets: Object.freeze([
      ['danao-detail-trolley-group', 'trolley'],
      ['danao-detail-crate-group', 'crate'],
      ['danao-detail-checkout-display-group', 'checkout'],
    ]),
  }),
  courtyard: Object.freeze({
    marker: 'danao-wear-courtyard-crack',
    targets: Object.freeze([
      ['danao-detail-gong-group', 'gong'],
      ['danao-detail-drum-group', 'drum'],
      ['danao-detail-lantern-stand-group', 'lantern'],
    ]),
  }),
  rooftop: Object.freeze({
    marker: 'danao-wear-rooftop-spark',
    targets: Object.freeze([
      ['danao-detail-rooftop-duct-group', 'duct'],
      ['danao-detail-rooftop-vent-group', 'vent'],
      ['danao-detail-rooftop-sign-group', 'sign'],
      ['danao-detail-rooftop-aerial-group', 'aerial'],
    ]),
  }),
});

const STYLE = Object.freeze({
  trolley: Object.freeze({ anchor: [0, 0.68, -0.38], size: [0.62, 0.035, 0.035], yaw: 0 }),
  crate: Object.freeze({ anchor: [0, 0.46, -0.38], size: [0.48, 0.035, 0.035], yaw: 0 }),
  checkout: Object.freeze({ anchor: [0, 0.97, -0.075], size: [0.4, 0.028, 0.028], yaw: 0 }),
  gong: Object.freeze({ anchor: [0, 1.58, -0.075], size: [0.58, 0.035, 0.035], yaw: 0 }),
  drum: Object.freeze({ anchor: [0, 1.14, -0.22], size: [0.44, 0.035, 0.035], yaw: 0 }),
  lantern: Object.freeze({ anchor: [0, 1.96, -0.24], size: [0.34, 0.03, 0.03], yaw: 0 }),
  duct: Object.freeze({ anchor: [0, 0.48, -0.42], size: [0.68, 0.035, 0.035], yaw: 0 }),
  vent: Object.freeze({ anchor: [0, 0.42, -0.49], size: [0.5, 0.03, 0.03], yaw: 0 }),
  sign: Object.freeze({ anchor: [0, 2.2, -0.09], size: [0.72, 0.035, 0.035], yaw: 0 }),
  aerial: Object.freeze({ anchor: [0, 1.8, -0.05], size: [0.48, 0.03, 0.03], yaw: 0 }),
});

function color3(B, hex) {
  const value = String(hex || '#ffffff').replace('#', '');
  return new B.Color3(
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255,
  );
}

function makeMaterial(B, scene, name, hex, { alpha = 1, emissive = 0, specular = 0.05 } = {}) {
  const mat = new B.StandardMaterial(name, scene);
  mat.diffuseColor = color3(B, hex);
  mat.specularColor = new B.Color3(specular, specular, specular);
  mat.specularPower = emissive ? 64 : 24;
  mat.alpha = alpha;
  if (emissive) mat.emissiveColor = color3(B, hex).scale(emissive);
  return mat;
}

function makeBox(B, scene, name, size, parent, material, position, rotation) {
  const mesh = B.MeshBuilder.CreateBox(name, {
    width: size[0],
    height: size[1],
    depth: size[2],
  }, scene);
  mesh.parent = parent;
  mesh.position.set(position[0], position[1], position[2]);
  mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  mesh.material = material;
  mesh.isPickable = false;
  return mesh;
}

function makeSpark(B, scene, parent, material, position) {
  const mesh = B.MeshBuilder.CreateSphere('danao-wear-impact-spark', {
    diameter: 0.13,
    segments: 7,
  }, scene);
  mesh.parent = parent;
  mesh.position.set(position[0], position[1], position[2] - 0.025);
  mesh.material = material;
  mesh.visibility = 0;
  mesh.isPickable = false;
  return mesh;
}

function collectChildren(node) {
  const meshes = node?.getChildMeshes?.(false) || [];
  return meshes.map((mesh, index) => ({
    mesh,
    index,
    position: mesh.position?.clone?.() || {
      x: mesh.position?.x || 0,
      y: mesh.position?.y || 0,
      z: mesh.position?.z || 0,
    },
    rotation: mesh.rotation?.clone?.() || {
      x: mesh.rotation?.x || 0,
      y: mesh.rotation?.y || 0,
      z: mesh.rotation?.z || 0,
    },
    scaling: mesh.scaling?.clone?.() || {
      x: mesh.scaling?.x || 1,
      y: mesh.scaling?.y || 1,
      z: mesh.scaling?.z || 1,
    },
    visibility: Number.isFinite(mesh.visibility) ? mesh.visibility : 1,
  }));
}

function resetChild(entry) {
  const { mesh, position, rotation, scaling, visibility } = entry;
  if (!mesh || mesh.isDisposed?.()) return;
  mesh.position?.set?.(position.x, position.y, position.z);
  mesh.rotation?.set?.(rotation.x, rotation.y, rotation.z);
  mesh.scaling?.set?.(scaling.x, scaling.y, scaling.z);
  mesh.visibility = visibility;
}

function childName(entry, name) {
  return entry.mesh?.name === name;
}

function findChildren(entry, name) {
  return entry.children.filter((child) => childName(child, name));
}

function applyTrolleyWear(entry, state) {
  for (const child of findChildren(entry, 'danao-detail-trolley-handle')) {
    child.mesh.rotation.z += state * 0.055;
    child.mesh.rotation.y -= state * 0.025;
  }
  findChildren(entry, 'danao-detail-trolley-wheel').forEach((child, index) => {
    child.mesh.rotation.z += (index % 2 ? 1 : -1) * state * 0.12;
    if (state >= 3 && index === 3) child.mesh.scaling.y *= 0.62;
  });
  findChildren(entry, 'danao-detail-trolley-basket-wire').forEach((child, index) => {
    if (index % 3 === 1) child.mesh.position.x += (index % 2 ? 1 : -1) * state * 0.025;
  });
}

function applyCrateWear(entry, state) {
  findChildren(entry, 'danao-detail-produce-crate').forEach((child, index) => {
    if (index === 0) {
      child.mesh.rotation.z += state * 0.035;
      child.mesh.scaling.x *= 1 - state * 0.035;
    }
  });
  findChildren(entry, 'danao-detail-produce-item').forEach((child, index) => {
    if (!state) return;
    const direction = index % 2 ? 1 : -1;
    child.mesh.position.x += direction * 0.045 * state * (1 + (index % 3) * 0.2);
    child.mesh.position.z += ((index % 3) - 1) * 0.03 * state;
    if (state >= 3 && index % 4 === 0) child.mesh.position.y = Math.max(0.14, child.mesh.position.y - 0.18);
  });
}

function applyCheckoutWear(entry, state) {
  for (const child of findChildren(entry, 'danao-detail-checkout-display')) {
    child.mesh.rotation.z += state * 0.018;
  }
  for (const child of findChildren(entry, 'danao-detail-checkout-screen')) {
    child.mesh.scaling.x *= 1 - state * 0.045;
    child.mesh.rotation.z -= state * 0.02;
  }
}

function applyGongWear(entry, state) {
  for (const child of findChildren(entry, 'danao-detail-gong')) {
    child.mesh.rotation.z += state * 0.025;
    child.mesh.scaling.x *= 1 - state * 0.018;
  }
  for (const child of findChildren(entry, 'danao-detail-gong-center')) {
    child.mesh.position.x += state * 0.022;
  }
}

function applyDrumWear(entry, state) {
  for (const child of findChildren(entry, 'danao-detail-drum-skin')) {
    child.mesh.scaling.x *= 1 - state * 0.035;
    child.mesh.scaling.z *= 1 - state * 0.025;
    child.mesh.position.y -= state * 0.012;
  }
  findChildren(entry, 'danao-detail-drum-stud').forEach((child, index) => {
    if (state >= 2 && index % 4 === 0) child.mesh.position.y -= 0.04 * state;
  });
}

function applyLanternWear(entry, state) {
  for (const child of findChildren(entry, 'danao-detail-hanging-lantern')) {
    child.mesh.scaling.x *= 1 - state * 0.055;
    child.mesh.rotation.z += state * 0.035;
  }
  for (const child of findChildren(entry, 'danao-detail-lantern-arm')) {
    child.mesh.rotation.z -= state * 0.025;
  }
}

function applyDuctWear(entry, state) {
  findChildren(entry, 'danao-detail-rooftop-duct-rib').forEach((child, index) => {
    child.mesh.rotation.z += ((index % 3) - 1) * state * 0.025;
  });
  for (const child of findChildren(entry, 'danao-detail-rooftop-duct-joint')) {
    child.mesh.position.y -= state * 0.025;
    child.mesh.rotation.z += state * 0.022;
  }
}

function applyVentWear(entry, state) {
  findChildren(entry, 'danao-detail-rooftop-vent-slat').forEach((child, index) => {
    child.mesh.rotation.z += ((index % 2 ? 1 : -1) * state * 0.035) + index * 0.004;
    if (state >= 3 && index === 2) child.mesh.position.x += 0.09;
  });
}

function applySignWear(entry, state) {
  for (const child of findChildren(entry, 'danao-detail-rooftop-sign')) {
    child.mesh.rotation.z += state * 0.018;
  }
  findChildren(entry, 'danao-detail-rooftop-sign-light').forEach((child, index) => {
    if (state >= 2 && index === 4) child.mesh.rotation.z += 0.18;
  });
}

function applyAerialWear(entry, state) {
  findChildren(entry, 'danao-detail-rooftop-aerial-bar').forEach((child, index) => {
    child.mesh.rotation.z += ((index % 2 ? 1 : -1) * state * 0.035);
    child.mesh.rotation.y += index * state * 0.018;
  });
}

function applySpecialWear(entry, state) {
  for (const child of entry.children) resetChild(child);
  if (!state) return;

  if (entry.type === 'trolley') applyTrolleyWear(entry, state);
  else if (entry.type === 'crate') applyCrateWear(entry, state);
  else if (entry.type === 'checkout') applyCheckoutWear(entry, state);
  else if (entry.type === 'gong') applyGongWear(entry, state);
  else if (entry.type === 'drum') applyDrumWear(entry, state);
  else if (entry.type === 'lantern') applyLanternWear(entry, state);
  else if (entry.type === 'duct') applyDuctWear(entry, state);
  else if (entry.type === 'vent') applyVentWear(entry, state);
  else if (entry.type === 'sign') applySignWear(entry, state);
  else if (entry.type === 'aerial') applyAerialWear(entry, state);
}

function buildWearVisuals(B, scene, arenaId, entry, mats) {
  const style = STYLE[entry.type] || STYLE.vent;
  const [x, y, z] = style.anchor;
  const [w, h, d] = style.size;

  const marker = makeBox(
    B,
    scene,
    ARENA_WEAR[arenaId].marker,
    [w, h, d],
    entry.node,
    mats.scuff,
    [x, y, z],
    [0, style.yaw || 0, -0.12],
  );
  marker.visibility = 0;

  const crackA = makeBox(
    B,
    scene,
    'danao-wear-crack',
    [w * 0.72, Math.max(0.022, h * 0.76), d],
    entry.node,
    mats.crack,
    [x + w * 0.06, y + 0.075, z - 0.006],
    [0, style.yaw || 0, 0.52],
  );
  crackA.visibility = 0;

  const crackB = makeBox(
    B,
    scene,
    'danao-wear-crack',
    [w * 0.46, Math.max(0.02, h * 0.68), d],
    entry.node,
    mats.crack,
    [x - w * 0.12, y - 0.06, z - 0.009],
    [0, style.yaw || 0, -0.68],
  );
  crackB.visibility = 0;

  const chip = makeBox(
    B,
    scene,
    'danao-wear-break-chip',
    [Math.max(0.11, w * 0.26), Math.max(0.07, h * 2.1), Math.max(0.035, d * 1.2)],
    entry.node,
    mats.chip,
    [x + w * 0.33, y - 0.08, z - 0.02],
    [0.18, 0.24, 0.42],
  );
  chip.visibility = 0;

  const spark = makeSpark(B, scene, entry.node, mats.spark, [x, y + 0.04, z]);

  entry.marker = marker;
  entry.cracks = [crackA, crackB];
  entry.chip = chip;
  entry.spark = spark;
}

function setWearState(entry, nextState, now) {
  const state = Math.max(0, Math.min(3, Math.round(Number(nextState) || 0)));
  if (state < entry.state) return false;
  const changed = state > entry.state;
  entry.state = state;
  entry.impactAt = now;
  entry.flashUntil = now + 300 + state * 80;

  entry.marker.visibility = state >= 1 ? 0.82 : 0;
  entry.cracks[0].visibility = state >= 2 ? 0.92 : 0;
  entry.cracks[1].visibility = state >= 2 ? 0.78 : 0;
  entry.chip.visibility = state >= 3 ? 0.95 : 0;

  applySpecialWear(entry, state);
  return changed;
}

function worldPosition(node) {
  const value = node?.getAbsolutePosition?.();
  if (value) return value;
  return node?.position || { x: 0, y: 0, z: 0 };
}

function flickerChildren(entry, seconds) {
  if (entry.state < 2) return;
  let name = '';
  if (entry.type === 'checkout') name = 'danao-detail-checkout-screen';
  else if (entry.type === 'lantern') name = 'danao-detail-hanging-lantern';
  else if (entry.type === 'sign') name = 'danao-detail-rooftop-sign-light';
  if (!name) return;

  findChildren(entry, name).forEach((child, index) => {
    if (!child.mesh || child.mesh.isDisposed?.()) return;
    const pulse = Math.sin(seconds * (7.2 + index * 0.37) + entry.phase + index * 1.9);
    const threshold = entry.state >= 3 ? -0.1 : -0.62;
    child.mesh.visibility = pulse > threshold ? child.visibility : child.visibility * 0.18;
  });
}

function tickEntry(entry, now) {
  const seconds = now * 0.001;
  flickerChildren(entry, seconds);

  if (now < entry.flashUntil) {
    const t = Math.max(0, Math.min(1, (entry.flashUntil - now) / 420));
    entry.spark.visibility = 0.18 + t * 0.82;
    const scale = 0.72 + (1 - t) * 1.8;
    entry.spark.scaling.setAll(scale);
  } else {
    entry.spark.visibility = 0;
  }

  if (entry.state >= 3) {
    entry.chip.rotation.y += 0.004;
  }
}

function findTargetNodes(scene, arenaId) {
  const config = ARENA_WEAR[arenaId];
  const transformNodes = scene?.transformNodes || [];
  const found = [];
  for (const [groupName, type] of config.targets) {
    for (const node of transformNodes) {
      if (node?.name !== groupName) continue;
      found.push({ node, type });
    }
  }
  return found;
}

function clampCoordinate(value, limit = 30) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(-limit, Math.min(limit, number));
}

function sceneDisposed(scene) {
  return typeof scene?.isDisposed === 'function' ? scene.isDisposed() : Boolean(scene?.isDisposed);
}

export function environmentWearProfile(event = {}) {
  const arenaId = ARENA_WEAR[event.arenaId] ? event.arenaId : 'courtyard';
  const severity = WEAR_SEVERITY[event.type] || 0;
  return {
    arenaId,
    severity,
    breakState: severity >= 3 ? 3 : 0,
  };
}

export function environmentWearMarker(arenaId) {
  return (ARENA_WEAR[arenaId] || ARENA_WEAR.courtyard).marker;
}

export function mountEnvironmentWear(B, scene, arenaId) {
  if (!B || !scene || !ARENA_WEAR[arenaId]) return null;
  scene.metadata ||= {};
  const existing = scene.metadata.danaoEnvironmentWearController;
  if (existing?.arenaId === arenaId) return existing;

  const targets = findTargetNodes(scene, arenaId);
  if (!targets.length) return null;

  const materials = {
    scuff: makeMaterial(B, scene, 'danao-wear-scuff-mat', '#3d3431', { alpha: 0.88 }),
    crack: makeMaterial(B, scene, 'danao-wear-crack-mat', '#231f22', { alpha: 0.96 }),
    chip: makeMaterial(B, scene, 'danao-wear-chip-mat', arenaId === 'rooftop' ? '#8a5b42' : '#7c4437'),
    spark: makeMaterial(B, scene, 'danao-wear-spark-mat', '#ffd66b', { alpha: 0.9, emissive: 0.9, specular: 0.18 }),
  };

  const entries = targets.map(({ node, type }, index) => {
    const entry = {
      node,
      type,
      state: 0,
      phase: index * 0.83 + type.length * 0.17,
      impactAt: -Infinity,
      flashUntil: -Infinity,
      children: collectChildren(node),
      marker: null,
      cracks: [],
      chip: null,
      spark: null,
    };
    buildWearVisuals(B, scene, arenaId, entry, materials);
    return entry;
  });

  const observer = scene.onBeforeRenderObservable?.add?.(() => {
    if (sceneDisposed(scene)) return;
    const now = globalThis.performance?.now?.() ?? Date.now();
    for (const entry of entries) tickEntry(entry, now);
  }) || null;

  const controller = {
    arenaId,
    marker: ARENA_WEAR[arenaId].marker,
    targetCount: entries.length,
    onFeedback(event = {}) {
      const profile = environmentWearProfile({ ...event, arenaId });
      if (!profile.severity) return false;

      const x = clampCoordinate(event.x);
      const z = clampCoordinate(event.z);
      let nearest = null;
      let nearestDistance = Infinity;
      for (const entry of entries) {
        const position = worldPosition(entry.node);
        const distance = Math.hypot(position.x - x, position.z - z);
        if (distance < nearestDistance) {
          nearest = entry;
          nearestDistance = distance;
        }
      }
      if (!nearest) return false;

      const now = globalThis.performance?.now?.() ?? Date.now();
      const nextState = profile.breakState || Math.min(3, nearest.state + profile.severity);
      setWearState(nearest, nextState, now);

      scene.metadata.danaoEnvironmentWearCount =
        Number(scene.metadata.danaoEnvironmentWearCount || 0) + 1;
      scene.metadata.danaoEnvironmentWearHighestState = Math.max(
        Number(scene.metadata.danaoEnvironmentWearHighestState || 0),
        nearest.state,
      );
      scene.metadata.danaoEnvironmentWearLastType = nearest.type;
      scene.metadata.danaoEnvironmentWearLastDistance = nearestDistance;
      return true;
    },
    getState() {
      return entries.map((entry) => ({
        type: entry.type,
        state: entry.state,
      }));
    },
    dispose() {
      if (observer && !sceneDisposed(scene)) scene.onBeforeRenderObservable?.remove?.(observer);
      for (const entry of entries) {
        for (const child of entry.children) resetChild(child);
        entry.marker?.dispose?.();
        for (const crack of entry.cracks) crack?.dispose?.();
        entry.chip?.dispose?.();
        entry.spark?.dispose?.();
      }
      for (const mat of Object.values(materials)) mat?.dispose?.();
      if (scene.metadata?.danaoEnvironmentWearController === controller) {
        scene.metadata.danaoEnvironmentWearController = null;
      }
    },
  };

  scene.metadata.danaoEnvironmentWearController = controller;
  scene.metadata.danaoEnvironmentWearMarker = ARENA_WEAR[arenaId].marker;
  scene.metadata.danaoEnvironmentWearTargetCount = entries.length;
  return controller;
}
