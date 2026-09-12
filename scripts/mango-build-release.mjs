import {readdirSync,readFileSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';
const base='public/games/mango-mayhem',hash=x=>createHash('sha256').update(x).digest('hex');
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);
const files=Object.fromEntries(walk(base).filter(p=>!p.endsWith('/release.json')).sort().map(p=>['/'+p.slice(7),hash(readFileSync(p))]));
writeFileSync(base+'/release.json',JSON.stringify({version:'1.0.0',sourceHash:hash(JSON.stringify(files)),files},null,2)+'\n');
const assets={'/games/':'/games/index.html','/games/index.html':'/games/index.html','/games/games.css':'/games/games.css','/games/hub.mjs':'/games/hub.mjs'};
for(const p of walk(base).sort())assets['/'+p.slice(7)]='/'+p.slice(7);assets['/games/mango-mayhem/']='/games/mango-mayhem/index.html';
writeFileSync('src/mango/asset-manifest.mjs','export const ASSETS='+JSON.stringify(assets,null,2)+';\n');
console.log('Mango source hash',hash(JSON.stringify(files)));
