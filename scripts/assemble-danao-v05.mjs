import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const builds = [
  {
    partsDir: path.join(root, 'scripts/danao-v05-gz/runtime'),
    output: path.join(root, 'public/games/danao/src/game/runtime.js'),
    sha256: '7ac94b21b034514a5ffb9b447d3b38dbd64b008e71e89352bec1a0359f998df4',
  },
  {
    partsDir: path.join(root, 'scripts/danao-v05-gz/visuals'),
    output: path.join(root, 'public/games/danao/src/game/visuals.js'),
    sha256: 'f722361e63c82936ca2e17d9b65b8059d4d042892e9fb4eda05d3181d1c55be2',
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
  if (build.partsDir) {
    const names = fs.readdirSync(build.partsDir).filter((name) => name.endsWith('.part')).sort();
    if (!names.length) throw new Error(`No Danao release parts found in ${path.relative(root, build.partsDir)}`);
    const encoded = names.map((name) => fs.readFileSync(path.join(build.partsDir, name), 'utf8').trim()).join('');
    return zlib.gunzipSync(Buffer.from(encoded, 'base64'));
  }
  if (!fs.existsSync(build.source)) throw new Error(`Missing Danao release source ${path.relative(root, build.source)}`);
  return zlib.gunzipSync(fs.readFileSync(build.source));
}

for (const build of builds) {
  const source = readReleaseSource(build);
  const actual = crypto.createHash('sha256').update(source).digest('hex');
  if (actual !== build.sha256) throw new Error(`Danao release hash mismatch for ${path.basename(build.output)}: ${actual}`);
  fs.mkdirSync(path.dirname(build.output), { recursive: true });
  fs.writeFileSync(build.output, source);
  console.log(`assembled ${path.relative(root, build.output)} (${source.length} bytes, ${actual})`);
}
