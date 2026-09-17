import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const buildPath='scripts/build-danao.mjs';
const runtimePath='public/games/danao/babylon-lite.mjs';

test('Danao bundles a narrow Babylon runtime instead of the package root',()=>{
 const build=fs.readFileSync(buildPath,'utf8');
 assert.equal(fs.existsSync(runtimePath),true,'missing browser Babylon runtime shim');
 const runtime=fs.readFileSync(runtimePath,'utf8');
 assert.match(build,/babylon-lite\.mjs/);
 assert.match(build,/onResolve\(\{filter:\/\^@babylonjs\\\/core\$\//);
 assert.doesNotMatch(runtime,/from ['"]@babylonjs\/core['"]/);
 for(const moduleName of ['Engines/engine','scene','Cameras/arcRotateCamera','Lights/hemisphericLight','Lights/directionalLight','Materials/standardMaterial','Meshes/transformNode','Meshes/Builders/boxBuilder','Meshes/Builders/cylinderBuilder','Meshes/Builders/sphereBuilder','Meshes/Builders/capsuleBuilder','Meshes/Builders/torusBuilder']){
  assert.match(runtime,new RegExp(`@babylonjs/core/${moduleName.replaceAll('/','\\/')}\\.js`),`missing narrow Babylon import ${moduleName}`);
 }
 assert.match(runtime,/export const MeshBuilder=/);
});
