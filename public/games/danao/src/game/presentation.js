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

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));
const smooth01 = (value) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

export function fighterPose({
  now = 0,
  speed = 0,
  verticalSpeed = 0,
  grounded = true,
  attackKind = '',
  attackUntil = 0,
  dodgeUntil = 0,
  hitStunUntil = 0,
  knockedDownUntil = 0,
} = {}) {
  const time = Number(now) || 0;
  const moving = clamp01((Number(speed) || 0) / 5.2);
  const attacking = Number(attackUntil) > time;
  const dodging = Number(dodgeUntil) > time;
  const stunned = Number(hitStunUntil) > time;
  const knockedDown = Number(knockedDownUntil) > time;
  const heavy = attackKind === 'heavy';

  const attackDuration = heavy ? 250 : 155;
  const attackProgress = attacking
    ? clamp01(1 - (Number(attackUntil) - time) / attackDuration)
    : 0;
  const attackWindup = attacking && attackProgress < 0.35
    ? smooth01(attackProgress / 0.35)
    : 0;
  const attackReach = attacking && attackProgress >= 0.35 && attackProgress < 0.72
    ? smooth01((attackProgress - 0.35) / 0.22) * (1 - smooth01((attackProgress - 0.57) / 0.15) * 0.18)
    : attacking && attackProgress >= 0.72
      ? 0.82 * (1 - smooth01((attackProgress - 0.72) / 0.28))
      : 0;
  const attackRecovery = attacking && attackProgress > 0.6
    ? smooth01((attackProgress - 0.6) / 0.4)
    : 0;

  const stridePhase = time / 110;
  const stride = moving > 0.02 ? Math.sin(stridePhase) * moving : 0;
  const footLift = moving > 0.02 ? Math.max(0, Math.sin(stridePhase)) * moving : 0;

  const dodgeProgress = dodging
    ? clamp01(1 - (Number(dodgeUntil) - time) / 230)
    : 0;
  const dodgeLean = dodging ? Math.sin(Math.PI * dodgeProgress) * 0.9 : 0;

  const recoil = stunned && !knockedDown
    ? clamp01((Number(hitStunUntil) - time) / 390)
    : 0;
  const airborne = grounded === false;
  const jumpTuck = airborne
    ? clamp01(0.5 + Math.abs(Number(verticalSpeed) || 0) / 12)
    : 0;

  const breath = Math.sin(time / 135);
  const idleBob = breath * 0.035 * (1 - moving * 0.55);
  const runBob = Math.abs(Math.sin(stridePhase)) * 0.045 * moving;
  const bodyTwist = attacking
    ? (heavy ? -0.82 : -0.46) * attackWindup
      + (heavy ? 0.48 : 0.32) * attackReach
      + (heavy ? 0.18 : 0.1) * attackRecovery
    : 0;

  return {
    bob: idleBob + runBob - jumpTuck * 0.035,
    lean: moving * 0.13 + dodgeLean * 0.12 - recoil * 0.1,
    punch: attacking ? clamp01(attackReach + attackWindup * 0.22 + attackRecovery * 0.18) * (heavy ? 1 : 0.76) : 0,
    punchLift: attacking ? clamp01(attackWindup * 0.48 + attackReach * 0.3) * (heavy ? 1 : 0.7) : 0,
    hitTilt: recoil * 0.3,
    squash: knockedDown ? 0.66 : dodging ? 0.72 : airborne ? 0.92 : 1,
    stretch: knockedDown ? 1.08 : dodging ? 1.18 : airborne ? 1.05 : 1,
    flop: knockedDown ? 1 : 0,
    flash: stunned ? 0.68 + recoil * 0.22 : 0,
    stride,
    footLift,
    attackWindup,
    attackReach,
    attackRecovery,
    bodyTwist: Math.max(-1, Math.min(1, bodyTwist)),
    recoil,
    dodgeLean,
    jumpTuck,
  };
}
