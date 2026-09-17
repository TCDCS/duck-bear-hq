import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const builds = [
  {
    source: path.join(root, 'scripts/danao-v05-gz/runtime.gz'),
    output: path.join(root, 'public/games/danao/src/game/runtime.js'),
    sha256: '7e4f433225347badb7e51217792d278f1e1c84734e8d969d2439cb6ac7484d2a',
  },
  {
    partsDir: path.join(root, 'scripts/danao-v05-gz/visuals'),
    output: path.join(root, 'public/games/danao/src/game/visuals.js'),
    sha256: '5b58adde9afeecda68d38436005029e42fc5dbf82fec9a9255246ffdd7c250f3',
  },
  {
    source: path.join(root, 'scripts/danao-v05-gz/App.js.gz'),
    output: path.join(root, 'public/games/danao/src/ui/App.js'),
    sha256: 'c730de0d72c26a484c035b824a03a28c18f372375b403d9258498c454e093053',
  },
  {
    source: path.join(root, 'scripts/danao-v05-gz/styles.css.gz'),
    output: path.join(root, 'public/games/danao/src/styles.css'),
    sha256: '1df1da15140da03a84734fc0ea366abf35592a1c079c65b22a06673be2ad3f1b',
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
