import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const configurator=await readFile(new URL('../unity/danao/Assets/Danao/Editor/DanaoProjectConfigurator.cs',import.meta.url),'utf8');

test('Danao persists Universal Renderer data required by its URP asset',()=>{
  assert.match(configurator,/RendererAssetPath\s*=\s*"Assets\/Danao\/Generated\/DanaoUniversalRenderer\.asset"/);
  assert.match(configurator,/LoadBuiltinRendererData\(RendererType\.UniversalRenderer\)/);
  assert.match(configurator,/AssetDatabase\.GetAssetPath\(rendererData\)/);
  assert.match(configurator,/AssetDatabase\.MoveAsset\([^;]*RendererAssetPath\)/s);
  assert.match(configurator,/AssetDatabase\.SaveAssets\(\)/);
});
