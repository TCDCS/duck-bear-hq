import {build} from 'esbuild';
import {rm,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const outdir=path.join(root,'public/games/danao/build');
await rm(outdir,{recursive:true,force:true});
await mkdir(outdir,{recursive:true});

await build({
  absWorkingDir:root,
  entryPoints:{game:'public/games/danao/game.mjs'},
  outdir,
  bundle:true,
  splitting:true,
  format:'esm',
  platform:'browser',
  target:['es2022'],
  minify:true,
  sourcemap:false,
  legalComments:'none',
  entryNames:'[name]',
  chunkNames:'chunks/[name]-[hash]',
  assetNames:'assets/[name]-[hash]',
  define:{'process.env.NODE_ENV':'"production"'},
  logLevel:'info'
});
