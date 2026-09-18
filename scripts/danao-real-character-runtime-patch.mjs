export function patchDanaoRealCharacterRuntime(source) {
  const out = String(source);
  const pattern = /(const stride = [^\n]+;\n)(\s*if \(parts\.legs\?\.length === 2\))/;
  if (!pattern.test(out)) throw new Error('Danao real-character runtime patch marker missing');

  return out.replace(pattern, (match, strideLine, legsLine) => `${strideLine}if (parts.heroRig?.applyPose) {
  parts.heroRig.applyPose({
    stride,
    punch: pose.punch,
    recoil: pose.recoil,
    dodgeLean: pose.dodgeLean,
    jumpTuck: pose.jumpTuck,
    bodyTwist: pose.bodyTwist,
    attackKind: fighter.attackKind,
  });
}
${legsLine}`);
}
