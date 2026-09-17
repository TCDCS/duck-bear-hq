import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

test('all Danao build paths emit the uncompressed WebGL filenames used by the launcher and R2 publisher',()=>{
  const build=read('unity/danao/Assets/Danao/Editor/DanaoBuild.cs');
  const cloud=read('unity/danao/Assets/Editor/DanaoCloudBuild.cs');
  const settings=read('unity/danao/Assets/Danao/Editor/DanaoBuildSettings.cs');
  for(const source of [build,cloud,settings]) assert.match(source,/WebGLCompressionFormat\.Disabled/);
  assert.doesNotMatch(build,/WebGLCompressionFormat\.Gzip/);
  assert.doesNotMatch(cloud,/WebGLCompressionFormat\.Gzip/);
});
