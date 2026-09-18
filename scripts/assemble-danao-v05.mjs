import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { patchDanaoV07Visuals } from './danao-v07-visual-patch.mjs';
import { patchDanaoV08Runtime } from './danao-v08-runtime-patch.mjs';
import { patchDanaoV09Runtime } from './danao-v09-runtime-patch.mjs';
import { patchDanaoV09App } from './danao-v09-app-patch.mjs';
import { patchDanaoSupermarketVisuals } from './danao-supermarket-visual-patch.mjs';
import { patchDanaoSupermarketRuntime } from './danao-supermarket-runtime-patch.mjs';
import { patchDanaoRealCharacterVisuals } from './danao-real-character-visual-patch.mjs';
import { patchDanaoRealCharacterRuntime } from './danao-real-character-runtime-patch.mjs';
import { patchDanaoFullCastVisuals } from './danao-full-cast-visual-patch.mjs';
import { patchDanaoFullCastRuntime } from './danao-full-cast-runtime-patch.mjs';

const root = path.resolve(import.meta.dirname, '..');
const builds = [
  {
    partsDir: path.join(root, 'scripts/danao-v05-gz/runtime'),
    output: path.join(root, 'public/games/danao/src/game/runtime.js'),
    sha256: '9480ec01feacdf7972c2ae77817ccebe53304a3d4b7596e74c6e20f285164d88',
    transform: (source) => patchDanaoFullCastRuntime(patchDanaoRealCharacterRuntime(patchDanaoSupermarketRuntime(patchDanaoV09Runtime(patchDanaoV08Runtime(source))))),
  },
  {
    partsDir: path.join(root, 'scripts/danao-v05-gz/visuals'),
    output: path.join(root, 'public/games/danao/src/game/visuals.js'),
    sha256: '06fe6956f08e588e53e86849110db8465ce0014ddb22089229c458fc5cc3fa31',
    transform: (source) => patchDanaoFullCastVisuals(patchDanaoRealCharacterVisuals(patchDanaoSupermarketVisuals(patchDanaoV07Visuals(source)))),
  },
  {
    partsDir: path.join(root, 'scripts/danao-v05-gz/app'),
    output: path.join(root, 'public/games/danao/src/ui/App.js'),
    sha256: '98e729aa045e2094e06272ff91f183a994c069c757e0b46ba51feae7e186fa06',
    transform: patchDanaoV09App,
  },
  {
    partsDir: path.join(root, 'scripts/danao-v05-gz/styles'),
    output: path.join(root, 'public/games/danao/src/styles.css'),
    sha256: 'c97800b4937d5f3b77dd83d4f4fe3166853f1718064a5ebe5191c407fa8bc725',
  },
];

function readReleaseSource(build) {
  let source;
  if (build.partsDir) {
    const names = fs.readdirSync(build.partsDir).filter((name) => name.endsWith('.part')).sort();
    if (!names.length) throw new Error(`No Danao release parts found in ${path.relative(root, build.partsDir)}`);
    const encoded = names.map((name) => fs.readFileSync(path.join(build.partsDir, name), 'utf8').trim()).join('');
    source = zlib.gunzipSync(Buffer.from(encoded, 'base64'));
  } else {
    if (!fs.existsSync(build.source)) throw new Error(`Missing Danao release source ${path.relative(root, build.source)}`);
    source = zlib.gunzipSync(fs.readFileSync(build.source));
  }
  return build.transform ? Buffer.from(build.transform(source.toString('utf8')), 'utf8') : source;
}

for (const build of builds) {
  const source = readReleaseSource(build);
  const actual = crypto.createHash('sha256').update(source).digest('hex');
  if (actual !== build.sha256) throw new Error(`Danao release hash mismatch for ${path.basename(build.output)}: ${actual}`);
  fs.mkdirSync(path.dirname(build.output), { recursive: true });
  fs.writeFileSync(build.output, source);
  console.log(`assembled ${path.relative(root, build.output)} (${source.length} bytes, ${actual})`);
}
