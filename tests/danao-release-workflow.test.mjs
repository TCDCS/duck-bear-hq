import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const workflowPath = path.join(root, '.github/workflows/danao-release.yml');

test('Danao production release uses Unity Build Automation for the exact main commit and publishes current WebGL', () => {
  assert.equal(fs.existsSync(workflowPath), true, 'production Danao release workflow must exist');
  const workflow = fs.readFileSync(workflowPath, 'utf8');
  assert.match(workflow, /branches:\s*\[main\]/);
  assert.match(workflow, /if:\s*\$\{\{\s*github\.ref\s*==\s*'refs\/heads\/main'\s*\}\}/);
  assert.match(workflow, /TARGET_NAME="Danao WebGL"/);
  assert.match(workflow, /--arg commit "\$GITHUB_SHA"/);
  assert.match(workflow, /scmCommitId/);
  assert.match(workflow, /danao\/web\/current\/\$NAME/);
  assert.match(workflow, /danao-webgl-production-/);
});
