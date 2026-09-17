export function countdownState(elapsedMs = 0) {
  const elapsed = Math.max(0, Number(elapsedMs) || 0);
  if (elapsed < 1000) return { label: '3', locked: true };
  if (elapsed < 2000) return { label: '2', locked: true };
  if (elapsed < 3000) return { label: '1', locked: true };
  if (elapsed < 3600) return { label: 'FIGHT!', locked: false };
  return { label: '', locked: false };
}

export function edgeDanger(position = {}, arenaSize = {}, warningDistance = 2) {
  const halfX = Math.max(0.001, (Number(arenaSize.x) || 0) / 2);
  const halfZ = Math.max(0.001, (Number(arenaSize.z) || 0) / 2);
  const x = Math.abs(Number(position.x) || 0);
  const z = Math.abs(Number(position.z) || 0);
  const distance = Math.min(halfX - x, halfZ - z);
  if (distance <= 0) return 1;
  if (distance >= warningDistance) return 0;
  return Math.max(0, Math.min(1, 1 - distance / warningDistance));
}

export function fighterPose({
  now = 0,
  speed = 0,
  attackKind = '',
  attackUntil = 0,
  dodgeUntil = 0,
  hitStunUntil = 0,
  knockedDownUntil = 0,
} = {}) {
  const moving = Math.min(1, Math.max(0, (Number(speed) || 0) / 5.2));
  const attacking = Number(attackUntil) > Number(now);
  const dodging = Number(dodgeUntil) > Number(now);
  const stunned = Number(hitStunUntil) > Number(now);
  const knockedDown = Number(knockedDownUntil) > Number(now);
  const idleBob = Math.sin((Number(now) || 0) / 135) * 0.035 * (1 - moving * 0.55);
  return {
    bob: idleBob,
    lean: moving * 0.13,
    punch: attacking ? (attackKind === 'heavy' ? 0.92 : 0.62) : 0,
    squash: knockedDown ? 0.66 : dodging ? 0.72 : 1,
    stretch: knockedDown ? 1.08 : dodging ? 1.18 : 1,
    flop: knockedDown ? 1 : 0,
    flash: stunned ? 0.85 : 0,
  };
}
