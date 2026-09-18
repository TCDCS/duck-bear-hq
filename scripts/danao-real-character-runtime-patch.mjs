const PARTS_BEFORE = "const parts = fighter.visual.metadata || {};";
const PARTS_AFTER = `const parts = fighter.visual.metadata || {};
if (parts.heroRig?.applyPose) {
  parts.heroRig.applyPose({
    stride: pose.stride,
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
  if (!out.includes(PARTS_BEFORE)) throw new Error('Danao real-character runtime patch marker missing');
  return out.replace(PARTS_BEFORE, PARTS_AFTER);
}
