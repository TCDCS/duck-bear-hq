import { mountHeroRenderModel } from './hero-model.js';

const FEMALE_ROOT = '/games/danao/assets/characters/hero/';
const FEMALE_FILE = 'hero-female.gltf';
const MALE_ROOT = '/games/danao/assets/characters/cast/male/';
const MALE_FILE = 'male.gltf';
const HAIR_ROOT = '/games/danao/assets/characters/cast/hair/';
const DOG_ROOT = '/games/danao/assets/characters/cast/mulan/';
const DOG_FILE = 'mulan-dog.glb';

const GLTF_LOADER_URLS = Object.freeze([
  'https://cdn.jsdelivr.net/npm/babylonjs-loaders@9.26.2/babylonjs.loaders.min.js',
  'https://unpkg.com/babylonjs-loaders@9.26.2/babylonjs.loaders.min.js',
]);

export const CAST_MODELS = Object.freeze({
  hero: Object.freeze({
    kind: 'human',
    sex: 'female',
    hair: 'hero-hair-buns.glb',
    skin: '#efbd9e',
    shirt: '#28b9b2',
    pants: '#eb7b85',
    shoes: '#fff2c8',
    hairColor: '#303042',
    accent: '#f4d45d',
  }),
  stephen: Object.freeze({
    kind: 'human',
    sex: 'male',
    hair: 'parted.glb',
    accessories: Object.freeze([{ file: 'beard.glb', color: '#a76848' }]),
    skin: '#f0c7ac',
    shirt: '#657499',
    pants: '#40516e',
    shoes: '#eec575',
    hairColor: '#78615a',
    accent: '#eec575',
  }),
  zachary: Object.freeze({
    kind: 'human',
    sex: 'male',
    hair: 'buzzed.glb',
    accessories: Object.freeze([{ file: 'beard.glb', color: '#77747a' }]),
    skin: '#e8b897',
    shirt: '#e58862',
    pants: '#517789',
    shoes: '#f8dc85',
    hairColor: '#67616a',
    accent: '#f8dc85',
  }),
  mulan: Object.freeze({
    kind: 'dog',
    model: DOG_FILE,
    main: '#c69769',
    light: '#fff2d6',
    dark: '#493a37',
    collar: '#45b5aa',
  }),
  gaby: Object.freeze({
    kind: 'human',
    sex: 'female',
    hair: 'long.glb',
    skin: '#e9b596',
    shirt: '#b888d5',
    pants: '#526079',
    shoes: '#fff0c9',
    hairColor: '#282b3c',
    accent: '#efda91',
  }),
  sara: Object.freeze({
    kind: 'human',
    sex: 'female',
    hair: 'long.glb',
    skin: '#edc19e',
    shirt: '#9090d8',
    pants: '#448c99',
    shoes: '#fff1d3',
    hairColor: '#655047',
    accent: '#fff1d3',
  }),
  mum: Object.freeze({
    kind: 'human',
    sex: 'female',
    hair: 'buzzed-female.glb',
    skin: '#e3b49a',
    shirt: '#e58b98',
    pants: '#596e8b',
    shoes: '#ffeed4',
    hairColor: '#858395',
    accent: '#ffeed4',
  }),
  dad: Object.freeze({
    kind: 'human',
    sex: 'male',
    hair: 'buzzed.glb',
    skin: '#dfb194',
    shirt: '#77b6c8',
    pants: '#556681',
    shoes: '#e1c39e',
    hairColor: '#91909a',
    accent: '#e1c39e',
  }),
});

let loaderPromise = null;

function hexRgb(hex) {
  const value = String(hex || '#ffffff').replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255,
  ];
}

function color3(B, hex) {
  const [r, g, b] = hexRgb(hex);
  return new B.Color3(r, g, b);
}

function pluginAvailable(B) {
  try {
    return Boolean(
      B?.SceneLoader?.IsPluginForExtensionAvailable?.('.gltf')
      || B?.SceneLoader?.IsPluginForExtensionAvailable?.('.glb'),
    );
  } catch {
    return false;
  }
}

