import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('account email and recovery metadata use private R2 storage',()=>{
  const source=read('src/index.js');
  assert.match(source,/ACCOUNT_SECURITY_KEY='account-security\/private-v1\.json'/);
  assert.match(source,/env\.MEDIA\.get\(ACCOUNT_SECURITY_KEY\)/);
  assert.match(source,/env\.MEDIA\.put\(ACCOUNT_SECURITY_KEY/);
  assert.match(source,/account\.email_update/);
  assert.match(source,/auth\.recovery_request/);
});

test('forgot password does not reveal whether an email exists',()=>{
  const source=read('src/index.js');
  assert.match(source,/If that email is registered, recovery instructions are now available\./);
  assert.match(source,/if\(!profile\)return apiJson\(generic\)/);
  assert.match(source,/resetTokens/);
  assert.match(source,/token_hash/);
  assert.match(source,/expires_at:new Date\(Date\.now\(\)\+60\*60\*1000\)/);
});

test('registered email login and recovery controls are present in account UI',()=>{
  const app=read('public/app.js');
  assert.match(app,/Username or email/);
  assert.match(app,/Forgot password\?/);
  assert.match(app,/Register email address/);
  assert.match(app,/\/api\/account\/email/);
  assert.match(app,/\/api\/auth\/recovery\/request/);
  assert.match(app,/\/api\/auth\/recovery\/reset/);
});

test('automated recovery email remains optional until a sender is configured',()=>{
  const source=read('src/index.js');
  assert.match(source,/if\(!env\.EMAIL\|\|!env\.PASSWORD_RESET_FROM\)return false/);
  assert.match(source,/env\.EMAIL\.send/);
});
