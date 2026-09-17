import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const buildSettings=await readFile(new URL('../unity/danao/Assets/Danao/Editor/DanaoBuildSettings.cs',import.meta.url),'utf8');
const game=await readFile(new URL('../unity/danao/Assets/Danao/Runtime/DanaoGame.cs',import.meta.url),'utf8');
const arena=await readFile(new URL('../unity/danao/Assets/Danao/Runtime/Arenas/ArenaBuilder.cs',import.meta.url),'utf8');

const runtimeShader='Universal Render Pipeline/Lit';

test('Danao build preserves the URP shader used by runtime-created materials',()=>{
  assert.match(game,new RegExp(`Shader\\.Find\\(\\"${runtimeShader.replaceAll('/','\\/')}\\"\\)`));
  assert.match(arena,new RegExp(`Shader\\.Find\\(\\"${runtimeShader.replaceAll('/','\\/')}\\"\\)`));
  assert.match(buildSettings,/GraphicsSettings\.GetGraphicsSettings\(\)/);
  assert.match(buildSettings,/m_AlwaysIncludedShaders/);
  assert.match(buildSettings,/EnsureAlwaysIncludedShader\(\"Universal Render Pipeline\/Lit\"\)/);
});
