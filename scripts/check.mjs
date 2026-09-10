import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'src/index.js', 'migrations/0001_schema.sql', 'migrations/0002_seed.sql',
  'public/index.html', 'public/app.js', 'public/styles.css', 'public/sw.js',
  'public/manifest.webmanifest', 'public/_headers', 'wrangler.jsonc', 'package.json'
];
const failures = [];
for (const file of required) if (!existsSync(resolve(ROOT, file))) failures.push(`Missing ${file}`);

for (const file of ['src/index.js', 'public/app.js', 'public/sw.js', 'scripts/provision.mjs']) {
  const r = spawnSync(process.execPath, ['--check', resolve(ROOT, file)], { encoding: 'utf8' });
  if (r.status !== 0) failures.push(`${file} does not parse: ${r.stderr.trim()}`);
}

try { JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')); } catch (e) { failures.push(`package.json: ${e.message}`); }
try { JSON.parse(readFileSync(resolve(ROOT, 'wrangler.jsonc'), 'utf8')); } catch (e) { failures.push(`wrangler.jsonc: ${e.message}`); }
try { JSON.parse(readFileSync(resolve(ROOT, 'public/manifest.webmanifest'), 'utf8')); } catch (e) { failures.push(`manifest: ${e.message}`); }

try {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(resolve(ROOT, 'migrations/0001_schema.sql'), 'utf8'));
  db.exec(readFileSync(resolve(ROOT, 'migrations/0002_seed.sql'), 'utf8'));
  const products = db.prepare('SELECT COUNT(*) AS n FROM products').get().n;
  const rewards = db.prepare('SELECT COUNT(*) AS n FROM rewards').get().n;
  if (products < 10 || rewards < 5) failures.push('Seed data count is unexpectedly low.');
  db.close();
} catch (e) { failures.push(`SQLite migration check failed: ${e.message}`); }

const sw = readFileSync(resolve(ROOT, 'public/sw.js'), 'utf8');
if (!sw.includes("url.pathname.startsWith('/api/')") || !sw.includes("url.pathname.startsWith('/media/')")) failures.push('Service worker is not explicitly excluding private/API routes from caching.');


const appJs = readFileSync(resolve(ROOT, 'public/app.js'), 'utf8');
const actions = new Set([...appJs.matchAll(/data-action=[\"']([^\"']+)[\"']/g)].map(m => m[1]).filter(a => !a.includes('${')));
const dispatcher = appJs.match(/async function handleAction\(e\)\{([\s\S]*?)\n\s*function openAccount/);
if (!dispatcher) failures.push('Could not locate the main data-action dispatcher.');
else {
  const handled = new Set([...dispatcher[1].matchAll(/a===['\"]([^'\"]+)['\"]/g)].map(m => m[1]));
  for (const action of actions) if (!handled.has(action)) failures.push(`Visible data-action has no handler: ${action}`);
}

const html = readFileSync(resolve(ROOT, 'public/index.html'), 'utf8');
for (const asset of ['styles.css', 'app.js', 'manifest.webmanifest', 'assets/icon.svg']) {
  if (!html.includes(asset)) failures.push(`index.html does not reference ${asset}`);
}

if (failures.length) {
  console.error('Checks failed:\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('All Duck & Bear HQ checks passed.');
