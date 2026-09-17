import {build} from 'esbuild';
import {rm,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const outdir=path.join(root,'public/games/danao/build');
const babylonLite=path.join(root,'public/games/danao/babylon-lite.mjs');
const MAX_BABYLON_BYTES=800*1024;
const MAX_OUTPUT_FILES=100;
const danaoBabylonLite={
  name:'danao-babylon-lite',
  setup(bundle){
    bundle.onResolve({filter:/^@babylonjs\/core$/},()=>({path:babylonLite}));
  }
};

await rm(outdir,{recursive:true,force:true});
await mkdir(outdir,{recursive:true});

const result=await build({
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
  plugins:[danaoBabylonLite],
  metafile:true,
  logLevel:'info'
});

const outputs=Object.entries(result.metafile.outputs);
const babylonOutput=outputs.find(([name])=>path.basename(name).startsWith('babylon-lite-'));
if(!babylonOutput)throw new Error('Danao build did not emit the narrow Babylon runtime chunk.');
if(babylonOutput[1].bytes>MAX_BABYLON_BYTES){
  throw new Error(`Danao Babylon runtime exceeded ${MAX_BABYLON_BYTES} bytes: ${babylonOutput[1].bytes}.`);
}
if(outputs.length>MAX_OUTPUT_FILES){
  throw new Error(`Danao build emitted ${outputs.length} files; budget is ${MAX_OUTPUT_FILES}. Check for accidental Babylon package-root imports.`);
}
console.log(`Danao bundle budget OK: Babylon ${babylonOutput[1].bytes} bytes, ${outputs.length} output files.`);
