const BOT_ATTACK_RANGE = 2.6;

export function botIntent(self, target, random = Math.random) {
  const dx = target.x - self.x;
  const dz = target.z - self.z;
  const distance = Math.hypot(dx, dz);
  const inverse = distance > 0.0001 ? 1 / distance : 0;
  const close = distance <= BOT_ATTACK_RANGE;
  const roll = random();
  return {
    moveX: close ? dx * inverse * 0.25 : dx * inverse,
    moveZ: close ? dz * inverse * 0.25 : dz * inverse,
    jump: false,
    light: close && roll < 0.16,
    heavy: close && roll >= 0.16 && roll < 0.21,
    dodge: close && roll > 0.96,
  };
}
