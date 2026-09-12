import {readFileSync,readdirSync,existsSync} from 'node:fs';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {MANGO_ASSETS} from '../src/mango/static.mjs';
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);
const files=[...walk('public/games/mango-mayhem'),...walk('src/mango'),'public/games/hub.mjs'];
for(const f of files.filter(f=>f.endsWith('.mjs'))){const r=spawnSync(process.execPath,['--check',f],{encoding:'utf8'});if(r.status)throw Error(f+': '+r.stderr);}
for(const [url,file] of MANGO_ASSETS)if(!existsSync('public'+file))throw Error('Missing static asset: '+url);
const manifest=JSON.parse(readFileSync('public/games/mango-mayhem/release.json'));for(const [url,sha] of Object.entries(manifest.files)){const actual=createHash('sha256').update(readFileSync('public'+url)).digest('hex');if(actual!==sha)throw Error('Release hash mismatch: '+url);}
for(const f of files)if(/\.(jpg|jpeg)$/i.test(f)||/1000097772|1000097696/.test(readFileSync(f,'utf8')))throw Error('Reference photo must not be published: '+f);
for(const f of files.filter(f=>f.endsWith('.mjs'))){const text=readFileSync(f,'utf8');for(const match of text.matchAll(/from\s+['"]([^'"]+)['"]/g)){if(/^https?:/.test(match[1]))throw Error('Runtime dependencies must be self-hosted.');}}
console.log(`Mango source checks passed: ${files.length} files, ${manifest.sourceHash}`);
