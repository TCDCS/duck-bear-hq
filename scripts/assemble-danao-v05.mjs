import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const builds = [
  {
    source: path.join(root, 'scripts/danao-v05-gz/runtime.gz'),
    output: path.join(root, 'public/games/danao/src/game/runtime.js'),
    sha256: 'b803937f6c2f6f8162eaa746301ef7583420f773d3eb39b43353fe4064724209',
  },
  {
    source: path.join(root, 'scripts/danao-v05-gz/visuals.gz'),
    output: path.join(root, 'public/games/danao/src/game/visuals.js'),
    sha256: 'aba427b2c9658e24887e2511f7769425f48c1b19d9a15830d7292642e7963a47',
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

for (const build of builds) {
  if (!fs.existsSync(build.source)) throw new Error(`Missing Danao release source ${path.relative(root, build.source)}`);
  const source = zlib.gunzipSync(fs.readFileSync(build.source));
  const actual = crypto.createHash('sha256').update(source).digest('hex');
  if (actual !== build.sha256) throw new Error(`Danao release hash mismatch for ${path.basename(build.output)}: ${actual}`);
  fs.mkdirSync(path.dirname(build.output), { recursive: true });
  fs.writeFileSync(build.output, source);
  console.log(`assembled ${path.relative(root, build.output)} (${source.length} bytes, ${actual})`);
}
