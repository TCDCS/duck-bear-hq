/** Completed data imports are permanent; permissions and sessions are never cached. */
import {importLegacy,importRecentMenuRecipes} from './migrate.mjs';
import {importPrivateHome} from './import-hub.mjs';
import {ensureLibrary} from './library.mjs';
export async function migrate(env,user){
 const ready=await env.DB.prepare("SELECT COUNT(*) AS n FROM hq_meta WHERE key IN ('private-home-imported-v1','legacy-imported-v1','recent-menu-recipes-v1','info-library-v1')").first();
 if(Number(ready?.n)===4)return;
 // Keep existing household guards and idempotent imports on the cold path.
 // Missing or failed imports are retried; no process-global permission cache.
 await importPrivateHome(env,user);
 await importLegacy(env,user);
 await importRecentMenuRecipes(env,user);
 await ensureLibrary(env,user);
}
