const IMPORT_LINE = "import { mountHeroRenderModel } from '../art/hero-model.js';\n";

export function patchDanaoRealCharacterVisuals(source) {
  let out = String(source);
  if (!out.includes('mountHeroRenderModel')) out = IMPORT_LINE + out;

  const pattern = /(root\.scaling\.setAll\(1\.08\);\s*)(return root;)/;
  if (!pattern.test(out)) throw new Error('Danao real-character visual patch marker missing');

  out = out.replace(pattern, (match, before, ret) => `${before}if (style.id === 'hero') {
const proceduralHeroMeshes = root.getChildMeshes?.(false)?.filter((mesh) => !mesh.name.includes('-marker')) || [];
mountHeroRenderModel(B, scene, root)
  .then((heroRig) => {
    if (!heroRig) return;
    for (const mesh of proceduralHeroMeshes) mesh.setEnabled?.(false);
    root.metadata.heroRig = heroRig;
  })
  .catch(() => {});
}
${ret}`);

  return out;
}
