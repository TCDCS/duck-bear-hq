// Idempotent integration into the existing Worker. No game files or bindings are removed.
import {readFileSync,writeFileSync} from 'node:fs';
const path='src/worker-games.js';let source=readFileSync(path,'utf8');
if(!source.includes("from './portal/server.mjs'")){
 const marker='export default createGameHandler({assets,fallback:createMangoHandler(original)});';
 if(!source.includes(marker))throw Error('Worker integration point changed; review instead of guessing.');
 source="import {createPortalHandler} from './portal/server.mjs';\nexport {PortalStore} from './portal/store.mjs';\n"+source.replace(marker,'export default createPortalHandler(createGameHandler({assets,fallback:createMangoHandler(original)}));');
 writeFileSync(path,source);
}
const config=JSON.parse(readFileSync('wrangler.jsonc','utf8'));
const bindings=config.durable_objects.bindings;
if(!bindings.some(x=>x.name==='PORTAL'))bindings.push({name:'PORTAL',class_name:'PortalStore'});
else if(!bindings.some(x=>x.name==='PORTAL'&&x.class_name==='PortalStore'))throw Error('PORTAL binding conflict.');
if(!config.migrations.some(x=>x.tag==='our-space-v7-sqlite'))config.migrations.push({tag:'our-space-v7-sqlite',new_sqlite_classes:['PortalStore']});
const routes=['/','/account','/account/*','/our-space','/our-space/*','/settings','/settings/*','/admin','/admin/*','/family-tree','/family-tree/*','/scrapbook','/scrapbook/*','/plans','/plans/*','/image-library','/image-library/*','/shop','/shop/*','/basket','/basket/*','/orders','/orders/*','/points','/points/*','/rewards','/rewards/*','/menus','/menus/*','/games','/games/','/games/favourites/*','/games/together/*','/games/updates/*'];
config.assets.run_worker_first=[...new Set([...config.assets.run_worker_first,...routes])];
config.assets.not_found_handling='404-page';
writeFileSync('wrangler.jsonc',JSON.stringify(config,null,2)+'\n');
// Static asset fetches honour canonical HTML redirects. Fetch the canonical directory.
let server=readFileSync('src/portal/server.mjs','utf8');
if(!server.includes("new URL('/portal/',url)")&&!server.includes("new URL('/portal/index.html',url)"))throw Error('Unexpected portal asset lookup.');
server=server.replace("new URL('/portal/index.html',url)","new URL('/portal/',url)");writeFileSync('src/portal/server.mjs',server);
// Repair a single SVG transcription; verified against the local tested original.
const art='public/portal/friends.svg';writeFileSync(art,readFileSync(art,'utf8').replace('-33 18-41 52-32-9 78m7','-33 18-41 52-32 78m7'));
console.log('Portal integrated. Existing game bindings and migration history retained.');
