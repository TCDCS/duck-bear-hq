const ARENA_STYLE = Object.freeze({
  ring: Object.freeze({ dust: '#d7e3eb', impact: '#4b98d0' }),
  courtyard: Object.freeze({ dust: '#d8b978', impact: '#f0c64a' }),
  rooftop: Object.freeze({ dust: '#7e9ea8', impact: '#e36867' }),
});

function color3(B, hex) {
  const value = String(hex).replace('#', '');
  return new B.Color3(
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255,
  );
}

function material(B, scene, name, hex, alpha = 1, emissive = 0) {
  const mat = new B.StandardMaterial(name, scene);
  mat.diffuseColor = color3(B, hex);
  mat.specularColor = B.Color3.Black?.() || new B.Color3(0, 0, 0);
  mat.alpha = alpha;
  if (emissive) mat.emissiveColor = color3(B, hex).scale(emissive);
  return mat;
}

function setAllScale(mesh, value, y = value) {
  if (mesh?.scaling?.set) mesh.scaling.set(value, y, value);
}

function fighterRoots(scene) {
  return (scene.transformNodes || []).filter((node) => {
    if (!node || node.isDisposed?.()) return false;
    return String(node.name || '').startsWith('fighter-');
  });
}

function makeReactionPools(B, scene, style) {
  const dustMaterial = material(B, scene, 'danao-world-dust-mat', style.dust, 0.5);
  const ringMaterial = material(B, scene, 'danao-world-impact-mat', style.impact, 0.7, 0.32);
  const dust = [];
  const rings = [];

  for (let i = 0; i < 20; i++) {
    const puff = B.MeshBuilder.CreateSphere('danao-world-dust', {
      diameter: 0.42,
      segments: 7,
    }, scene);
    puff.material = dustMaterial;
    puff.isPickable = false;
    puff.visibility = 0;
    setAllScale(puff, 0.25, 0.06);
    dust.push({ mesh: puff, startedAt: 0, life: 0, seed: i * 0.73 });
  }

  for (let i = 0; i < 8; i++) {
    const ring = B.MeshBuilder.CreateTorus('danao-world-impact-ring', {
      diameter: 0.72,
      thickness: 0.07,
      tessellation: 18,
    }, scene);
    ring.rotation.x = Math.PI / 2;
    ring.material = ringMaterial;
    ring.isPickable = false;
    ring.visibility = 0;
    rings.push({ mesh: ring, startedAt: 0, life: 0 });
  }

  return { dust, rings, dustCursor: 0, ringCursor: 0 };
}

function emitDust(pool, position, now, speed = 1) {
  if (!pool.dust.length) return;
  const item = pool.dust[pool.dustCursor++ % pool.dust.length];
  item.startedAt = now;
  item.life = 360 + Math.min(180, speed * 16);
  item.mesh.position.set(position.x, 0.08, position.z);
  item.mesh.visibility = 0.5;
  setAllScale(item.mesh, 0.28, 0.055);
}

function emitImpact(pool, position, now, strength = 1) {
  if (!pool.rings.length) return;
  const item = pool.rings[pool.ringCursor++ % pool.rings.length];
  item.startedAt = now;
  item.life = 320;
  item.mesh.position.set(position.x, 0.075, position.z);
  item.mesh.visibility = Math.min(0.9, 0.45 + strength * 0.04);
  setAllScale(item.mesh, 0.48);
}

function updatePools(pool, now) {
  for (const item of pool.dust) {
    if (!item.life) continue;
    const t = Math.min(1, (now - item.startedAt) / item.life);
    if (t >= 1) {
      item.life = 0;
      item.mesh.visibility = 0;
      continue;
    }
    const scale = 0.28 + t * 1.1;
    setAllScale(item.mesh, scale, 0.045 + t * 0.035);
    item.mesh.position.x += Math.sin(now * 0.004 + item.seed) * 0.0018;
    item.mesh.position.z += Math.cos(now * 0.003 + item.seed) * 0.0018;
    item.mesh.visibility = (1 - t) * 0.42;
  }

  for (const item of pool.rings) {
    if (!item.life) continue;
    const t = Math.min(1, (now - item.startedAt) / item.life);
    if (t >= 1) {
      item.life = 0;
      item.mesh.visibility = 0;
      continue;
    }
    setAllScale(item.mesh, 0.52 + t * 1.55);
    item.mesh.visibility = (1 - t) * 0.68;
  }
}

function addCourtyardDrift(B, scene) {
  const red = material(B, scene, 'courtyard-reactive-petal-red-mat', '#c64a45', 0.72);
  const gold = material(B, scene, 'courtyard-reactive-petal-gold-mat', '#efc85d', 0.68);
  const petals = [];

  for (let i = 0; i < 18; i++) {
    const petal = B.MeshBuilder.CreateBox('courtyard-reactive-petal', {
      width: 0.12 + (i % 3) * 0.025,
      height: 0.025,
      depth: 0.24 + (i % 2) * 0.035,
    }, scene);
    petal.material = i % 3 ? red : gold;
    petal.isPickable = false;
    petals.push({
      mesh: petal,
      lane: -7.4 + (i % 9) * 1.75,
      offset: (i * 1.91) % 16,
      height: 0.22 + (i % 5) * 0.055,
      speed: 0.42 + (i % 4) * 0.055,
      phase: i * 0.57,
    });
  }

  return (now) => {
    const seconds = now * 0.001;
    for (const petal of petals) {
      const travel = (seconds * petal.speed + petal.offset) % 16;
      petal.mesh.position.x = -8 + travel;
      petal.mesh.position.z = petal.lane + Math.sin(seconds * 0.8 + petal.phase) * 0.42;
      petal.mesh.position.y = petal.height + Math.sin(seconds * 1.7 + petal.phase) * 0.08;
      petal.mesh.rotation.y = seconds * (0.7 + (petal.phase % 0.4));
      petal.mesh.rotation.z = Math.sin(seconds * 2.1 + petal.phase) * 0.62;
    }
  };
}

