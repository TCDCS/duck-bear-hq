import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const builds = [
  {
    partsDir: path.join(root, 'scripts/danao-v05-gz/runtime'),
    output: path.join(root, 'public/games/danao/src/game/runtime.js'),
    sha256: '921b5438c5defc1f569c1e30a744b43daa52990687f7770020b793f9d3d4ee69',
  },
  {
    partsDir: path.join(root, 'scripts/danao-v05-gz/visuals'),
    output: path.join(root, 'public/games/danao/src/game/visuals.js'),
    sha256: '886d4f23c29db01d8ced5d8232ab506fce1cad318ffc9c762e48315d7dae5cf1',
  },
];

for (const build of builds) {
  const names = fs.readdirSync(build.partsDir).filter((name) => name.endsWith('.part')).sort();
  if (!names.length) throw new Error(`No Danao release parts found in ${build.partsDir}`);
  const encoded = names.map((name) => fs.readFileSync(path.join(build.partsDir, name), 'utf8').trim()).join('');
  const source = zlib.gunzipSync(Buffer.from(encoded, 'base64'));
  const actual = crypto.createHash('sha256').update(source).digest('hex');
  if (actual !== build.sha256) throw new Error(`Danao release hash mismatch for ${path.basename(build.output)}: ${actual}`);
  fs.mkdirSync(path.dirname(build.output), { recursive: true });
  fs.writeFileSync(build.output, source);
  console.log(`assembled ${path.relative(root, build.output)} (${source.length} bytes, ${actual})`);
}