async function ensureGltfLoader(B) {
  if (pluginAvailable(B)) return true;
  if (loaderPromise) return loaderPromise;
  if (!globalThis.document?.head) return false;

  loaderPromise = (async () => {
    for (const url of GLTF_LOADER_URLS) {
      try {
        await new Promise((resolve, reject) => {
          const existing = [...globalThis.document.querySelectorAll?.('script') || []]
            .find((node) => node.src === url);
          if (existing?.dataset?.danaoReady === '1') {
            resolve();
            return;
          }
          const script = existing || globalThis.document.createElement('script');
          script.src = url;
          script.async = true;
          script.dataset.danaoGltfLoader = '1';
          const loaded = () => {
            script.dataset.danaoReady = '1';
            resolve();
          };
          const failed = () => reject(new Error('Babylon glTF loader unavailable.'));
          script.addEventListener?.('load', loaded, { once: true });
          script.addEventListener?.('error', failed, { once: true });
          if (!existing) globalThis.document.head.appendChild(script);
        });
        if (pluginAvailable(B)) return true;
      } catch {
        // Fall through to the next trusted CDN.
      }
    }
    return pluginAvailable(B);
  })();

  return loaderPromise;
}

function toonMaterial(B, scene, name, hex) {
  const material = new B.StandardMaterial(name, scene);
  material.diffuseColor = color3(B, hex);
  material.specularColor = B.Color3.Black();
  material.ambientColor = color3(B, hex).scale(0.32);
  material.roughness = 0.9;
  return material;
}

function tintMaterial(B, material, hex) {
  if (!material) return;
  const color = color3(B, hex);
  if ('albedoColor' in material) {
    material.albedoColor = color;
    material.metallic = 0;
    material.roughness = 0.9;
  } else if ('diffuseColor' in material) {
    material.diffuseColor = color;
    material.specularColor = B.Color3.Black();
  }
}

function setOutline(B, mesh, width = 0.023) {
  if (!mesh) return;
  mesh.renderOutline = true;
  mesh.outlineColor = color3(B, '#21161e');
  mesh.outlineWidth = width;
}

function paintBody(B, scene, body, styleId, palette) {
  const positions = body?.getVerticesData?.(B.VertexBuffer.PositionKind);
  if (!positions?.length) return false;

  const skin = hexRgb(palette.skin);
  const shirt = hexRgb(palette.shirt);
  const pants = hexRgb(palette.pants);
  const shoes = hexRgb(palette.shoes);
  const colors = new Array((positions.length / 3) * 4);

  for (let vertex = 0; vertex < positions.length / 3; vertex++) {
    const x = positions[vertex * 3];
    const y = positions[vertex * 3 + 1];

    let rgb = shirt;
    if (y > 1.38) rgb = skin;
    else if (Math.abs(x) > 0.61 && y > 0.68) rgb = skin;
    else if (y < 0.16) rgb = shoes;
    else if (y < 0.79) rgb = pants;

    const offset = vertex * 4;
    colors[offset] = rgb[0];
    colors[offset + 1] = rgb[1];
    colors[offset + 2] = rgb[2];
    colors[offset + 3] = 1;
  }

  body.setVerticesData(B.VertexBuffer.ColorKind, colors, false, 4);
  body.useVertexColors = true;
  body.hasVertexAlpha = false;
  body.material = toonMaterial(B, scene, `cast-${styleId}-body`, '#ffffff');
  setOutline(B, body, 0.022);
  return true;
}

