import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

test('Danao actually configures Universal Render Pipeline instead of only installing the package',()=>{
  const config=read('unity/danao/Assets/Danao/Editor/DanaoProjectConfigurator.cs');
  assert.match(config,/UnityEngine\.Rendering\.Universal/);
  assert.match(config,/UniversalRenderPipelineAsset\.Create\s*\(/);
  assert.match(config,/GraphicsSettings\.defaultRenderPipeline\s*=/);
  assert.match(config,/QualitySettings\.renderPipeline\s*=/);
  assert.match(config,/Assets\/Danao\/Generated\/DanaoURP\.asset/);
});
