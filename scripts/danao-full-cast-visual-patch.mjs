const IMPORT_LINE = "import { mountCastRenderModel, mountMulanDogModel } from '../art/cast-models.js';\n";

const PRESERVED_ACCESSORY = /stephen-glasses|zachary-sash|gaby-sunglasses|gaby-nose-ring|sara-scarf|mum-collar|dad-glasses/;

export function patchDanaoFullCastVisuals(source) {
  let out = String(source);
  if (!out.includes('mountCastRenderModel')) out = IMPORT_LINE + out;

  const pattern = /(if \(style\.id === 'hero'\) \{[\s\S]*?root\.metadata\.heroRig = heroRig;[\s\S]*?\n\}\n)(return root;)/;
  if (!pattern.test(out)) throw new Error('Danao full-cast visual patch marker missing');

  out = out.replace(pattern, (match, heroBlock, ret) => `${heroBlock}if (style.id !== 'hero') {
const proceduralBaseMeshes = root.getChildMeshes?.(false)?.filter((mesh) => {
  if (mesh.name.includes('-marker')) return false;
  if (style.id !== 'mulan' && PRESERVED_ACCESSORY.test(mesh.name)) return false;
  return true;
}) || [];
const rigPromise = style.id === 'mulan'
  ? mountMulanDogModel(B, scene, root)
  : mountCastRenderModel(B, scene, root, style.id);
rigPromise
  .then((castRig) => {
    if (!castRig) return;
    for (const mesh of proceduralBaseMeshes) mesh.setEnabled?.(false);
    root.metadata.castRig = castRig;
  })
  .catch(() => {});
}
${ret}`);

  return out;
}
