import { GAME_CONFIG } from './config.js';
import { getArena } from './arena.js';
import { applyHit } from './rules.js';
import { botIntent } from './bot.js';
import { createInputEdges, neutralInput } from './input.js';
import { cameraFrameForPoints, movementVector, nearestOpponent } from './runtimeMath.js';
import { createArcadeAudio } from './audio.js';
import { countdownState, edgeDanger, fighterPose } from './presentation.js';
import { BABYLON_URLS, RAPIER_URLS } from './dependencies.js';


const FIGHTER_STYLES = Object.freeze([
  { id: 'tiger', name: 'Tiger', primary: '#b92d32', secondary: '#f2b13d', skin: '#f0bd82' },
  { id: 'crane', name: 'Crane', primary: '#267c7d', secondary: '#f0e5c3', skin: '#dca56e' },
  { id: 'monkey', name: 'Monkey', primary: '#b97826', secondary: '#622d22', skin: '#e7ad71' },
  { id: 'ox', name: 'Ox', primary: '#3d6090', secondary: '#d6d0b9', skin: '#c98d62' },
]);

const FIXED_STEP = 1 / 60;

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  return {
    r: parseInt(value.slice(0, 2), 16) / 255,
    g: parseInt(value.slice(2, 4), 16) / 255,
    b: parseInt(value.slice(4, 6), 16) / 255,
  };
}

function toColor3(B, hex) {
  const c = hexToRgb(hex);
  return new B.Color3(c.r, c.g, c.b);
}

function makeMaterial(B, scene, name, color, { emissive = 0, alpha = 1 } = {}) {
  const material = new B.StandardMaterial(name, scene);
  material.diffuseColor = toColor3(B, color);
  material.specularColor = new B.Color3(0.08, 0.08, 0.08);
  if (emissive) material.emissiveColor = toColor3(B, color).scale(emissive);
  material.alpha = alpha;
  return material;
}

function stylizeMesh(B, mesh) {
  mesh.enableEdgesRendering?.();
  mesh.edgesWidth = 2.2;
  mesh.edgesColor = new B.Color4(0.08, 0.05, 0.06, 0.76);
  return mesh;
}

