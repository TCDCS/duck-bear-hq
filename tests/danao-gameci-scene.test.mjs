import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const config=fs.readFileSync(path.join(root,'unity/danao/Assets/Danao/Editor/DanaoProjectConfigurator.cs'),'utf8');

test('editor initialisation creates and enables a boot scene before GameCI asks Unity to build',()=>{
  assert.match(config,/EditorSceneManager/);
  assert.match(config,/Assets\/Danao\/Generated\/Boot\.unity/);
  assert.match(config,/EditorBuildSettings\.scenes\s*=/);
  assert.match(config,/new EditorBuildSettingsScene\([^,]+,\s*true\)/);
});
