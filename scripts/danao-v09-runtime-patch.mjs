const replaceRequired = (source, pattern, replacement, label) => {
  if (!pattern.test(source)) throw new Error(`Danao v0.9 runtime patch marker missing: ${label}`);
  pattern.lastIndex = 0;
  return source.replace(pattern, replacement);
};

export function patchDanaoV09Runtime(source) {
  let out = String(source);

  out = replaceRequired(
    out,
    /import \{ botIntent, botProfileForSlot \} from '\.\/bot\.js';/,
    "import { botIntent, botProfileForSlot } from './bot.js';\nimport { localControlPlan } from './controllers.js';",
    'controller import',
  );

  out = replaceRequired(
    out,
    /if \(fighter\.control\.type === 'hybrid'\) return mergeInput\(readKeyboard\(keys\), readGamepad\(0\)\);/,
    "if (fighter.control.type === 'hybrid') return mergeInput(readKeyboard(keys), readGamepad(fighter.control.index));",
    'hybrid pad index',
  );

  out = replaceRequired(
    out,
    /const pads = globalThis\.navigator\?\.getGamepads\?\.\(\) \|\| \[\];\n\s*fighters = \[\];\n\s*for \(let i = 0; i < total; i\+\+\) \{\n\s*let control;\n\s*if \(i === 0\) control = \{ type: 'hybrid', index: 0 \};\n\s*else if \(pads\[i\]\) control = \{ type: 'gamepad', index: i \};\n\s*else control = \{ type: 'bot' \};\n\s*fighters\.push\(createFighter\(i, currentArena\.spawns\[i\], styles\[i\], control\)\);\n\s*\}/,
    `const pads = globalThis.navigator?.getGamepads?.() || [];
    const controlPlan = localControlPlan(pads, total);
    fighters = [];
    for (let i = 0; i < total; i++) {
      const control = controlPlan[i];
      fighters.push(createFighter(i, currentArena.spawns[i], styles[i], control));
    }`,
    'control plan',
  );

  return out;
}
