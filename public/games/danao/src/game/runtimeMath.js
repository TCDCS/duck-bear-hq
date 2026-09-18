export function cameraFrameForPoints(points = []) {
  if (!points.length) return { center: { x: 0, z: 0 }, distance: 16 };
  const xs = points.map((p) => p.x);
  const zs = points.map((p) => p.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const spread = Math.max(maxX - minX, maxZ - minZ);
  return {
    center: { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 },
    distance: Math.max(11.8, 9.4 + spread * 0.56),
  };
}

export function movementVector(moveX = 0, moveZ = 0, speed = 1) {
  const length = Math.hypot(moveX, moveZ);
  const scale = length > 1 ? 1 / length : 1;
  return { x: moveX * scale * speed, z: moveZ * scale * speed };
}

export function nearestOpponent(self, fighters = []) {
  let best = null;
  let bestDistance = Infinity;
  for (const fighter of fighters) {
    if (!fighter || fighter.id === self.id || fighter.active === false) continue;
    const distance = Math.hypot((fighter.x ?? 0) - (self.x ?? 0), (fighter.z ?? 0) - (self.z ?? 0));
    if (distance < bestDistance) {
      bestDistance = distance;
      best = fighter;
    }
  }
  return best;
}

export function partyCameraPlacement(frame = { center: { x: 0, z: 0 }, distance: 15 }) {
  const center = frame.center || { x: 0, z: 0 };
  const d = Math.max(8, Number(frame.distance) || 15);
  return {
    x: (Number(center.x) || 0) + d * 0.34,
    y: d * 0.38 + 2.35,
    z: (Number(center.z) || 0) - d * 0.62,
    targetX: Number(center.x) || 0,
    targetY: 1.4,
    targetZ: Number(center.z) || 0,
  };
}
