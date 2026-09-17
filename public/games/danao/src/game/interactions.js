export function carryAnchorPosition(origin, direction, distance = 1.25, height = 0.85) {
  let dx = Number(direction?.x) || 0;
  let dz = Number(direction?.z) || 0;
  const len = Math.hypot(dx, dz) || 1;
  dx /= len;
  dz /= len;
  return {
    x: (Number(origin?.x) || 0) + dx * distance,
    y: (Number(origin?.y) || 0) + height,
    z: (Number(origin?.z) || 0) + dz * distance,
  };
}

export function clampPlanarVelocity(velocity, maxPlanar = 20) {
  const x = Number(velocity?.x) || 0;
  const y = Number(velocity?.y) || 0;
  const z = Number(velocity?.z) || 0;
  const speed = Math.hypot(x, z);
  const max = Math.max(0.01, Number(maxPlanar) || 20);
  if (speed <= max) return { x, y, z };
  const scale = max / speed;
  return { x: x * scale, y, z: z * scale };
}

export function throwVelocity(direction, baseVelocity = { x: 0, y: 0, z: 0 }, power = 12, maxPlanar = 20) {
  let dx = Number(direction?.x) || 0;
  let dz = Number(direction?.z) || 0;
  const len = Math.hypot(dx, dz) || 1;
  dx /= len;
  dz /= len;
  const p = Math.max(0, Math.min(24, Number(power) || 0));
  const candidate = {
    x: (Number(baseVelocity?.x) || 0) * 0.35 + dx * p,
    y: Math.max(3.8, (Number(baseVelocity?.y) || 0) * 0.2 + p * 0.38),
    z: (Number(baseVelocity?.z) || 0) * 0.35 + dz * p,
  };
  return clampPlanarVelocity(candidate, maxPlanar);
}
