const HERO_BLOCK = /if \(parts\.heroRig\?\.applyPose\) \{[\s\S]*?\n\}/;

export function patchDanaoFullCastRuntime(source) {
  const out = String(source);
  if (!HERO_BLOCK.test(out)) throw new Error('Danao full-cast runtime patch marker missing');
  HERO_BLOCK.lastIndex = 0;

  return out.replace(HERO_BLOCK, (heroBlock) => `${heroBlock}
if (parts.castRig?.applyPose) {
  parts.castRig.applyPose({
    speed: Math.hypot(v.x, v.z),
    stride: pose.stride,
    punch: pose.punch,
    recoil: pose.recoil,
    dodgeLean: pose.dodgeLean,
    jumpTuck: pose.jumpTuck,
    bodyTwist: pose.bodyTwist,
    attackKind: fighter.attackKind,
  });
}`);
}
