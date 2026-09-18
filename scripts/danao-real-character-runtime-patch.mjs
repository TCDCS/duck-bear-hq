const STRIDE_BEFORE = "const stride = Math.sin(now / 105) * Math.min(0.7, Math.hypot(v.x, v.z) * 0.11);";
const STRIDE_AFTER = `const stride = Math.sin(now / 105) * Math.min(0.7, Math.hypot(v.x, v.z) * 0.11);
if (parts.heroRig?.applyPose) {
  parts.heroRig.applyPose({
    stride,
    punch: pose.punch,
    recoil: pose.recoil,
    dodgeLean: pose.dodgeLean,
    jumpTuck: pose.jumpTuck,
    bodyTwist: pose.bodyTwist,
    attackKind: fighter.attackKind,
  });
}`;

export function patchDanaoRealCharacterRuntime(source) {
  const out = String(source);
  if (!out.includes(STRIDE_BEFORE)) throw new Error('Danao real-character runtime patch marker missing');
  return out.replace(STRIDE_BEFORE, STRIDE_AFTER);
}