function addRooftopSteam(B, scene) {
  const steamMat = material(B, scene, 'rooftop-reactive-steam-mat', '#d9e2df', 0.42, 0.08);
  const emitters = [
    [-4.8, -1.8],
    [4.6, 1.6],
    [1.9, -4.4],
    [-5.5, 5.65],
    [4.9, -5.4],
  ];
  const puffs = [];

  for (let i = 0; i < 15; i++) {
    const [x, z] = emitters[i % emitters.length];
    const puff = B.MeshBuilder.CreateSphere('rooftop-reactive-steam', {
      diameter: 0.34 + (i % 3) * 0.08,
      segments: 8,
    }, scene);
    puff.material = steamMat;
    puff.isPickable = false;
    puffs.push({
      mesh: puff,
      x,
      z,
      phase: (i / 15 + (i % emitters.length) * 0.11) % 1,
      sway: i * 0.8,
    });
  }

  return (now) => {
    const seconds = now * 0.001;
    for (const puff of puffs) {
      const t = (seconds * 0.19 + puff.phase) % 1;
      puff.mesh.position.x = puff.x + Math.sin(seconds * 1.1 + puff.sway) * (0.08 + t * 0.2);
      puff.mesh.position.z = puff.z + Math.cos(seconds * 0.7 + puff.sway) * 0.08;
      puff.mesh.position.y = 0.78 + t * 2.75;
      const scale = 0.45 + t * 1.35;
      setAllScale(puff.mesh, scale);
      puff.mesh.visibility = Math.sin(Math.PI * t) * 0.34;
    }
  };
}

function addStoreMotion(B, scene) {
  const scanMat = material(B, scene, 'store-reactive-scan-mat', '#77d3ff', 0.78, 0.76);
  const scans = [-5.6, -1.8, 2.0].map((x, index) => {
    const scan = B.MeshBuilder.CreateBox('store-reactive-scan', {
      width: 0.055,
      height: 0.025,
      depth: 0.72,
    }, scene);
    scan.position.set(x, 1.015, -6.6);
    scan.material = scanMat;
    scan.isPickable = false;
    return { mesh: scan, x, phase: index * 1.8 };
  });
  const wheels = (scene.meshes || []).filter((mesh) => mesh?.name === 'supermarket-trolley-wheel');

  return (now) => {
    const seconds = now * 0.001;
    for (const scan of scans) {
      scan.mesh.position.x = scan.x - 0.55 + ((seconds * 0.62 + scan.phase) % 1.1);
      scan.mesh.visibility = 0.48 + Math.sin(seconds * 4.2 + scan.phase) * 0.18;
    }
    for (let i = 0; i < wheels.length; i++) {
      wheels[i].rotation.z += 0.004 + (i % 3) * 0.001;
    }
  };
}

function addArenaAmbient(B, scene, arenaId) {
  if (arenaId === 'courtyard') return addCourtyardDrift(B, scene);
  if (arenaId === 'rooftop') return addRooftopSteam(B, scene);
  if (arenaId === 'ring') return addStoreMotion(B, scene);
  return () => {};
}

export function mountWorldReaction(B, scene, arenaId) {
  if (!B || !scene || !arenaId) return false;
  scene.metadata ||= {};
  if (scene.metadata.danaoWorldReaction) return true;

  const style = ARENA_STYLE[arenaId] || ARENA_STYLE.courtyard;
  const pool = makeReactionPools(B, scene, style);
  const ambientTick = addArenaAmbient(B, scene, arenaId);
  const tracked = new Map();
  let roots = [];
  let lastRootRefresh = 0;

  const tick = () => {
    const now = globalThis.performance?.now?.() ?? Date.now();
    if (now - lastRootRefresh > 450 || roots.length === 0) {
      roots = fighterRoots(scene);
      lastRootRefresh = now;
    }

    for (const root of roots) {
      const x = Number(root.position?.x) || 0;
      const z = Number(root.position?.z) || 0;
      const previous = tracked.get(root);
      if (!previous) {
        tracked.set(root, { x, z, at: now, speed: 0, dustAt: 0, impactAt: 0 });
        continue;
      }

      const elapsed = Math.max(0.016, Math.min(0.12, (now - previous.at) / 1000));
      const distance = Math.hypot(x - previous.x, z - previous.z);
      const speed = distance / elapsed;
      const speedChange = speed - previous.speed;

      if (speed > 3.8 && now - previous.dustAt > 145) {
        emitDust(pool, { x, z }, now, speed);
        previous.dustAt = now;
      }
      if ((speedChange > 7.8 || speedChange < -6.8) && now - previous.impactAt > 240) {
        emitImpact(pool, { x, z }, now, Math.abs(speedChange));
        previous.impactAt = now;
      }

      previous.x = x;
      previous.z = z;
      previous.at = now;
      previous.speed = speed;
    }

    updatePools(pool, now);
    ambientTick(now);
  };

  const observer = scene.onBeforeRenderObservable?.add?.(tick);
  scene.metadata.danaoWorldReaction = { arenaId, observer };

  scene.onDisposeObservable?.addOnce?.(() => {
    tracked.clear();
  });

  return true;
}
