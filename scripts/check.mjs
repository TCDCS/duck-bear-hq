import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..'),failures=[];
const required=['src/index.js','src/worker-games.js','src/game-routes.js','src/multiplayer/durable.mjs','migrations/0001_schema.sql','migrations/0002_seed.sql','public/index.html','public/account.html','public/home.js','public/home.css','public/app.js','public/styles.css','public/sw.js','public/manifest.webmanifest','public/_headers','wrangler.jsonc','package.json','src/seagull-simulator/main.ts','public/games/seagull-simulator/index.html','public/games/seagull-simulator/game.css','public/games/seagull-simulator/game.js','public/games/seagull-simulator/icon.svg','public/games/seagull-simulator/release.json'];
for(const file of required)if(!existsSync(resolve(ROOT,file)))failures.push(`Missing ${file}`);
const code=['src/index.js','src/worker-games.js','src/game-routes.js','public/app.js','public/home.js','public/account-navigation.js','public/kart-games.js','public/sw.js','public/games/seagull-simulator/game.js',...readdirSync(resolve(ROOT,'src/multiplayer')).filter(f=>f.endsWith('.mjs')).map(f=>'src/multiplayer/'+f)];
for(const file of code){const r=spawnSync(process.execPath,['--check',resolve(ROOT,file)],{encoding:'utf8'});if(r.status!==0)failures.push(`${file} does not parse: ${r.stderr.trim()}`);}
for(const file of ['package.json','wrangler.jsonc','public/manifest.webmanifest'])try{JSON.parse(readFileSync(resolve(ROOT,file),'utf8'));}catch(e){failures.push(file+': '+e.message);}
try{const db=new DatabaseSync(':memory:');for(const file of readdirSync(resolve(ROOT,'migrations')).filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync(resolve(ROOT,'migrations',file),'utf8'));if(db.prepare('SELECT COUNT(*) AS n FROM products').get().n<10||db.prepare('SELECT COUNT(*) AS n FROM rewards').get().n<5)failures.push('Seed data count is unexpectedly low.');db.close();}catch(e){failures.push('SQLite migration check failed: '+e.message);}
const sw=readFileSync(resolve(ROOT,'public/sw.js'),'utf8');for(const path of ['/api/','/media/','/games/'])if(!sw.includes(`pathname.startsWith('${path}')`))failures.push('Service worker must exclude '+path);
const app=readFileSync(resolve(ROOT,'public/app.js'),'utf8'),actions=new Set([...app.matchAll(/data-action=["']([^"']+)["']/g)].map(m=>m[1]).filter(a=>!a.includes('${'))),dispatcher=app.match(/async function handleAction\(e\)\{([\s\S]*?)\n\s*function openAccount/);
if(!dispatcher)failures.push('Could not locate the original account action dispatcher.');else{const handled=new Set([...dispatcher[1].matchAll(/a===['"]([^'"]+)['"]/g)].map(m=>m[1]));for(const action of actions)if(!handled.has(action))failures.push('Visible account action has no handler: '+action);}
for(const [file,assets] of [['public/index.html',['home.css','home.js','manifest.webmanifest','assets/icon.svg']],['public/account.html',['styles.css','app.js','account-navigation.js']]]){const html=readFileSync(resolve(ROOT,file),'utf8');for(const asset of assets)if(!html.includes(asset))failures.push(file+' does not reference '+asset);}
if(failures.length){console.error('Checks failed:\n- '+failures.join('\n- '));process.exit(1);}
console.log('Public homepage, private account, games, syntax and migration checks passed.');
