const replaceRegexRequired = (source, pattern, replacement, label) => {
  if (!pattern.test(source)) throw new Error(`Danao v0.8 runtime patch marker missing: ${label}`);
  pattern.lastIndex = 0;
  return source.replace(pattern, replacement);
};

const BOT_BLOCK = `if (fighter.control.type === 'bot') {
      const selfPos = fighterPosition(fighter);
      const now = performance.now();
      const target = nearestOpponent({ id: fighter.id, x: selfPos.x, z: selfPos.z, active: fighter.active }, fighters.map((other) => {
        const p = fighterPosition(other);
        return {
          id: other.id,
          x: p.x,
          z: p.z,
          active: other.active,
          knockedDown: other.knockedDownUntil > now,
        };
      }));
      if (!target) return neutralInput();
      return botIntent(selfPos, target, {
        arenaSize: currentArena.size,
        hazards: hazards.map((hazard) => ({ x: hazard.x, z: hazard.z, radius: hazard.radius })),
        props: props.map((prop) => {
          const p = propPosition(prop);
          return {
            id: prop.id,
            itemId: prop.definition.id,
            x: p.x,
            z: p.z,
            carryable: !prop.broken && !prop.holderId,
          };
        }),
        heldProp: Boolean(fighter.heldPropId),
        holdingFighter: Boolean(fighter.grabbedFighterId),
        targetKnockedDown: target.knockedDown,
        profile: fighter.botProfile,
      }, Math.random);
    }`;

export function patchDanaoV08Runtime(source) {
  let out = String(source);

  out = replaceRegexRequired(
    out,
    /import \{ botIntent \} from '\.\/bot\.js';/,
    "import { botIntent, botProfileForSlot } from './bot.js';",
    'bot import',
  );

  out = replaceRegexRequired(
    out,
    /(\n\s*style,\n)(\s*)control,\n(\s*)body,/,
    (match, styleLine, indent) => `${styleLine}${indent}control,\n${indent}botProfile: control.type === 'bot' ? botProfileForSlot(slot) : null,\n${indent}body,`,
    'fighter bot profile',
  );

  out = replaceRegexRequired(
    out,
    /if \(fighter\.control\.type === 'bot'\) \{[\s\S]*?return botIntent\(selfPos, target, Math\.random\);\n\s*\}/,
    BOT_BLOCK,
    'bot input block',
  );

  out = replaceRegexRequired(
    out,
    /\n\s*if \(fighter\.control\.type === 'bot' && !fighter\.heldPropId && !fighter\.grabbedFighterId && Math\.random\(\) < 0\.012\) performGrab\(fighter, now\);/,
    '',
    'legacy random grab',
  );

  return out;
}
