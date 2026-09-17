import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const workflowPath = path.join(root, '.github/workflows/danao-release.yml');

test('Danao production release uses Unity Build Automation for the exact main commit and uploads through the authenticated Worker route', () => {
  assert.equal(fs.existsSync(workflowPath), true, 'production Danao release workflow must exist');
  const workflow = fs.readFileSync(workflowPath, 'utf8');
  assert.match(workflow, /branches:\s*\[main\]/);
  assert.match(workflow, /if:\s*\$\{\{\s*github\.ref\s*==\s*'refs\/heads\/main'\s*\}\}/);
  assert.match(workflow, /actions:\s*read/);
  assert.match(workflow, /concurrency:[\s\S]*group:\s*danao-production-webgl[\s\S]*cancel-in-progress:\s*true/);
  assert.match(workflow, /TARGET_NAME="Danao WebGL"/);
  assert.match(workflow, /Cancel stale Danao WebGL builds/);
  assert.match(workflow, /-X DELETE[\s\S]*buildtargets\/\$TARGET_ID\/builds/);
  assert.match(workflow, /--arg commit "\$GITHUB_SHA"/);
  assert.match(workflow, /requestedRevision/);
  assert.match(workflow, /lastBuiltRevision/);
  assert.match(workflow, /GITHUB_TOKEN:\s*\$\{\{\s*github\.token\s*\}\}/);
  assert.match(workflow, /\/api\/danao\/release\/health/);
  assert.match(workflow, /\/api\/danao\/release\/\$NAME/);
  assert.match(workflow, /X-Danao-Run-Id:\s*\$GITHUB_RUN_ID/);
  assert.match(workflow, /X-Danao-Commit:\s*\$GITHUB_SHA/);
  assert.doesNotMatch(workflow, /CLOUDFLARE_API_TOKEN/);
  assert.doesNotMatch(workflow, /CLOUDFLARE_ACCOUNT_ID/);
  assert.doesNotMatch(workflow, /wrangler r2 object put/);
  assert.match(workflow, /danao-webgl-production-/);

  const dataIndex=workflow.indexOf('Danao.data Danao.framework.js Danao.wasm Danao.loader.js');
  assert.notEqual(dataIndex,-1,'loader must be uploaded last so it only becomes visible after its dependencies');
});

test('Danao keeps WebGL builds on Windows Micro and enforces conservative cost controls', () => {
  const workflow = fs.readFileSync(workflowPath, 'utf8');
  assert.match(workflow, /DANAO_WINDOWS_MINUTE_GUARD:\s*150/);
  assert.match(workflow, /Configure Danao WebGL for Windows Micro/);
  assert.match(workflow, /\/machinetypes\?operatingSystem=windows/);
  assert.match(workflow, /freeTierEligible/);
  assert.match(workflow, /micro/i);
  assert.match(workflow, /operatingSystemSelected/);
  assert.match(workflow, /machineTypeLabel/);
  assert.match(workflow, /-X PUT[\s\S]*buildtargets\/\$TARGET_ID/);
  assert.match(workflow, /Set Unity concurrency limit to one/);
  assert.match(workflow, /\/orgs\/\$UNITY_UBA_ORG_ID\/concurrency-limit/);
  assert.match(workflow, /'\{\"limit\":1\}'/);
  assert.match(workflow, /if \[ "\$HTTP" = "403" \]/);
  assert.match(workflow, /continuing with GitHub serialization/i);
  assert.match(workflow, /Guard Danao monthly Windows minutes/);
  assert.match(workflow, /billableTimeInSeconds/);
  assert.match(workflow, /operatingSystem/);
  assert.match(workflow, /DANAO_WINDOWS_MINUTE_GUARD/);
});
