const HERO_ASSET_ROOT = '/games/danao/assets/characters/hero/';
const HERO_MODEL_FILE = 'hero-female.gltf';
const HERO_HAIR_FILE = 'hero-hair-buns.glb';

const GLTF_LOADER_URLS = Object.freeze([
  'https://cdn.jsdelivr.net/npm/babylonjs-loaders@9.26.2/babylonjs.loaders.min.js',
  'https://unpkg.com/babylonjs-loaders@9.26.2/babylonjs.loaders.min.js',
]);

const HERO_COLORS = Object.freeze({
  skin: '#efbd9e',
  shirt: '#28b9b2',
  pants: '#eb7b85',
  shoes: '#fff2c8',
  hair: '#303042',
  outline: '#21161e',
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
          const onLoad = () => {
            script.dataset.danaoReady = '1';
            resolve();
          };
          const onError = () => reject(new Error('Babylon glTF loader unavailable.'));
          script.addEventListener?.('load', onLoad, { once: true });
          script.addEventListener?.('error', onError, { once: true });
          if (!existing) globalThis.document.head.appendChild(script);
        });
        if (pluginAvailable(B)) return true;
      } catch {
        // Try the next trusted CDN; the procedural fighter remains as fallback.
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

function setOutline(B, mesh, width = 0.025) {
  if (!mesh) return;
  mesh.renderOutline = true;
  mesh.outlineColor = color3(B, HERO_COLORS.outline);
  mesh.outlineWidth = width;
}

function paintHeroBody(B, scene, body) {
  const positions = body?.getVerticesData?.(B.VertexBuffer.PositionKind);
  if (!positions?.length) return false;

  const palette = Object.fromEntries(
    Object.entries(HERO_COLORS).map(([key, value]) => [key, hexRgb(value)]),
  );
  const colors = new Array((positions.length / 3) * 4);

  for (let vertex = 0; vertex < positions.length / 3; vertex++) {
    const x = positions[vertex * 3];
    const y = positions[vertex * 3 + 1];

    let rgb = palette.shirt;
    if (y > 1.37) rgb = palette.skin;
    else if (Math.abs(x) > 0.64 && y > 0.7) rgb = palette.skin;
    else if (y < 0.16) rgb = palette.shoes;
    else if (y < 0.78) rgb = palette.pants;

    const offset = vertex * 4;
    colors[offset] = rgb[0];
    colors[offset + 1] = rgb[1];
    colors[offset + 2] = rgb[2];
    colors[offset + 3] = 1;
  }

  body.setVerticesData(B.VertexBuffer.ColorKind, colors, false, 4);
  body.useVertexColors = true;
  body.hasVertexAlpha = false;
  body.material = toonMaterial(B, scene, 'hero-toon-body', '#ffffff');
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

function makePoseRig(B, bodyResult, hairResult) {
  const maps = [rigMap(B, bodyResult), rigMap(B, hairResult)];

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
    // The imported rig rests in a T-pose; negative roll drops both arms into a low arcade guard.
    const armDrop = -1.04;

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

function styleImportedMeshes(B, scene, bodyResult, hairResult) {
  const body = bodyResult?.meshes?.find?.((mesh) => mesh.name === 'Superhero_Female');
  const eyes = bodyResult?.meshes?.find?.((mesh) => mesh.name === 'Eyes');
  const eyebrows = bodyResult?.meshes?.find?.((mesh) => mesh.name === 'Eyebrows');
  const hair = hairResult?.meshes?.find?.((mesh) => mesh.name === 'Hair_Buns');

  if (!body) return false;
  paintHeroBody(B, scene, body);

  if (eyebrows) {
    eyebrows.material = toonMaterial(B, scene, 'hero-toon-eyebrows', HERO_COLORS.hair);
    setOutline(B, eyebrows, 0.012);
  }
  if (eyes) setOutline(B, eyes, 0.009);
  if (hair) {
    hair.material = toonMaterial(B, scene, 'hero-toon-hair', HERO_COLORS.hair);
    setOutline(B, hair, 0.024);
  }
  return true;
}

function makeMangoBadge(B, scene, anchor) {
  const badge = B.MeshBuilder.CreateSphere('hero-rig-mango-badge', {
    diameter: 0.16,
    segments: 16,
  }, scene);
  badge.parent = anchor;
  badge.position.set(0, 0.93, 0.17);
  badge.scaling.set(1.08, 1.28, 0.3);
  badge.material = toonMaterial(B, scene, 'hero-rig-mango-badge-mat', '#f4d45d');
  setOutline(B, badge, 0.018);
  return badge;
}

export async function mountHeroRenderModel(B, scene, visualRoot) {
  if (!B?.SceneLoader?.ImportMeshAsync || !scene || !visualRoot) return null;
  if (!await ensureGltfLoader(B)) return null;

  try {
    const bodyResult = await B.SceneLoader.ImportMeshAsync(
      '',
      HERO_ASSET_ROOT,
      HERO_MODEL_FILE,
      scene,
    );
    const hairResult = await B.SceneLoader.ImportMeshAsync(
      '',
      HERO_ASSET_ROOT,
      HERO_HAIR_FILE,
      scene,
    );

    if (!styleImportedMeshes(B, scene, bodyResult, hairResult)) {
      for (const mesh of [...(bodyResult?.meshes || []), ...(hairResult?.meshes || [])]) mesh?.dispose?.();
      return null;
    }

    const anchor = new B.TransformNode('hero-rig-anchor', scene);
    anchor.parent = visualRoot;
    anchor.position.set(0, -1.29, 0);
    anchor.scaling.setAll(1.52);

    const bodyRoot = importedRoot(bodyResult);
    const hairRoot = importedRoot(hairResult);
    if (bodyRoot) bodyRoot.parent = anchor;
    if (hairRoot) hairRoot.parent = anchor;

    makeMangoBadge(B, scene, anchor);
    const poseRig = makePoseRig(B, bodyResult, hairResult);

    return {
      anchor,
      bodyResult,
      hairResult,
      applyPose: poseRig.applyPose,
      dispose() {
        anchor.dispose?.(false, true);
      },
    };
  } catch {
    return null;
  }
}

export const HERO_MODEL_ASSETS = Object.freeze({
  body: HERO_ASSET_ROOT + HERO_MODEL_FILE,
  hair: HERO_ASSET_ROOT + HERO_HAIR_FILE,
});
