import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const scenePath = path.join(root, 'unity/danao/Assets/Danao/Generated/Boot.unity');
const metaPath = `${scenePath}.meta`;
const buildSettingsPath = path.join(root, 'unity/danao/ProjectSettings/EditorBuildSettings.asset');

test('Danao commits a boot scene and build settings so every Unity target has a scene before hooks run', () => {
  assert.equal(fs.existsSync(scenePath), true, 'Boot.unity must be committed');
  assert.equal(fs.existsSync(metaPath), true, 'Boot.unity.meta must be committed');
  assert.equal(fs.existsSync(buildSettingsPath), true, 'EditorBuildSettings.asset must be committed');

  const meta = fs.readFileSync(metaPath, 'utf8');
  const guid = /guid:\s*([0-9a-f]{32})/i.exec(meta)?.[1];
  assert.ok(guid, 'Boot scene meta must contain a Unity GUID');

  const settings = fs.readFileSync(buildSettingsPath, 'utf8');
  assert.match(settings, /path:\s*Assets\/Danao\/Generated\/Boot\.unity/);
  assert.match(settings, new RegExp(`guid:\\s*${guid}`, 'i'));
  assert.match(settings, /enabled:\s*1/);
});
