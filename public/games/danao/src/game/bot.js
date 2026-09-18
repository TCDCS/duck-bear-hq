const BOT_ATTACK_RANGE = 2.6;
const EDGE_MARGIN = 2.05;
const HAZARD_MARGIN = 1.15;

const PROFILES = Object.freeze([
  Object.freeze({ id: 'bruiser', aggression: 0.9, itemBias: 0.28, dodgeBias: 0.38 }),
  Object.freeze({ id: 'scavenger', aggression: 0.56, itemBias: 0.96, dodgeBias: 0.46 }),
  Object.freeze({ id: 'trickster', aggression: 0.72, itemBias: 0.62, dodgeBias: 0.9 }),
]);

const DEFAULT_PROFILE = Object.freeze({ aggression: 0.68, itemBias: 0.52, dodgeBias: 0.5 });

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

function unit(x = 0, z = 0) {
  const length = Math.hypot(x, z);
  if (length < 0.0001) return { x: 0, z: 0, distance: 0 };
  return { x: x / length, z: z / length, distance: length };
}

function idle(moveX = 0, moveZ = 0, extras = {}) {
  return {
    moveX,
    moveZ,
    jump: false,
    light: false,
    heavy: false,
    grab: false,
    dodge: false,
    ...extras,
  };
}

function itemValue(itemId = '') {
  if (itemId === 'table') return 1.35;
  if (itemId === 'bin' || itemId === 'chair') return 1.2;
  if (itemId === 'mallet' || itemId === 'crate') return 1.05;
  if (itemId === 'pan') return 0.95;
  if (itemId === 'cone') return 0.72;
  if (itemId === 'baguette') return 0.66;
  return 0.8;
}

function safestMove(self, context) {
  const arena = context?.arenaSize || {};
  const halfX = Math.max(0, (Number(arena.x) || 0) / 2);
  const halfZ = Math.max(0, (Number(arena.z) || 0) / 2);
  let x = 0;
  let z = 0;
  let danger = false;

  if (halfX > 0) {
    const edgeX = halfX - Math.abs(Number(self?.x) || 0);
    if (edgeX < EDGE_MARGIN) {
      x -= Math.sign(Number(self?.x) || 1) * (EDGE_MARGIN - edgeX + 0.35);
      danger = true;
    }
  }
  if (halfZ > 0) {
    const edgeZ = halfZ - Math.abs(Number(self?.z) || 0);
    if (edgeZ < EDGE_MARGIN) {
      z -= Math.sign(Number(self?.z) || 1) * (EDGE_MARGIN - edgeZ + 0.35);
      danger = true;
    }
  }

  for (const hazard of context?.hazards || []) {
    const dx = (Number(self?.x) || 0) - (Number(hazard?.x) || 0);
    const dz = (Number(self?.z) || 0) - (Number(hazard?.z) || 0);
    const away = unit(dx, dz);
    const radius = Math.max(0, Number(hazard?.radius) || 0) + HAZARD_MARGIN;
    if (away.distance < radius) {
      const weight = Math.max(0.45, radius - away.distance + 0.35);
      x += (away.x || 1) * weight;
      z += away.z * weight;
      danger = true;
    }
  }

  if (!danger) return null;
  const move = unit(x, z);
  return { x: move.x, z: move.z };
}

function bestProp(self, props = []) {
  let best = null;
  let bestScore = -Infinity;
  for (const prop of props) {
    if (!prop?.carryable) continue;
    const dx = (Number(prop.x) || 0) - (Number(self?.x) || 0);
    const dz = (Number(prop.z) || 0) - (Number(self?.z) || 0);
    const direction = unit(dx, dz);
    if (direction.distance < 0.001) continue;
    const value = Math.max(0.2, Number(prop.value) || itemValue(prop.itemId || prop.id));
    const score = value * 2.2 - direction.distance * 0.34;
    if (score > bestScore) {
      bestScore = score;
      best = { ...prop, direction, value };
    }
  }
  return best;
}

export function botProfileForSlot(slot = 1) {
  const index = Math.abs((Math.trunc(Number(slot) || 1) - 1) % PROFILES.length);
  return PROFILES[index];
}

export function botIntent(self, target, contextOrRandom, maybeRandom = Math.random) {
  const legacyRandom = typeof contextOrRandom === 'function' ? contextOrRandom : null;
  const context = legacyRandom || !contextOrRandom ? {} : contextOrRandom;
  const random = legacyRandom || (typeof maybeRandom === 'function' ? maybeRandom : Math.random);
  const profile = { ...DEFAULT_PROFILE, ...(context.profile || {}) };
  profile.aggression = clamp01(profile.aggression);
  profile.itemBias = clamp01(profile.itemBias);
  profile.dodgeBias = clamp01(profile.dodgeBias);

  const roll = clamp01(random());
  const safe = safestMove(self, context);
  if (safe) {
    return idle(safe.x, safe.z, {
      dodge: roll < 0.08 * profile.dodgeBias,
    });
  }

  const toward = unit(
    (Number(target?.x) || 0) - (Number(self?.x) || 0),
    (Number(target?.z) || 0) - (Number(self?.z) || 0),
  );
  if (toward.distance < 0.001) return idle();

  if (context.heldProp || context.holdingFighter) {
    const throwWindow = toward.distance >= 2.05 && toward.distance <= 6.4;
    const throwChance = 0.2 + profile.itemBias * 0.42 + profile.aggression * 0.08;
    if (throwWindow && roll < throwChance) {
      return idle(toward.x * 0.45, toward.z * 0.45, { grab: true });
    }
  }

  if (context.targetKnockedDown && toward.distance <= 1.32) {
    const grabChance = 0.14 + profile.aggression * 0.24 + profile.itemBias * 0.08;
    if (roll < grabChance) return idle(toward.x * 0.16, toward.z * 0.16, { grab: true });
  }

  if (!context.heldProp && !context.holdingFighter) {
    const prop = bestProp(self, context.props);
    const seekRadius = 2.4 + profile.itemBias * 4.0;
    const shouldSeek = prop
      && prop.direction.distance <= seekRadius
      && (toward.distance > 2.35 || profile.itemBias > profile.aggression + 0.12);
    if (shouldSeek) {
      const pickupChance = 0.26 + profile.itemBias * 0.54;
      const grab = prop.direction.distance <= 1.18 && roll < pickupChance;
      return idle(prop.direction.x, prop.direction.z, { grab });
    }
  }

  const close = toward.distance <= BOT_ATTACK_RANGE;
  const moveScale = close ? 0.18 + (1 - profile.aggression) * 0.14 : 1;
  const attackChance = close ? 0.1 + profile.aggression * 0.28 : 0;
  const heavyChance = close ? 0.035 + profile.aggression * 0.055 : 0;
  const dodgeThreshold = 1 - (0.018 + profile.dodgeBias * 0.075);

  if (close && roll < heavyChance) {
    return idle(toward.x * moveScale, toward.z * moveScale, { heavy: true });
  }
  if (close && roll < attackChance) {
    return idle(toward.x * moveScale, toward.z * moveScale, { light: true });
  }
  if (close && roll > dodgeThreshold) {
    return idle(-toward.z * 0.72, toward.x * 0.72, { dodge: true });
  }
  return idle(toward.x * moveScale, toward.z * moveScale);
}
