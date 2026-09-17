const item = (id, name, options) => Object.freeze({ id, name, carryable: true, ...options });

export const ITEMS = Object.freeze([
  item('chair', 'Folding Chair', { mass: 5.2, damage: 14, knockback: 10.5, range: 1.75, cooldownMs: 560, throwDamageMax: 24, throwScale: 0.72, size: [0.95, 1.25, 0.34], kind: 'chair', breakable: true, hp: 24 }),
  item('pan', 'Frying Pan', { mass: 2.4, damage: 11, knockback: 8.6, range: 1.55, cooldownMs: 430, throwDamageMax: 20, throwScale: 0.62, size: [0.8, 0.14, 0.8], kind: 'pan' }),
  item('baguette', 'Baguette', { mass: 1.1, damage: 7, knockback: 6.5, range: 1.82, cooldownMs: 360, throwDamageMax: 14, throwScale: 0.42, size: [0.22, 0.22, 1.3], kind: 'baguette' }),
  item('mallet', 'Foam Mallet', { mass: 3.1, damage: 13, knockback: 11.5, range: 1.78, cooldownMs: 540, throwDamageMax: 22, throwScale: 0.66, size: [1.0, 0.46, 0.36], kind: 'mallet' }),
  item('bin', 'Bin', { mass: 7.5, damage: 16, knockback: 13.5, range: 1.38, cooldownMs: 690, throwDamageMax: 27, throwScale: 0.8, size: [0.75, 0.95, 0.75], kind: 'bin', breakable: true, hp: 34 }),
  item('cone', 'Traffic Cone', { mass: 1.8, damage: 6, knockback: 7.2, range: 1.48, cooldownMs: 370, throwDamageMax: 15, throwScale: 0.48, size: [0.7, 0.9, 0.7], kind: 'cone' }),
  item('crate', 'Toy Crate', { mass: 6.4, damage: 15, knockback: 12.0, range: 1.34, cooldownMs: 650, throwDamageMax: 26, throwScale: 0.76, size: [0.9, 0.9, 0.9], kind: 'crate', breakable: true, hp: 30 }),
  item('table', 'Wrestling Table', { mass: 10.5, damage: 20, knockback: 16.0, range: 1.65, cooldownMs: 860, throwDamageMax: 30, throwScale: 0.92, size: [1.8, 0.78, 1.05], kind: 'table', breakable: true, hp: 38 }),
]);

const byId = new Map(ITEMS.map((entry) => [entry.id, entry]));
const fallback = Object.freeze({ id: 'fists', name: 'Fists', mass: 1, damage: 7, knockback: 6.5, range: 1.28, cooldownMs: 320, throwDamageMax: 7, throwScale: 0 });

export function getItemDefinition(id) {
  return byId.get(id) ?? fallback;
}

export function heldAttackProfile(itemId) {
  const definition = getItemDefinition(itemId);
  return {
    damage: definition.damage,
    knockback: definition.knockback,
    range: definition.range,
    cooldownMs: definition.cooldownMs,
    itemId: definition.id,
  };
}

export function throwProfile(itemId, speed = 0) {
  const definition = getItemDefinition(itemId);
  const boundedSpeed = Math.max(0, Math.min(30, Number(speed) || 0));
  const damage = Math.min(definition.throwDamageMax, Math.max(4, Math.round(definition.damage * 0.45 + boundedSpeed * definition.throwScale)));
  const knockback = Math.min(18, Math.max(5, definition.knockback * 0.62 + boundedSpeed * 0.28));
  return { damage, knockback, speed: boundedSpeed, itemId: definition.id };
}

export function nearestCarryTarget(origin, direction, targets, range = 2.2) {
  const ox = Number(origin?.x) || 0;
  const oz = Number(origin?.z) || 0;
  let dxDir = Number(direction?.x) || 0;
  let dzDir = Number(direction?.z) || 0;
  const dl = Math.hypot(dxDir, dzDir) || 1;
  dxDir /= dl;
  dzDir /= dl;
  let best = null;
  let bestDistance = Infinity;
  for (const target of targets || []) {
    if (!target?.carryable) continue;
    const dx = (Number(target.x) || 0) - ox;
    const dz = (Number(target.z) || 0) - oz;
    const distance = Math.hypot(dx, dz);
    if (distance < 0.001 || distance > range) continue;
    const facing = (dx / distance) * dxDir + (dz / distance) * dzDir;
    if (facing < 0.28) continue;
    if (distance < bestDistance) {
      best = target;
      bestDistance = distance;
    }
  }
  return best;
}
