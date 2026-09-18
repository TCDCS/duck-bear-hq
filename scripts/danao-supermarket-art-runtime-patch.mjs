const LIGHT_MARKER = "sun.intensity = 1.15;";

export function patchDanaoSupermarketArtRuntime(source) {
  const out = String(source);
  if (!out.includes(LIGHT_MARKER)) throw new Error('Danao supermarket art runtime patch marker missing');
  if (out.includes('TONEMAPPING_ACES')) return out;

  return out.replace(LIGHT_MARKER, `sun.intensity = 1.15;

    if (arena.id === 'ring') {
      scene.ambientColor = new B.Color3(0.30, 0.32, 0.35);
      scene.clearColor = new B.Color4(0.66, 0.72, 0.78, 1);
      hemi.intensity = 0.62;
      hemi.groundColor = new B.Color3(0.16, 0.18, 0.22);
      sun.intensity = 0.58;
      if (scene.imageProcessingConfiguration) {
        scene.imageProcessingConfiguration.toneMappingEnabled = true;
        scene.imageProcessingConfiguration.toneMappingType = B.ImageProcessingConfiguration.TONEMAPPING_ACES;
        scene.imageProcessingConfiguration.exposure = 0.82;
        scene.imageProcessingConfiguration.contrast = 1.18;
      }
    }`);
}