function rigMap(B, result) {
  const map = new Map();

  const add = (node) => {
    if (!node?.name || map.has(node.name)) return;
    let base;
    if (node.rotationQuaternion?.clone) {
      base = node.rotationQuaternion.clone();
    } else {
      base = B.Quaternion.FromEulerAngles(
        Number(node.rotation?.x) || 0,
        Number(node.rotation?.y) || 0,
        Number(node.rotation?.z) || 0,
      );
      node.rotationQuaternion = base.clone();
    }
    map.set(node.name, { node, base });
  };

  for (const node of result?.transformNodes || []) add(node);
  for (const skeleton of result?.skeletons || []) {
    for (const bone of skeleton?.bones || []) add(bone?.getTransformNode?.());
  }
  return map;
}

function makeHumanPoseRig(B, results) {
  const maps = results.map((result) => rigMap(B, result));

  const rotate = (name, pitch = 0, yaw = 0, roll = 0) => {
    const delta = B.Quaternion.RotationYawPitchRoll(yaw, pitch, roll);
    for (const map of maps) {
      const entry = map.get(name);
      if (!entry) continue;
      entry.node.rotationQuaternion = entry.base.multiply(delta);
    }
  };

  const applyPose = ({
    stride = 0,
    punch = 0,
    recoil = 0,
    dodgeLean = 0,
    jumpTuck = 0,
    bodyTwist = 0,
    attackKind = '',
  } = {}) => {
    const heavy = attackKind === 'heavy';
    const armDrop = 1.04;

    rotate('upperarm_l',
      -stride * 0.24 - (heavy ? punch * 0.42 : punch * 0.08),
      bodyTwist * -0.06,
      armDrop + punch * (heavy ? 0.18 : 0.04));
    rotate('upperarm_r',
      stride * 0.24 - punch * (heavy ? 1.05 : 1.26),
      bodyTwist * 0.08,
      -armDrop + punch * (heavy ? -0.08 : 0.05));
    rotate('lowerarm_l', -0.28 - punch * (heavy ? 0.2 : 0.04), 0, 0);
    rotate('lowerarm_r', -0.24 + punch * 0.34, 0, 0);

    rotate('thigh_l', stride * 0.56 - jumpTuck * 0.5, 0, 0);
    rotate('thigh_r', -stride * 0.56 - jumpTuck * 0.5, 0, 0);
    rotate('calf_l', -Math.min(0, stride) * 0.38 + jumpTuck * 0.58, 0, 0);
    rotate('calf_r', Math.max(0, stride) * 0.38 + jumpTuck * 0.58, 0, 0);

    rotate('spine_01', recoil * 0.15, bodyTwist * 0.18, dodgeLean * -0.08);
    rotate('spine_02', recoil * 0.24, bodyTwist * 0.28, dodgeLean * -0.18);
    rotate('spine_03', recoil * 0.12, bodyTwist * 0.18, dodgeLean * -0.12);
    rotate('neck_01', recoil * -0.08, bodyTwist * -0.08, dodgeLean * 0.08);
    rotate('Head', recoil * -0.1, bodyTwist * -0.1, dodgeLean * 0.12);
  };

  return { applyPose };
}

function importedRoot(result) {
  return result?.meshes?.find?.((mesh) => mesh.name === '__root__')
    || result?.meshes?.[0]
    || result?.transformNodes?.find?.((node) => node.name === 'Armature')
    || null;
}

function findBodyMesh(result) {
  return result?.meshes?.find?.((mesh) =>
    mesh.name === 'Superhero_Female'
    || mesh.name === 'SuperHero_Male'
    || mesh.name === 'Sphere.005_Retopology.004'
  ) || result?.meshes?.find?.((mesh) => (mesh.getTotalVertices?.() || 0) > 5000);
}

