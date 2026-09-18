function replaceRequired(source, before, after, label) {
  if (!source.includes(before)) throw new Error('Danao v0.10.6 feedback patch marker missing: ' + label);
  return source.replace(before, after);
}

export function patchDanaoV0106FeedbackRuntime(source) {
  let out = String(source);

  out = replaceRequired(
    out,
    "const onResult = callbacks.onResult || (() => {});",
    "const onResult = callbacks.onResult || (() => {});\n  const onFeedback = callbacks.onFeedback || (() => {});",
    'feedback callback',
  );

  out = replaceRequired(
    out,
    "const tp = target.body.translation();\n    spawnImpact(B, scene, new B.Vector3(tp.x, tp.y + 0.25, tp.z), hard ? '#f6c83f' : '#fff0cf', hard, (value) => { shake = Math.max(shake, value); });",
    "const tp = target.body.translation();\n    onFeedback({ type: hard ? 'heavy-hit' : 'light-hit', x: tp.x, y: tp.y, z: tp.z, targetId: target.id, attackerId: attackerId || null, damage: profile.damage, hard });\n    spawnImpact(B, scene, new B.Vector3(tp.x, tp.y + 0.25, tp.z), hard ? '#f6c83f' : '#fff0cf', hard, (value) => { shake = Math.max(shake, value); });",
    'fighter hit event',
  );

  out = replaceRequired(
    out,
    "setPropCarried(prop, true);\n    audio.grab?.();\n    return true;",
    "setPropCarried(prop, true);\n    audio.grab?.();\n    { const pp = prop.body.translation(); onFeedback({ type: 'pickup', x: pp.x, y: pp.y, z: pp.z, fighterId: fighter.id, propId: prop.id, itemName: prop.definition.name }); }\n    return true;",
    'prop pickup event',
  );

  out = replaceRequired(
    out,
    "prop.throwArmedUntil = now + 1100;\n      audio.throw?.();",
    "prop.throwArmedUntil = now + 1100;\n      audio.throw?.();\n      onFeedback({ type: 'prop-throw', x: anchor.x, y: anchor.y, z: anchor.z, fighterId: fighter.id, propId: prop.id, itemName: prop.definition.name });",
    'prop throw event',
  );

  out = replaceRequired(
    out,
    "hitStopUntil = Math.max(hitStopUntil, now + hitStopDuration(12, true));\n      if (target.health <= 0) knockOut(target, fighter.id, 'THROWN OUT COLD');",
    "hitStopUntil = Math.max(hitStopUntil, now + hitStopDuration(12, true));\n      { const tp = target.body.translation(); onFeedback({ type: 'fighter-throw', x: tp.x, y: tp.y, z: tp.z, fighterId: fighter.id, targetId: target.id }); }\n      if (target.health <= 0) knockOut(target, fighter.id, 'THROWN OUT COLD');",
    'fighter throw event',
  );

  out = replaceRequired(
    out,
    "target.knockedDownUntil = Math.max(target.knockedDownUntil, now + 260);\n      audio.grab?.();\n      return true;",
    "target.knockedDownUntil = Math.max(target.knockedDownUntil, now + 260);\n      audio.grab?.();\n      { const tp = target.body.translation(); onFeedback({ type: 'grab', x: tp.x, y: tp.y, z: tp.z, fighterId: fighter.id, targetId: target.id }); }\n      return true;",
    'fighter grab event',
  );

  out = replaceRequired(
    out,
    "spawnImpact(B, scene, new B.Vector3(p.x, p.y, p.z), '#f2c94c', true, (value) => { shake = Math.max(shake, value); });\n    schedule(() => prop.visual.dispose?.(), 260);",
    "spawnImpact(B, scene, new B.Vector3(p.x, p.y, p.z), '#f2c94c', true, (value) => { shake = Math.max(shake, value); });\n    onFeedback({ type: 'prop-break', x: p.x, y: p.y, z: p.z, propId: prop.id, itemName: prop.definition.name });\n    schedule(() => prop.visual.dispose?.(), 260);",
    'prop break event',
  );

  out = replaceRequired(
    out,
    "fighter.body.setTranslation({ x: fighter.spawn.x, y: fighter.spawn.y + 0.25, z: fighter.spawn.z }, true);\n    fighter.body.setLinvel({ x: 0, y: 0, z: 0 }, true);",
    "fighter.body.setTranslation({ x: fighter.spawn.x, y: fighter.spawn.y + 0.25, z: fighter.spawn.z }, true);\n    fighter.body.setLinvel({ x: 0, y: 0, z: 0 }, true);\n    onFeedback({ type: 'fall-reset', x: fighter.spawn.x, y: fighter.spawn.y + 0.25, z: fighter.spawn.z, fighterId: fighter.id });",
    'fall reset event',
  );

  out = replaceRequired(
    out,
    "if (scorer) scorer.score += 1;\n    audio.ringOut();",
    "if (scorer) scorer.score += 1;\n    { const kp = victim.body.translation(); onFeedback({ type: 'ko', x: kp.x, y: kp.y, z: kp.z, fighterId: victim.id, attackerId: scorerId || null }); }\n    audio.ringOut();",
    'knockout event',
  );

  return out;
}
