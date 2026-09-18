const replaceRequired = (source, before, after, label) => {
  if (!source.includes(before)) throw new Error(`Danao v0.7 visual patch marker missing: ${label}`);
  return source.replace(before, after);
};

const CROWD_BEFORE = "          head.position.set(x, 1.28 + row * 0.5, z + facing * row * 0.62);\n          head.material = creamMat;\n          body.rotation.y = i * 0.37;\n";
const CROWD_AFTER = "          head.position.set(x, 1.28 + row * 0.5, z + facing * row * 0.62);\n          head.material = creamMat;\n          body.rotation.y = i * 0.37;\n          if ((i + row) % 4 === 0) {\n            const arm = cylinder('crowd-cheer-arm', { height: 0.62, diameter: 0.09, tessellation: 7 },\n              [x + (i % 2 ? 0.22 : -0.22), 1.38 + row * 0.5, z + facing * row * 0.62],\n              crowdMats[(i + row * 2) % crowdMats.length], [0, 0, i % 2 ? -0.72 : 0.72], false);\n            arm.rotation.x = facing * 0.16;\n          }\n";
const COURTYARD_BEFORE = "      gong.position.set(0, 2.3, 7.15);\n      gong.rotation.x = Math.PI / 2;\n      gong.material = accentMat;\n";
const COURTYARD_AFTER = "      gong.position.set(0, 2.3, 7.15);\n      gong.rotation.x = Math.PI / 2;\n      gong.material = accentMat;\n\n      for (const z of [-5.8, 0, 5.8]) {\n        box('courtyard-lantern-string', [12.6, 0.045, 0.045], [0, 4.15, z], darkMat, null, false);\n        for (const x of [-5.4, -3.6, -1.8, 0, 1.8, 3.6, 5.4]) {\n          const hanging = B.MeshBuilder.CreateSphere('courtyard-string-lantern', { diameter: 0.42, segments: 8 }, scene);\n          hanging.position.set(x, 3.88, z);\n          hanging.scaling.y = 1.18;\n          hanging.material = redMat;\n        }\n      }\n      for (const x of [-5.9, 5.9]) {\n        const drum = cylinder('courtyard-drum', { height: 1.05, diameter: 1.25, tessellation: 16 },\n          [x, 0.64, 5.7], redMat, [Math.PI / 2, 0, 0]);\n        drum.rotation.z = x < 0 ? 0.08 : -0.08;\n        cylinder('courtyard-drum-rim', { height: 0.08, diameter: 1.36, tessellation: 16 },\n          [x, 0.64, 5.15], accentMat, [Math.PI / 2, 0, 0]);\n      }\n      for (const z of [-9.0, 9.0]) {\n        box('courtyard-roof-silhouette', [20.5, 0.32, 2.2], [0, 3.15, z], darkMat, [0.08 * Math.sign(z), 0, 0], false);\n      }\n";
const ROOF_BEFORE = "      sign('roof-neon-a', '茶楼', [-7.4, 2.6, 0], [3.4, 1.1], Math.PI / 2, '#b22631', '#f7d75b');\n      sign('roof-neon-b', '夜市', [7.4, 2.2, -1.8], [3.0, 1.0], -Math.PI / 2, '#224a63', '#f2d25a');\n";
const ROOF_AFTER = "      sign('roof-neon-a', '茶楼', [-7.4, 2.6, 0], [3.4, 1.1], Math.PI / 2, '#b22631', '#f7d75b');\n      sign('roof-neon-b', '夜市', [7.4, 2.2, -1.8], [3.0, 1.0], -Math.PI / 2, '#224a63', '#f2d25a');\n      for (const [x, z, h] of [[-4.8, -1.8, 0.9], [4.6, 1.6, 1.1], [1.9, -4.4, 0.72]]) {\n        box('roof-vent', [1.15, h, 1.05], [x, h / 2, z], steelMat);\n        cylinder('roof-vent-cap', { height: 0.18, diameter: 1.3, tessellation: 10 }, [x, h + 0.08, z], darkMat);\n      }\n      for (const x of [-2.8, 2.8]) {\n        cylinder('roof-antenna-post', { height: 3.1, diameter: 0.08, tessellation: 6 }, [x, 1.55, -5.2], darkMat, null, false);\n      }\n      box('roof-clothesline', [5.7, 0.04, 0.04], [0, 2.6, -5.2], darkMat, null, false);\n      sign('roof-hanging-sign', '茶', [0, 2.05, -5.08], [1.15, 1.35], Math.PI, '#9e2830', '#f6d35a');\n";

export function patchDanaoV07Visuals(source) {
  let out = String(source);
  out = replaceRequired(out, CROWD_BEFORE, CROWD_AFTER, 'crowd');
  out = replaceRequired(out, COURTYARD_BEFORE, COURTYARD_AFTER, 'courtyard');
  out = replaceRequired(out, ROOF_BEFORE, ROOF_AFTER, 'rooftop');
  return out;
}