function styleHumanResult(B, scene, styleId, config, bodyResult, accessoryResults) {
  const body = findBodyMesh(bodyResult);
  if (!body || !paintBody(B, scene, body, styleId, config)) return false;

  const eyes = bodyResult?.meshes?.find?.((mesh) => /Eyes|Face\.001/.test(mesh.name));
  const brows = bodyResult?.meshes?.find?.((mesh) => /Eyebrows|^Face$/.test(mesh.name));
  if (eyes) setOutline(B, eyes, 0.009);
  if (brows) {
    brows.material = toonMaterial(B, scene, `cast-${styleId}-brows`, config.hairColor);
    setOutline(B, brows, 0.012);
  }

  for (let i = 0; i < accessoryResults.length; i++) {
    const result = accessoryResults[i];
    const accessory = i === 0
      ? { color: config.hairColor }
      : config.accessories?.[i - 1] || { color: config.hairColor };
    for (const mesh of result?.meshes || []) {
      if (mesh.name === '__root__' || (mesh.getTotalVertices?.() || 0) < 4) continue;
      mesh.material = toonMaterial(
        B,
        scene,
        `cast-${styleId}-accessory-${i}-${mesh.name}`,
        accessory.color || config.hairColor,
      );
      setOutline(B, mesh, 0.022);
    }
  }

  return true;
}

async function importHuman(B, scene, styleId, config, visualRoot) {
  const bodyRoot = config.sex === 'female' ? FEMALE_ROOT : MALE_ROOT;
  const bodyFile = config.sex === 'female' ? FEMALE_FILE : MALE_FILE;

  const bodyResult = await B.SceneLoader.ImportMeshAsync('', bodyRoot, bodyFile, scene);
  const accessoryFiles = [
    config.sex === 'female' && styleId === 'hero'
      ? 'hero-hair-buns.glb'
      : config.hair,
    ...(config.accessories || []).map((item) => item.file),
  ].filter(Boolean);

  const accessoryResults = [];
  for (const file of accessoryFiles) {
    const root = styleId === 'hero' ? FEMALE_ROOT : HAIR_ROOT;
    accessoryResults.push(await B.SceneLoader.ImportMeshAsync('', root, file, scene));
  }

  if (!styleHumanResult(B, scene, styleId, config, bodyResult, accessoryResults)) {
    for (const mesh of [
      ...(bodyResult?.meshes || []),
      ...accessoryResults.flatMap((result) => result?.meshes || []),
    ]) mesh?.dispose?.();
    return null;
  }

  const anchor = new B.TransformNode(`cast-rig-${styleId}`, scene);
  anchor.parent = visualRoot;
  anchor.position.set(0, -1.29, 0);
  anchor.scaling.setAll(config.sex === 'female' ? 1.52 : 1.46);

  const bodySceneRoot = importedRoot(bodyResult);
  if (bodySceneRoot) bodySceneRoot.parent = anchor;
  for (const result of accessoryResults) {
    const root = importedRoot(result);
    if (root) root.parent = anchor;
  }

  const pose = makeHumanPoseRig(B, [bodyResult, ...accessoryResults]);

  return {
    kind: 'human',
    anchor,
    bodyResult,
    accessoryResults,
    applyPose: pose.applyPose,
    dispose() {
      anchor.dispose?.(false, true);
    },
  };
}

function setDogMaterials(B, scene, result, config) {
  const materialMap = new Map();
  for (const mesh of result?.meshes || []) {
    const materials = mesh.material?.subMaterials || [mesh.material];
    for (const material of materials) {
      if (!material || materialMap.has(material.uniqueId)) continue;
      materialMap.set(material.uniqueId, material);
      const name = String(material.name || '').toLowerCase();
      let color = config.main;
      if (name.includes('light')) color = config.light;
      else if (name.includes('black') || name.includes('pupil')) color = config.dark;
      else if (name.includes('white')) color = '#fff8e9';
      tintMaterial(B, material, color);
    }
    if (mesh.name === 'ShibaInu') setOutline(B, mesh, 0.026);
  }
}

function animationBySuffix(groups, suffix) {
  return groups.find((group) => String(group.name || '').endsWith('|'+suffix))
    || groups.find((group) => String(group.name || '').includes(suffix));
}

