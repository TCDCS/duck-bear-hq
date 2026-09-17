export function cameraFrameForPoints(points = []) {
  if (!points.length) return { center: { x: 0, z: 0 }, distance: 18 };
  const xs = points.map((p) => p.x);
  const zs = points.map((p) => p.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const spread = Math.max(maxX - minX, maxZ - minZ);
  return {
    center: { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 },
    distance: Math.max(15, 12 + spread * 0.9),
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