async function loadBabylon(onStatus = () => {}) {
  if (globalThis.BABYLON) return globalThis.BABYLON;
  let lastError = null;
  for (const url of BABYLON_URLS) {
    try {
      onStatus('Loading Babylon renderer…');
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.async = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Could not load ${url}`));
        document.head.appendChild(script);
      });
      if (globalThis.BABYLON) return globalThis.BABYLON;
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`Babylon.js could not load. ${lastError?.message || ''}`.trim());
}

async function loadRapier(onStatus = () => {}) {
  let lastError = null;
  for (const url of RAPIER_URLS) {
    try {
      onStatus('Loading Rapier physics…');
      const module = await import(url);
      const RAPIER = module.default ?? module;
      await RAPIER.init();
      return RAPIER;
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`Rapier physics could not load. ${lastError?.message || ''}`.trim());
}

function createFighterVisual(B, scene, style, isPlayer) {
  const root = new B.TransformNode(`fighter-${style.id}`, scene);
  const primary = makeMaterial(B, scene, `${style.id}-primary`, style.primary);
  const secondary = makeMaterial(B, scene, `${style.id}-secondary`, style.secondary);
  const skin = makeMaterial(B, scene, `${style.id}-skin`, style.skin);
  const dark = makeMaterial(B, scene, `${style.id}-dark`, '#24171b');
  const white = makeMaterial(B, scene, `${style.id}-white`, '#fff0d2');
  const arms = [];
  const fists = [];
  const legs = [];
  const feet = [];

  const torso = stylizeMesh(B, B.MeshBuilder.CreateBox(`${style.id}-torso`, { width: 0.92, height: 1.16, depth: 0.62 }, scene));
  torso.parent = root;
  torso.position.y = 0.05;
  torso.material = primary;

  const belt = stylizeMesh(B, B.MeshBuilder.CreateBox(`${style.id}-belt`, { width: 1.0, height: 0.18, depth: 0.68 }, scene));
  belt.parent = root;
  belt.position.y = -0.36;
  belt.material = secondary;

  const head = stylizeMesh(B, B.MeshBuilder.CreateSphere(`${style.id}-head`, { diameter: 0.78, segments: 12 }, scene));
  head.parent = root;
  head.position.y = 0.98;
  head.material = skin;
  head.scaling.y = 0.92;

  const hair = stylizeMesh(B, B.MeshBuilder.CreateBox(`${style.id}-hair`, { width: 0.69, height: 0.19, depth: 0.61 }, scene));
  hair.parent = root;
  hair.position.set(0, 1.27, -0.02);
  hair.material = dark;

  for (const x of [-0.17, 0.17]) {
    const eye = B.MeshBuilder.CreateSphere(`${style.id}-eye`, { diameter: 0.11, segments: 8 }, scene);
    eye.parent = root;
    eye.position.set(x, 1.04, 0.36);
    eye.material = white;
    const pupil = B.MeshBuilder.CreateSphere(`${style.id}-pupil`, { diameter: 0.055, segments: 8 }, scene);
    pupil.parent = root;
    pupil.position.set(x, 1.04, 0.413);
    pupil.material = dark;
  }

  for (const side of [-1, 1]) {
    const arm = stylizeMesh(B, B.MeshBuilder.CreateBox(`${style.id}-arm`, { width: 0.28, height: 0.82, depth: 0.3 }, scene));
    arm.parent = root;
    arm.position.set(side * 0.59, 0.08, 0.02);
    arm.rotation.z = side * -0.12;
    arm.material = primary;
    arms.push(arm);
    const fist = stylizeMesh(B, B.MeshBuilder.CreateSphere(`${style.id}-fist`, { diameter: 0.36, segments: 10 }, scene));
    fist.parent = root;
    fist.position.set(side * 0.62, -0.36, 0.07);
    fist.material = skin;
    fists.push(fist);

    const leg = stylizeMesh(B, B.MeshBuilder.CreateBox(`${style.id}-leg`, { width: 0.34, height: 0.72, depth: 0.38 }, scene));
    leg.parent = root;
    leg.position.set(side * 0.24, -0.85, 0);
    leg.material = dark;
    legs.push(leg);
    const foot = stylizeMesh(B, B.MeshBuilder.CreateBox(`${style.id}-foot`, { width: 0.4, height: 0.22, depth: 0.62 }, scene));
    foot.parent = root;
    foot.position.set(side * 0.24, -1.17, 0.12);
    foot.material = secondary;
    feet.push(foot);
  }

  if (style.id === 'tiger') {
    const band = stylizeMesh(B, B.MeshBuilder.CreateBox('tiger-headband', { width: 0.84, height: 0.1, depth: 0.72 }, scene));
    band.parent = root;
    band.position.y = 1.25;
    band.material = secondary;
    for (const x of [-0.22, 0.22]) {
      const tail = B.MeshBuilder.CreateBox('tiger-band-tail', { width: 0.08, height: 0.48, depth: 0.08 }, scene);
      tail.parent = root;
      tail.position.set(x, 1.18, -0.42);
      tail.rotation.x = 0.35;
      tail.material = secondary;
    }
  } else if (style.id === 'crane') {
    const hat = stylizeMesh(B, B.MeshBuilder.CreateCylinder('crane-hat', { height: 0.24, diameterTop: 0.08, diameterBottom: 1.18, tessellation: 12 }, scene));
    hat.parent = root;
    hat.position.y = 1.43;
    hat.material = secondary;
  } else if (style.id === 'monkey') {
    for (const x of [-0.41, 0.41]) {
      const ear = stylizeMesh(B, B.MeshBuilder.CreateSphere('monkey-ear', { diameter: 0.3, segments: 8 }, scene));
      ear.parent = root;
      ear.position.set(x, 1.02, 0);
      ear.scaling.x = 0.55;
      ear.material = skin;
    }
    const sash = stylizeMesh(B, B.MeshBuilder.CreateBox('monkey-sash', { width: 0.22, height: 1.28, depth: 0.12 }, scene));
    sash.parent = root;
    sash.position.set(0.28, -0.02, -0.34);
    sash.rotation.z = -0.22;
    sash.material = secondary;
  } else if (style.id === 'ox') {
    for (const side of [-1, 1]) {
      const horn = stylizeMesh(B, B.MeshBuilder.CreateCylinder('ox-horn', { height: 0.42, diameterTop: 0.05, diameterBottom: 0.2, tessellation: 8 }, scene));
      horn.parent = root;
      horn.position.set(side * 0.31, 1.36, 0);
      horn.rotation.z = side * -0.72;
      horn.material = secondary;
    }
  }

  if (isPlayer) {
    const markerMat = makeMaterial(B, scene, `${style.id}-marker`, '#f7d34b', { emissive: 0.45 });
    const marker = B.MeshBuilder.CreateTorus(`${style.id}-marker`, { diameter: 1.55, thickness: 0.08, tessellation: 24 }, scene);
    marker.parent = root;
    marker.rotation.x = Math.PI / 2;
    marker.position.y = -1.28;
    marker.material = markerMat;
  }

  root.metadata = { torso, belt, head, hair, arms, fists, legs, feet, primary, secondary, skin, dark };
  root.scaling.setAll(1.08);
  return root;
}

function createShadow(B, scene) {
  const mat = makeMaterial(B, scene, `shadow-${Math.random()}`, '#171217', { alpha: 0.28 });
  const shadow = B.MeshBuilder.CreateCylinder(`shadow-${Math.random()}`, { height: 0.025, diameter: 1.42, tessellation: 20 }, scene);
  shadow.material = mat;
  return shadow;
}

function createArenaVisual(B, scene, arena) {
  const floorMat = makeMaterial(B, scene, 'floor', arena.palette.floor);
  const trimMat = makeMaterial(B, scene, 'trim', arena.palette.trim);
  const accentMat = makeMaterial(B, scene, 'accent', arena.palette.accent, { emissive: 0.12 });
  const darkMat = makeMaterial(B, scene, 'dark', '#2a1b1c');

  const floor = stylizeMesh(B, B.MeshBuilder.CreateBox('arena-floor', { width: arena.size.x, height: 0.6, depth: arena.size.z }, scene));
  floor.position.y = -0.3;
  floor.material = floorMat;

  const under = B.MeshBuilder.CreateBox('arena-under', { width: arena.size.x + 0.8, height: 0.6, depth: arena.size.z + 0.8 }, scene);
  under.position.y = -0.72;
  under.material = darkMat;

  if (arena.id === 'courtyard') {
    for (const [x, z] of [[-7, -7], [7, -7], [-7, 7], [7, 7]]) {
      const post = stylizeMesh(B, B.MeshBuilder.CreateCylinder('courtyard-post', { height: 3.7, diameter: 0.5, tessellation: 8 }, scene));
      post.position.set(x, 1.55, z);
      post.material = trimMat;
      const lantern = stylizeMesh(B, B.MeshBuilder.CreateSphere('lantern', { diameter: 0.85, segments: 10 }, scene));
      lantern.position.set(x, 2.65, z);
      lantern.scaling.y = 1.15;
      lantern.material = accentMat;
    }
    const gong = stylizeMesh(B, B.MeshBuilder.CreateTorus('gong', { diameter: 3.1, thickness: 0.24, tessellation: 32 }, scene));
    gong.position.set(0, 2.4, arena.size.z / 2 + 1.4);
    gong.rotation.x = Math.PI / 2;
    gong.material = accentMat;
  }

  if (arena.id === 'rooftop') {
    for (let i = -5; i <= 5; i++) {
      const ridge = B.MeshBuilder.CreateBox('roof-ridge', { width: 0.16, height: 0.16, depth: arena.size.z - 0.5 }, scene);
      ridge.position.set(i * 1.05, 0.08, 0);
      ridge.material = trimMat;
    }
    for (const side of [-1, 1]) {
      const sign = stylizeMesh(B, B.MeshBuilder.CreateBox('roof-sign', { width: 2.7, height: 1.2, depth: 0.22 }, scene));
      sign.position.set(side * (arena.size.x / 2 + 1.2), 1.7, 0);
      sign.rotation.y = Math.PI / 2;
      sign.material = accentMat;
    }
  }

  if (arena.id === 'ring') {
    const halfX = arena.size.x / 2 - 0.5;
    const halfZ = arena.size.z / 2 - 0.5;
    for (const [x, z] of [[-halfX, -halfZ], [halfX, -halfZ], [-halfX, halfZ], [halfX, halfZ]]) {
      const post = stylizeMesh(B, B.MeshBuilder.CreateBox('ring-post', { width: 0.42, height: 3.0, depth: 0.42 }, scene));
      post.position.set(x, 1.2, z);
      post.material = trimMat;
    }
    for (const y of [0.7, 1.25, 1.8]) {
      for (const z of [-halfZ, halfZ]) {
        const rope = B.MeshBuilder.CreateBox('ring-rope', { width: halfX * 2, height: 0.08, depth: 0.08 }, scene);
        rope.position.set(0, y, z);
        rope.material = accentMat;
      }
      for (const x of [-halfX, halfX]) {
        const rope = B.MeshBuilder.CreateBox('ring-rope', { width: 0.08, height: 0.08, depth: halfZ * 2 }, scene);
        rope.position.set(x, y, 0);
        rope.material = accentMat;
      }
    }
  }

  const edgeX = arena.size.x / 2 + 1.25;
  const edgeZ = arena.size.z / 2 + 1.25;
  for (let i = 0; i < 10; i++) {
    const along = -0.42 + (i / 9) * 0.84;
    const horizontal = i % 2 === 0;
    const pole = B.MeshBuilder.CreateCylinder(`banner-pole-${i}`, { height: 2.6, diameter: 0.08, tessellation: 6 }, scene);
    pole.position.set(horizontal ? along * arena.size.x : (i % 4 < 2 ? -edgeX : edgeX), 1.0, horizontal ? (i < 5 ? -edgeZ : edgeZ) : along * arena.size.z);
    pole.material = darkMat;
    const flag = stylizeMesh(B, B.MeshBuilder.CreateBox(`banner-flag-${i}`, { width: 0.72, height: 0.54, depth: 0.05 }, scene));
    flag.position.copyFrom(pole.position);
    flag.position.y += 0.65;
    flag.position.x += horizontal ? 0.36 : (pole.position.x < 0 ? 0.36 : -0.36);
    flag.material = i % 3 === 0 ? accentMat : trimMat;
  }

  if (arena.id === 'courtyard') {
    for (const x of [-5.7, 5.7]) {
      const drum = stylizeMesh(B, B.MeshBuilder.CreateCylinder('courtyard-drum', { height: 1.1, diameter: 1.35, tessellation: 12 }, scene));
      drum.position.set(x, 0.55, arena.size.z / 2 + 1.15);
      drum.rotation.z = Math.PI / 2;
      drum.material = trimMat;
    }
  } else if (arena.id === 'rooftop') {
    for (const z of [-4.4, 4.4]) {
      const chimney = stylizeMesh(B, B.MeshBuilder.CreateBox('roof-chimney', { width: 1.1, height: 2.3, depth: 1.1 }, scene));
      chimney.position.set(arena.size.x / 2 + 1.4, 1.15, z);
      chimney.material = darkMat;
    }
  } else if (arena.id === 'ring') {
    for (const z of [-edgeZ - 1.6, edgeZ + 1.6]) {
      for (let row = 0; row < 2; row++) {
        const stand = B.MeshBuilder.CreateBox('crowd-stand', { width: arena.size.x + 4, height: 0.65, depth: 1.15 }, scene);
        stand.position.set(0, 0.15 + row * 0.62, z + (z < 0 ? -row * 0.7 : row * 0.7));
        stand.material = row ? trimMat : darkMat;
      }
    }
  }

  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const radius = Math.max(arena.size.x, arena.size.z) * 0.92 + (i % 3) * 1.4;
    const mountain = B.MeshBuilder.CreateCylinder(`mountain-${i}`, { height: 4 + (i % 4), diameterBottom: 4.4, diameterTop: 0, tessellation: 4 }, scene);
    mountain.position.set(Math.cos(angle) * radius, 1.1, Math.sin(angle) * radius);
    mountain.rotation.y = angle;
    mountain.material = i % 2 ? darkMat : trimMat;
    mountain.scaling.x = 1.3;
  }

  const hazardVisuals = arena.hazards.map((hazard, index) => {
    const root = new B.TransformNode(`hazard-${index}`, scene);
    root.position.set(hazard.x, hazard.y, hazard.z);
    const bar = stylizeMesh(B, B.MeshBuilder.CreateBox(`hazard-bar-${index}`, { width: hazard.radius * 2, height: 0.26, depth: 0.48 }, scene));
    bar.parent = root;
    bar.material = accentMat;
    const capA = B.MeshBuilder.CreateSphere(`hazard-cap-a-${index}`, { diameter: 0.6, segments: 10 }, scene);
    capA.parent = root;
    capA.position.x = -hazard.radius;
    capA.material = trimMat;
    const capB = capA.clone(`hazard-cap-b-${index}`);
    capB.parent = root;
    capB.position.x = hazard.radius;
    return { ...hazard, root, angle: 0, hitAt: new Map() };
  });

  return { hazardVisuals };
}

function spawnImpact(B, scene, position, colorHex, heavy, onShake) {
  const mat = makeMaterial(B, scene, `impact-${performance.now()}`, colorHex, { emissive: 0.7, alpha: 0.9 });
  const ring = B.MeshBuilder.CreateTorus(`impact-${performance.now()}`, { diameter: heavy ? 1.5 : 0.9, thickness: heavy ? 0.12 : 0.08, tessellation: 20 }, scene);
  ring.position.copyFrom(position);
  ring.rotation.x = Math.PI / 2;
  ring.material = mat;
  ring.scaling.setAll(0.35);
  const start = performance.now();
  const observer = scene.onBeforeRenderObservable.add(() => {
    const t = Math.min(1, (performance.now() - start) / (heavy ? 230 : 160));
    ring.scaling.setAll(0.35 + t * (heavy ? 1.65 : 1.1));
    mat.alpha = 0.9 * (1 - t);
    if (t >= 1) {
      scene.onBeforeRenderObservable.remove(observer);
      ring.dispose();
      mat.dispose();
    }
  });
  if (heavy) onShake(0.45);
}

function readGamepad(index = 0) {
  const pads = globalThis.navigator?.getGamepads?.() || [];
  const pad = pads[index];
  if (!pad) return null;
  const dead = (value) => Math.abs(value) < 0.18 ? 0 : value;
  return {
    moveX: dead(pad.axes?.[0] || 0),
    moveZ: -dead(pad.axes?.[1] || 0),
    jump: Boolean(pad.buttons?.[0]?.pressed),
    dodge: Boolean(pad.buttons?.[1]?.pressed),
    light: Boolean(pad.buttons?.[2]?.pressed),
    heavy: Boolean(pad.buttons?.[3]?.pressed),
  };
}

function readKeyboard(keys) {
  return {
    moveX: (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0),
    moveZ: (keys.has('KeyS') ? 1 : 0) - (keys.has('KeyW') ? 1 : 0),
    jump: keys.has('Space'),
    light: keys.has('KeyJ'),
    heavy: keys.has('KeyK'),
    dodge: keys.has('KeyL'),
  };
}

function mergeInput(a, b) {
  if (!b) return a;
  const moveX = Math.abs(b.moveX) > Math.abs(a.moveX) ? b.moveX : a.moveX;
  const moveZ = Math.abs(b.moveZ) > Math.abs(a.moveZ) ? b.moveZ : a.moveZ;
  return {
    moveX,
    moveZ,
    jump: a.jump || b.jump,
    light: a.light || b.light,
    heavy: a.heavy || b.heavy,
    dodge: a.dodge || b.dodge,
  };
}

function styleOrder(selectedId) {
  const selected = FIGHTER_STYLES.find((style) => style.id === selectedId) || FIGHTER_STYLES[0];
  return [selected, ...FIGHTER_STYLES.filter((style) => style.id !== selected.id)];
}

export function createDanaoRuntime(canvas, callbacks = {}) {
  let B = globalThis.BABYLON || null;
  let RAPIER = null;
  let engine = null;
  let scene = null;
  let world = null;
  let camera = null;
  let currentArena = null;
  let fighters = [];
  let hazards = [];
  let running = false;
  let paused = false;
  let matchOver = false;
  let matchStartedAt = 0;
  let pausedAt = 0;
  let lastCountdownLabel = null;
  let accumulator = 0;
  let lastFrame = 0;
  let lastHud = 0;
  let shake = 0;
  let settings = { masterVolume: 0.72, music: true, sfx: true, cameraShake: true };
  let audio = createArcadeAudio(settings);
  let timers = [];
  const keys = new Set();

  const onStatus = callbacks.onStatus || (() => {});
  const onHud = callbacks.onHud || (() => {});
  const onBanner = callbacks.onBanner || (() => {});
  const onBannerClear = callbacks.onBannerClear || (() => {});
  const onResult = callbacks.onResult || (() => {});

  function schedule(fn, delay) {
    const id = globalThis.setTimeout(() => {
      timers = timers.filter((value) => value !== id);
      fn();
    }, delay);
    timers.push(id);
    return id;
  }

  function clearTimers() {
    for (const id of timers) globalThis.clearTimeout(id);
    timers = [];
  }

  async function ensureRuntime() {
    if (!B) B = await loadBabylon(onStatus);
    if (!RAPIER) RAPIER = await loadRapier(onStatus);
    if (!engine) {
      engine = new B.Engine(canvas, true, { antialias: true, preserveDrawingBuffer: false, stencil: true }, true);
      engine.setHardwareScalingLevel(Math.max(1, (globalThis.devicePixelRatio || 1) / 1.5));
      globalThis.addEventListener?.('resize', () => engine?.resize());
    }
  }

  function buildScene(arena) {
    scene?.dispose();
    world?.free?.();
    scene = new B.Scene(engine);
    const sky = hexToRgb(arena.palette.sky);
    scene.clearColor = new B.Color4(sky.r, sky.g, sky.b, 1);
    scene.ambientColor = new B.Color3(0.55, 0.48, 0.45);

    const hemi = new B.HemisphericLight('hemi', new B.Vector3(0.25, 1, -0.2), scene);
    hemi.intensity = 1.0;
    hemi.groundColor = new B.Color3(0.24, 0.18, 0.2);
    const sun = new B.DirectionalLight('sun', new B.Vector3(-0.4, -1, 0.25), scene);
    sun.position = new B.Vector3(10, 18, -10);
    sun.intensity = 1.15;

    camera = new B.FreeCamera('shared-camera', new B.Vector3(13, 15, -18), scene);
    camera.fov = 0.72;
    camera.minZ = 0.2;
    camera.maxZ = 120;
    camera.setTarget(B.Vector3.Zero());
    scene.activeCamera = camera;

    const arenaVisual = createArenaVisual(B, scene, arena);
    hazards = arenaVisual.hazardVisuals;

    world = new RAPIER.World({ x: 0, y: -19.5, z: 0 });
    world.timestep = FIXED_STEP;
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(arena.size.x / 2, 0.3, arena.size.z / 2)
        .setTranslation(0, -0.3, 0)
        .setFriction(1.2)
        .setRestitution(0.05),
    );
  }

  function createFighter(slot, spawn, style, control) {
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(spawn.x, spawn.y, spawn.z)
        .setLinearDamping(3.8)
        .setAngularDamping(8)
        .lockRotations(),
    );
    world.createCollider(
      RAPIER.ColliderDesc.capsule(0.53, 0.43)
        .setDensity(1.1)
        .setFriction(0.55)
        .setRestitution(0.04),
      body,
    );

    const visual = createFighterVisual(B, scene, style, slot === 0);
    const shadow = createShadow(B, scene);
    return {
      id: `p${slot + 1}`,
      slot,
      name: slot === 0 ? style.name : `${style.name}${control.type === 'bot' ? ' Bot' : ` P${slot + 1}`}`,
      style,
      control,
      body,
      visual,
      shadow,
      spawn,
      health: GAME_CONFIG.maxHealth,
      score: 0,
      active: true,
      direction: { x: 0, z: 1 },
      previousInput: neutralInput(),
      attackReadyAt: 0,
      dodgeReadyAt: 0,
      hitStunUntil: 0,
      invulnerableUntil: 0,
      lastAttackerId: null,
      lastAttackedAt: 0,
      attackPulseUntil: 0,
      attackKind: '',
      attackUntil: 0,
      dodgePoseUntil: 0,
    };
  }

  function fighterPosition(fighter) {
    const p = fighter.body.translation();
    return { x: p.x, y: p.y, z: p.z };
  }

  function syncVisuals(now) {
    for (const fighter of fighters) {
      if (!fighter.active) continue;
      const p = fighter.body.translation();
      const v = fighter.body.linvel();
      const pose = fighterPose({
        now,
        speed: Math.hypot(v.x, v.z),
        attackKind: fighter.attackKind,
        attackUntil: fighter.attackUntil,
        dodgeUntil: fighter.dodgePoseUntil,
        hitStunUntil: fighter.hitStunUntil,
      });
      fighter.visual.position.set(p.x, p.y + pose.bob, p.z);
      fighter.visual.rotation.y = Math.atan2(fighter.direction.x, fighter.direction.z);
      fighter.visual.rotation.x = -pose.lean;
      const pulse = now < fighter.attackPulseUntil ? 1.11 : 1;
      const base = 1.08 * pulse;
      fighter.visual.scaling.set(base * pose.stretch, base * pose.squash, base * pose.stretch);

      const parts = fighter.visual.metadata || {};
      const stride = Math.sin(now / 105) * Math.min(0.7, Math.hypot(v.x, v.z) * 0.11);
      if (parts.legs?.length === 2) {
        parts.legs[0].rotation.x = stride;
        parts.legs[1].rotation.x = -stride;
        parts.feet[0].rotation.x = stride * 0.45;
        parts.feet[1].rotation.x = -stride * 0.45;
      }
      if (parts.arms?.length === 2) {
        parts.arms[0].rotation.x = -stride * 0.65 - pose.punch * (fighter.attackKind === 'heavy' ? 0.85 : 0.28);
        parts.arms[1].rotation.x = stride * 0.65 - pose.punch * 1.25;
        parts.fists[0].position.z = 0.07 + pose.punch * 0.26;
        parts.fists[1].position.z = 0.07 + pose.punch * 0.56;
      }
      if (parts.primary) {
        parts.primary.emissiveColor = pose.flash > 0
          ? new B.Color3(pose.flash * 0.52, pose.flash * 0.12, pose.flash * 0.08)
          : B.Color3.Black();
      }

      fighter.shadow.position.set(p.x, currentArena.floorY + 0.02, p.z);
      const height = Math.max(0, p.y - 1.1 - currentArena.floorY);
      const shadowScale = Math.max(0.55, 1 - height * 0.08);
      fighter.shadow.scaling.set(shadowScale, 1, shadowScale);
    }
  }

  function updateCamera() {
    const active = fighters.filter((fighter) => fighter.active).map((fighter) => {
      const p = fighter.body.translation();
      return { x: p.x, z: p.z };
    });
    const frame = cameraFrameForPoints(active);
    const d = frame.distance;
    const shakeAmount = settings.cameraShake ? shake : 0;
    const jitterX = (Math.random() - 0.5) * shakeAmount;
    const jitterY = (Math.random() - 0.5) * shakeAmount * 0.6;
    const targetPos = new B.Vector3(frame.center.x + d * 0.58 + jitterX, d * 0.72 + 3.0 + jitterY, frame.center.z - d * 0.78);
    camera.position = B.Vector3.Lerp(camera.position, targetPos, 0.075);
    camera.setTarget(new B.Vector3(frame.center.x, 0.65, frame.center.z));
    shake *= 0.86;
    if (shake < 0.01) shake = 0;
  }

  function currentInput(fighter) {
    if (fighter.control.type === 'hybrid') return mergeInput(readKeyboard(keys), readGamepad(0));
    if (fighter.control.type === 'gamepad') return readGamepad(fighter.control.index) || neutralInput();
    if (fighter.control.type === 'bot') {
      const selfPos = fighterPosition(fighter);
      const target = nearestOpponent({ id: fighter.id, x: selfPos.x, z: selfPos.z, active: fighter.active }, fighters.map((other) => {
        const p = fighterPosition(other);
        return { id: other.id, x: p.x, z: p.z, active: other.active };
      }));
      if (!target) return neutralInput();
      return botIntent(selfPos, target, Math.random);
    }
    return neutralInput();
  }

  function grounded(fighter) {
    const p = fighter.body.translation();
    const v = fighter.body.linvel();
    return p.y <= currentArena.floorY + 1.18 && Math.abs(v.y) < 1.35;
  }

  function applyMovement(fighter, raw, edges, now) {
    const body = fighter.body;
    const velocity = body.linvel();
    const move = movementVector(raw.moveX, raw.moveZ, GAME_CONFIG.moveSpeed);
    const magnitude = Math.hypot(raw.moveX, raw.moveZ);
    if (magnitude > 0.08) {
      fighter.direction.x = move.x / Math.max(0.001, Math.hypot(move.x, move.z));
      fighter.direction.z = move.z / Math.max(0.001, Math.hypot(move.x, move.z));
    }

    if (now >= fighter.hitStunUntil) {
      body.setLinvel({ x: move.x, y: velocity.y, z: move.z }, true);
    }

    if (edges.jumpPressed && grounded(fighter) && now >= fighter.hitStunUntil) {
      body.setLinvel({ x: move.x, y: GAME_CONFIG.jumpImpulse, z: move.z }, true);
      audio.jump();
    }

    if (edges.dodgePressed && now >= fighter.dodgeReadyAt && now >= fighter.hitStunUntil) {
      fighter.dodgeReadyAt = now + 760;
      fighter.dodgePoseUntil = now + 230;
      fighter.invulnerableUntil = now + 220;
      fighter.hitStunUntil = now + 175;
      const dx = magnitude > 0.08 ? fighter.direction.x : fighter.direction.x;
      const dz = magnitude > 0.08 ? fighter.direction.z : fighter.direction.z;
      body.setLinvel({ x: dx * GAME_CONFIG.dodgeSpeed, y: Math.max(0.8, velocity.y), z: dz * GAME_CONFIG.dodgeSpeed }, true);
      audio.dodge();
    }
  }

  function performAttack(attacker, kind, now) {
    const profile = kind === 'heavy' ? GAME_CONFIG.heavyAttack : GAME_CONFIG.lightAttack;
    if (now < attacker.attackReadyAt || now < attacker.hitStunUntil || !attacker.active) return;
    attacker.attackReadyAt = now + profile.cooldownMs;
    attacker.attackPulseUntil = now + (kind === 'heavy' ? 210 : 135);
    attacker.attackKind = kind;
    attacker.attackUntil = now + (kind === 'heavy' ? 250 : 155);
    const origin = attacker.body.translation();

    for (const target of fighters) {
      if (target.id === attacker.id || !target.active || now < target.invulnerableUntil) continue;
      const tp = target.body.translation();
      const dx = tp.x - origin.x;
      const dz = tp.z - origin.z;
      const distance = Math.hypot(dx, dz);
      if (distance > profile.range || distance < 0.001) continue;
      const nx = dx / distance;
      const nz = dz / distance;
      const facingDot = nx * attacker.direction.x + nz * attacker.direction.z;
      if (facingDot < -0.05) continue;

      const result = applyHit({ health: target.health }, profile);
      target.health = result.health;
      target.lastAttackerId = attacker.id;
      target.lastAttackedAt = now;
      const damageScale = 1 + (GAME_CONFIG.maxHealth - target.health) / 135;
      const knockback = profile.knockback * damageScale;
      target.hitStunUntil = now + (kind === 'heavy' ? 390 : 240);
      target.body.setLinvel({ x: nx * knockback, y: 2.5 + knockback * 0.28, z: nz * knockback }, true);
      audio.hit(kind === 'heavy');
      spawnImpact(B, scene, new B.Vector3(tp.x, tp.y + 0.3, tp.z), kind === 'heavy' ? '#f6c83f' : '#fff0cf', kind === 'heavy', (value) => { shake = Math.max(shake, value); });
      if (target.health <= 0) knockOut(target, attacker.id, 'KO');
      break;
    }
  }

  function updateFighter(fighter, now) {
    if (!fighter.active || matchOver) return;
    const raw = currentInput(fighter);
    const edges = createInputEdges(fighter.previousInput, raw);
    fighter.previousInput = raw;
    applyMovement(fighter, raw, edges, now);
    if (edges.lightPressed) performAttack(fighter, 'light', now);
    if (edges.heavyPressed) performAttack(fighter, 'heavy', now);
  }

  function knockOut(victim, scorerId, reason = 'RING OUT') {
    if (!victim.active || matchOver) return;
    victim.active = false;
    victim.visual.setEnabled(false);
    victim.shadow.setEnabled(false);
    victim.body.setTranslation({ x: 0, y: -18, z: 0 }, true);
    victim.body.setLinvel({ x: 0, y: 0, z: 0 }, true);

    const scorer = fighters.find((fighter) => fighter.id === scorerId && fighter.id !== victim.id);
    if (scorer) scorer.score += 1;
    audio.ringOut();
    onBanner(`${victim.style.name} — ${reason}!`);
    schedule(onBannerClear, 760);
    pushHud();

    if (scorer && scorer.score >= GAME_CONFIG.targetScore) {
      matchOver = true;
      audio.stopMusic();
      audio.win();
      schedule(() => onResult({ winner: scorer.style.name, scores: fighters.map((fighter) => ({ id: fighter.id, name: fighter.style.name, score: fighter.score })) }), 900);
      return;
    }

    schedule(() => respawn(victim), GAME_CONFIG.respawnMs);
  }

  function respawn(fighter) {
    if (matchOver || !running) return;
    fighter.health = GAME_CONFIG.maxHealth;
    fighter.active = true;
    fighter.lastAttackerId = null;
    fighter.hitStunUntil = performance.now() + 350;
    fighter.invulnerableUntil = performance.now() + 700;
    fighter.body.setTranslation({ x: fighter.spawn.x, y: fighter.spawn.y + 0.5, z: fighter.spawn.z }, true);
    fighter.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    fighter.visual.setEnabled(true);
    fighter.shadow.setEnabled(true);
    pushHud();
  }

  function checkRingOuts(now) {
    const halfX = currentArena.size.x / 2;
    const halfZ = currentArena.size.z / 2;
    for (const fighter of fighters) {
      if (!fighter.active) continue;
      const p = fighter.body.translation();
      if (p.y < GAME_CONFIG.ringOutY || Math.abs(p.x) > halfX + 5 || Math.abs(p.z) > halfZ + 5) {
        const recentAttacker = now - fighter.lastAttackedAt < 5000 ? fighter.lastAttackerId : null;
        knockOut(fighter, recentAttacker, 'RING OUT');
      }
    }
  }

  function updateHazards(now) {
    for (const hazard of hazards) {
      hazard.angle += hazard.speed * FIXED_STEP;
      hazard.root.rotation.y = hazard.angle;
      const cos = Math.cos(-hazard.angle);
      const sin = Math.sin(-hazard.angle);
      for (const fighter of fighters) {
        if (!fighter.active || now < fighter.invulnerableUntil) continue;
        const p = fighter.body.translation();
        const dx = p.x - hazard.x;
        const dz = p.z - hazard.z;
        const localX = dx * cos - dz * sin;
        const localZ = dx * sin + dz * cos;
        if (Math.abs(localX) > hazard.radius + 0.4 || Math.abs(localZ) > 0.62 || Math.abs(p.y - hazard.y) > 1.7) continue;
        const previousHit = hazard.hitAt.get(fighter.id) || 0;
        if (now - previousHit < 700) continue;
        hazard.hitAt.set(fighter.id, now);
        const side = localZ >= 0 ? 1 : -1;
        const worldX = -Math.sin(hazard.angle) * side;
        const worldZ = Math.cos(hazard.angle) * side;
        fighter.hitStunUntil = now + 360;
        fighter.lastAttackerId = null;
        fighter.body.setLinvel({ x: worldX * 9, y: 4.8, z: worldZ * 9 }, true);
        audio.hit(true);
        spawnImpact(B, scene, new B.Vector3(p.x, p.y, p.z), '#f5c842', true, (value) => { shake = Math.max(shake, value); });
      }
    }
  }

  function pushHud() {
    onHud(fighters.map((fighter) => {
      const p = fighter.body.translation();
      return {
        id: fighter.id,
        name: fighter.style.name,
        score: fighter.score,
        health: fighter.health,
        active: fighter.active,
        danger: fighter.active ? edgeDanger(p, currentArena?.size || { x: 1, z: 1 }) : 0,
      };
    }));
  }

  function fixedUpdate(now, inputLocked = false) {
    if (!inputLocked) {
      for (const fighter of fighters) updateFighter(fighter, now);
      updateHazards(now);
    }
    world.step();
    checkRingOuts(now);
  }

  function frame() {
    if (!running || !scene) return;
    const now = performance.now();
    if (!lastFrame) lastFrame = now;
    const delta = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;

    const countdown = countdownState(now - matchStartedAt);
    if (countdown.label !== lastCountdownLabel) {
      lastCountdownLabel = countdown.label;
      if (countdown.label) onBanner(countdown.label);
      else onBannerClear();
    }

    if (!paused) {
      accumulator += delta;
      while (accumulator >= FIXED_STEP) {
        fixedUpdate(now, countdown.locked || matchOver);
        accumulator -= FIXED_STEP;
      }
      syncVisuals(now);
      updateCamera();
    } else {
      accumulator = 0;
    }

    if (now - lastHud > 140) {
      pushHud();
      lastHud = now;
    }
    scene.render();
  }

  async function startMatch(options = {}) {
    await ensureRuntime();
    stopMatch(false);
    settings = { ...settings, ...(options.settings || {}) };
    audio.updateSettings(settings);
    audio.unlock();
    audio.startMusic('fight');
    currentArena = getArena(options.arenaId);
    onStatus(`Building ${currentArena.name}…`);
    buildScene(currentArena);

    const styles = styleOrder(options.fighterId);
    const total = Math.max(2, Math.min(4, 1 + (Number(options.botCount) || 3)));
    const pads = globalThis.navigator?.getGamepads?.() || [];
    fighters = [];
    for (let i = 0; i < total; i++) {
      let control;
      if (i === 0) control = { type: 'hybrid', index: 0 };
      else if (pads[i]) control = { type: 'gamepad', index: i };
      else control = { type: 'bot' };
      fighters.push(createFighter(i, currentArena.spawns[i], styles[i], control));
    }

    running = true;
    paused = false;
    matchOver = false;
    matchStartedAt = performance.now();
    pausedAt = 0;
    lastCountdownLabel = null;
    accumulator = 0;
    lastFrame = 0;
    lastHud = 0;
    pushHud();
    onBanner('3');
    lastCountdownLabel = '3';
    onStatus('Ready');
    engine.stopRenderLoop();
    engine.runRenderLoop(frame);
    return true;
  }

  function stopMatch(clearScene = true) {
    running = false;
    paused = false;
    pausedAt = 0;
    matchOver = false;
    clearTimers();
    keys.clear();
    audio.stopMusic();
    if (engine) engine.stopRenderLoop();
    if (clearScene) {
      fighters = [];
      hazards = [];
      scene?.dispose();
      scene = null;
      world?.free?.();
      world = null;
    }
  }

  function startMenuAudio() {
    audio.unlock();
    audio.startMusic('menu');
  }

  function setPaused(nextPaused) {
    const now = performance.now();
    const requested = Boolean(nextPaused) && running && !matchOver;
    if (requested === paused) return paused;
    if (requested) {
      paused = true;
      pausedAt = now;
      audio.stopMusic();
    } else {
      if (pausedAt && matchStartedAt) matchStartedAt += now - pausedAt;
      paused = false;
      pausedAt = 0;
      if (running) audio.startMusic('fight');
    }
    accumulator = 0;
    lastFrame = now;
    return paused;
  }

  function setSettings(next) {
    settings = { ...settings, ...next };
    audio.updateSettings(settings);
  }

  function dispose() {
    stopMatch(true);
    audio.dispose();
    engine?.dispose();
    engine = null;
  }

  function onKeyDown(event) {
    if (['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyJ', 'KeyK', 'KeyL'].includes(event.code)) event.preventDefault();
    keys.add(event.code);
  }
  function onKeyUp(event) { keys.delete(event.code); }
  globalThis.addEventListener?.('keydown', onKeyDown, { passive: false });
  globalThis.addEventListener?.('keyup', onKeyUp);

  return { startMenuAudio, startMatch, stopMatch, setPaused, setSettings, dispose };
}
