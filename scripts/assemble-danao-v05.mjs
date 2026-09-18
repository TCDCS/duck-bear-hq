import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { patchDanaoV07Visuals } from './danao-v07-visual-patch.mjs';
import { patchDanaoV08Runtime } from './danao-v08-runtime-patch.mjs';
import { patchDanaoV09Runtime } from './danao-v09-runtime-patch.mjs';

const root = path.resolve(import.meta.dirname, '..');
const builds = [
  {
    partsDir: path.join(root, 'scripts/danao-v05-gz/runtime'),
    output: path.join(root, 'public/games/danao/src/game/runtime.js'),
    sha256: '5c39cd73da0c5cfb8ad749c6371008991b7b8b94b63cc239fdc9f533747cf5f5',
    transform: (source) => patchDanaoV09Runtime(patchDanaoV08Runtime(source)),
  },
  {
    partsDir: path.join(root, 'scripts/danao-v05-gz/visuals'),
    output: path.join(root, 'public/games/danao/src/game/visuals.js'),
    sha256: '38344470446870e174188d8c2b260042199b1cd41fab96f6b00bf9bbfe752a57',
    transform: patchDanaoV07Visuals,
  },
  {
    partsDir: path.join(root, 'scripts/danao-v05-gz/app'),
    output: path.join(root, 'public/games/danao/src/ui/App.js'),
    sha256: '02732a964fb06df125aea06e20d734507c460dd61521f84fd83f1646a9215268',
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
