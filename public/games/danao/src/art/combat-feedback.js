const FEEDBACK = Object.freeze({
  'light-hit': Object.freeze({ text: 'POW!', color: '#fff1c7', duration: 460, scale: 0.78, ring: false }),
  'heavy-hit': Object.freeze({ text: 'WHAM!', color: '#ffd34f', duration: 680, scale: 1.12, ring: true }),
  pickup: Object.freeze({ text: 'GOT IT!', color: '#72dfcf', duration: 520, scale: 0.76, ring: false }),
  grab: Object.freeze({ text: 'GRAB!', color: '#7fd8ff', duration: 560, scale: 0.9, ring: false }),
  'prop-throw': Object.freeze({ text: 'WHOOSH!', color: '#a9e8ff', duration: 520, scale: 0.82, ring: false }),
  'fighter-throw': Object.freeze({ text: 'YEET!', color: '#ffb64d', duration: 720, scale: 1.18, ring: true }),
  'prop-break': Object.freeze({ text: 'CRASH!', color: '#ff9a55', duration: 720, scale: 1.08, ring: true }),
  'fall-reset': Object.freeze({ text: 'OOF!', color: '#ffcf78', duration: 580, scale: 0.88, ring: false }),
  ko: Object.freeze({ text: 'K.O.!', color: '#ff5e68', duration: 900, scale: 1.38, ring: true }),
});

const DEFAULT_STYLE = Object.freeze({
  text: 'BAM!',
  color: '#fff1c7',
  duration: 520,
  scale: 0.84,
  ring: false,
});

export function feedbackStyleForEvent(event = {}) {
  const base = FEEDBACK[event.type] || DEFAULT_STYLE;
  return {
    ...base,
    text: String(event.text || base.text).slice(0, 16),
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

function makeTextPlane(B, scene, style) {
  if (!B.DynamicTexture || !B.MeshBuilder?.CreatePlane) return null;

  const texture = new B.DynamicTexture(
    'combat-feedback-texture',
    { width: 768, height: 256 },
    scene,
    true,
  );
  texture.hasAlpha = true;
  texture.drawText(
    style.text,
    null,
    175,
    'bold 110px Arial',
    style.color,
    'transparent',
    true,
    true,
  );

  const mat = new B.StandardMaterial('combat-feedback-text-mat', scene);
  mat.diffuseTexture = texture;
  mat.opacityTexture = texture;
  mat.emissiveColor = color3(B, style.color).scale(0.8);
  mat.specularColor = B.Color3.Black();
  mat.disableLighting = true;
  mat.backFaceCulling = false;

  const plane = B.MeshBuilder.CreatePlane(
    'combat-feedback-text',
    { width: 2.7, height: 0.9 },
    scene,
  );
  plane.material = mat;
  plane.billboardMode = B.Mesh?.BILLBOARDMODE_ALL ?? 7;
  plane.isPickable = false;

  return { plane, mat, texture };
}

function makeShockRing(B, scene, style) {
  if (!style.ring || !B.MeshBuilder?.CreateTorus) return null;
  const mat = new B.StandardMaterial('combat-feedback-ring-mat', scene);
  mat.diffuseColor = color3(B, style.color);
  mat.emissiveColor = color3(B, style.color).scale(0.5);
  mat.specularColor = B.Color3.Black();
  mat.alpha = 0.72;

  const ring = B.MeshBuilder.CreateTorus(
    'combat-feedback-ring',
    { diameter: 1.55, thickness: 0.075, tessellation: 28 },
    scene,
  );
  ring.rotation.x = Math.PI / 2;
  ring.material = mat;
  ring.isPickable = false;
  return { ring, mat };
}

function sceneIsDisposed(scene) {
  return typeof scene?.isDisposed === 'function'
    ? scene.isDisposed()
    : Boolean(scene?.isDisposed);
}

function disposeFeedback(scene, observer, root, textPart, ringPart) {
  if (observer) scene.onBeforeRenderObservable?.remove?.(observer);
  textPart?.texture?.dispose?.();
  textPart?.mat?.dispose?.();
  ringPart?.mat?.dispose?.();
  root?.dispose?.(false, true);
  scene.metadata ||= {};
  scene.metadata.danaoFeedbackActive = Math.max(0, Number(scene.metadata.danaoFeedbackActive || 1) - 1);
}

export function showCombatFeedback(B, scene, event = {}) {
  if (!B || !scene || !B.TransformNode) return false;
  if (sceneIsDisposed(scene)) return false;

  const style = feedbackStyleForEvent(event);
  scene.metadata ||= {};
  const active = Number(scene.metadata.danaoFeedbackActive || 0);
  if (active >= 7 && event.type === 'light-hit') return false;
  if (active >= 10) return false;
  scene.metadata.danaoFeedbackActive = active + 1;

  const root = new B.TransformNode('combat-feedback-root', scene);
  const x = Number(event.x) || 0;
  const y = Number(event.y) || 0;
  const z = Number(event.z) || 0;
  root.position.set(x, y + (event.type === 'ko' ? 1.65 : 1.15), z);

  const textPart = makeTextPlane(B, scene, style);
  if (textPart) {
    textPart.plane.parent = root;
    textPart.plane.scaling.setAll(style.scale);
  }

  const ringPart = makeShockRing(B, scene, style);
  if (ringPart) {
    ringPart.ring.parent = root;
    ringPart.ring.position.y = -0.7;
  }

  const start = performance.now();
  let observer = null;
  const tick = () => {
    if (sceneIsDisposed(scene)) return;
    const progress = Math.max(0, Math.min(1, (performance.now() - start) / style.duration));
    const pop = 0.72 + Math.sin(Math.min(1, progress * 1.7) * Math.PI) * 0.34;
    root.position.y = y + (event.type === 'ko' ? 1.65 : 1.15) + progress * 0.72;

    if (textPart) {
      textPart.plane.scaling.setAll(style.scale * pop);
      textPart.mat.alpha = progress < 0.62 ? 1 : Math.max(0, (1 - progress) / 0.38);
      textPart.plane.rotation.z = Math.sin(progress * Math.PI * 2) * 0.035;
    }
    if (ringPart) {
      const ringScale = 0.65 + progress * 1.45;
      ringPart.ring.scaling.setAll(ringScale);
      ringPart.mat.alpha = Math.max(0, 0.66 * (1 - progress));
    }

    if (progress >= 1) {
      disposeFeedback(scene, observer, root, textPart, ringPart);
    }
  };

  observer = scene.onBeforeRenderObservable?.add?.(tick) || null;
  if (!observer) {
    disposeFeedback(scene, null, root, textPart, ringPart);
    return false;
  }

  const history = globalThis.__DANAO_FEEDBACK_EVENTS
    || (globalThis.__DANAO_FEEDBACK_EVENTS = []);
  history.push({
    type: event.type || 'unknown',
    text: style.text,
    at: Date.now(),
  });
  if (history.length > 40) history.splice(0, history.length - 40);
  return true;
}
