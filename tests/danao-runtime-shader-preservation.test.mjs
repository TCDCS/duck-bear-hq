import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const buildSettings=await readFile(new URL('../unity/danao/Assets/Danao/Editor/DanaoBuildSettings.cs',import.meta.url),'utf8');
const configurator=await readFile(new URL('../unity/danao/Assets/Danao/Editor/DanaoProjectConfigurator.cs',import.meta.url),'utf8');
const game=await readFile(new URL('../unity/danao/Assets/Danao/Runtime/DanaoGame.cs',import.meta.url),'utf8');
const arena=await readFile(new URL('../unity/danao/Assets/Danao/Runtime/Arenas/ArenaBuilder.cs',import.meta.url),'utf8');

const runtimeShader='Universal Render Pipeline/Lit';

test('Danao preserves the runtime URP shader without compiling every Lit variant',()=>{
  assert.match(game,new RegExp(`Shader\\.Find\\(\\"${runtimeShader.replaceAll('/','\\/')}\\"\\)`));
  assert.match(arena,new RegExp(`Shader\\.Find\\(\\"${runtimeShader.replaceAll('/','\\/')}\\"\\)`));
  assert.match(configurator,/RuntimeMaterialPath\s*=\s*"Assets\/Danao\/Generated\/Resources\/DanaoRuntimeLit\.mat"/);
  assert.match(configurator,/new Material\(shader\)/);
  assert.match(configurator,/AssetDatabase\.CreateAsset\([^;]*RuntimeMaterialPath\)/s);
  assert.doesNotMatch(buildSettings,/m_AlwaysIncludedShaders/);
  assert.doesNotMatch(buildSettings,/EnsureAlwaysIncludedShader/);
});