function makeDogPoseRig(result) {
  const groups = result?.animationGroups || [];
  const clips = {
    idle: animationBySuffix(groups, 'Idle'),
    walk: animationBySuffix(groups, 'Walk'),
    gallop: animationBySuffix(groups, 'Gallop'),
    jump: animationBySuffix(groups, 'Gallop_Jump'),
    attack: animationBySuffix(groups, 'Attack'),
    hit: animationBySuffix(groups, 'Idle_HitReact_Left'),
  };
  let state = '';

  const play = (next) => {
    if (!next || state === next) return;
    state = next;
    for (const group of groups) group.stop?.();
    const group = clips[next] || clips.idle;
    group?.start?.(next !== 'attack' && next !== 'hit' && next !== 'jump', 1.0);
  };

  play('idle');

  return {
    applyPose({ speed = 0, punch = 0, recoil = 0, jumpTuck = 0 } = {}) {
      if (punch > 0.18) play('attack');
      else if (recoil > 0.18) play('hit');
      else if (jumpTuck > 0.25) play('jump');
      else if (speed > 4.4) play('gallop');
      else if (speed > 0.45) play('walk');
      else play('idle');
    },
  };
}

function dogBounds(result) {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const mesh of result?.meshes || []) {
    mesh.computeWorldMatrix?.(true);
    const box = mesh.getBoundingInfo?.().boundingBox;
    if (!box) continue;
    minY = Math.min(minY, box.minimumWorld.y);
    maxY = Math.max(maxY, box.maximumWorld.y);
  }
  if (!Number.isFinite(minY) || !Number.isFinite(maxY) || maxY <= minY) {
    return { minY: 0, maxY: 1 };
  }
  return { minY, maxY };
}

export async function mountMulanDogModel(B, scene, visualRoot) {
  if (!B?.SceneLoader?.ImportMeshAsync || !scene || !visualRoot) return null;
  if (!await ensureGltfLoader(B)) return null;

  try {
    const config = CAST_MODELS.mulan;
    const result = await B.SceneLoader.ImportMeshAsync('', DOG_ROOT, DOG_FILE, scene);
    const body = result?.meshes?.find?.((mesh) => mesh.name === 'ShibaInu');
    if (!body) return null;

    setDogMaterials(B, scene, result, config);

    const root = importedRoot(result);
    const anchor = new B.TransformNode('cast-rig-mulan', scene);
    anchor.parent = visualRoot;
    if (root) root.parent = anchor;

    const bounds = dogBounds(result);
    const height = Math.max(0.1, bounds.maxY - bounds.minY);
    const targetHeight = 1.72;
    const scale = targetHeight / height;
    anchor.scaling.setAll(scale);
    anchor.position.y = -1.18 - bounds.minY * scale;

    const collar = B.MeshBuilder.CreateTorus('mulan-rig-collar', {
      diameter: 0.56 / Math.max(scale, 0.001),
      thickness: 0.07 / Math.max(scale, 0.001),
      tessellation: 20,
    }, scene);
    collar.parent = anchor;
    collar.position.set(0, (bounds.minY + height * 0.72), 0.1);
    collar.rotation.x = Math.PI / 2;
    collar.material = toonMaterial(B, scene, 'mulan-rig-collar-mat', config.collar);

    const pose = makeDogPoseRig(result);
    return {
      kind: 'dog',
      anchor,
      result,
      applyPose: pose.applyPose,
      dispose() {
        anchor.dispose?.(false, true);
      },
    };
  } catch {
    return null;
  }
}

export async function mountCastRenderModel(B, scene, visualRoot, styleId) {
  const config = CAST_MODELS[styleId];
  if (!config) return null;
  if (styleId === 'hero') return mountHeroRenderModel(B, scene, visualRoot);
  if (styleId === 'mulan') return mountMulanDogModel(B, scene, visualRoot);
  if (!B?.SceneLoader?.ImportMeshAsync || !scene || !visualRoot) return null;
  if (!await ensureGltfLoader(B)) return null;

  try {
    return await importHuman(B, scene, styleId, config, visualRoot);
  } catch {
    return null;
  }
}
