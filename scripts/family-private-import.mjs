/** Explicit one-off private import through the established deployment account.
 * Reads an encrypted delivery only. Never log family data or credentials.
 * This script is not a public Worker endpoint and cannot bypass site login.
 */
import {readFile,writeFile} from 'node:fs/promises';
import {privateDecrypt,publicEncrypt,randomBytes,createDecipheriv,createCipheriv,constants} from 'node:crypto';
import {previewFamilyImport,applyFamilyImport} from '../src/hq/family-import.mjs';
const envelope=JSON.parse(await readFile(process.env.FAMILY_ENVELOPE,'utf8'));
const privateKey=await readFile(process.env.FAMILY_PRIVATE_KEY,'utf8');
const key=privateDecrypt({key:privateKey,oaepHash:'sha256',padding:constants.RSA_PKCS1_OAEP_PADDING},Buffer.from(envelope.key,'base64'));
const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(envelope.iv,'base64'));decipher.setAuthTag(Buffer.from(envelope.tag,'base64'));
const payload=JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext,'base64')),decipher.final()]));key.fill(0);
const report={startedAt:new Date().toISOString(),commit:process.env.GITHUB_SHA,ok:false};
async function privateReport(){const k=randomBytes(32),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',k,iv);const ciphertext=Buffer.concat([cipher.update(JSON.stringify(report),'utf8'),cipher.final()]);const encryptedKey=publicEncrypt({key:payload.delivery.reportPublicKey,oaepHash:'sha256',padding:constants.RSA_PKCS1_OAEP_PADDING},k);k.fill(0);await writeFile('family-delivery-result.enc.json',JSON.stringify({version:1,key:encryptedKey.toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64')}));}
class D1 {
 constructor(){this.account=process.env.CLOUDFLARE_ACCOUNT_ID;this.database=process.env.FAMILY_D1_ID;this.token=process.env.CLOUDFLARE_API_TOKEN;if(!this.account||!this.database||!this.token)throw Error('Deployment credentials are missing.');}
 async query(body){const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.account}/d1/database/${this.database}/query`,{method:'POST',headers:{Authorization:'Bearer '+this.token,'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});const data=await response.json();if(!response.ok||!data.success)throw Error('D1 request failed: '+JSON.stringify(data.errors||[]).slice(0,1200));return data.result;}
 prepare(sql){let params=[];const parent=this;return {sql,get params(){return params;},bind(...values){params=values;return this;},async all(){const r=await parent.query({sql,params});return Array.isArray(r)?r[0]:r;},async first(column){const r=await this.all(),row=r.results?.[0]||null;return column?row?.[column]:row;},async run(){return this.all();}};}
 async batch(statements){return this.query({batch:statements.map(s=>({sql:s.sql,params:s.params}))});}
}
try{
 const DB=new D1(),env={DB};
 const owner=await DB.prepare("SELECT u.id,u.role FROM hq_pair p JOIN users u ON u.id=p.user_id WHERE p.role='owner' AND u.active=1").first();
 if(!owner)throw Error('The established active household owner was not found. No bootstrap will be attempted.');
 report.before=(await DB.prepare("SELECT * FROM hq_records WHERE section='family' OR kind='familyPrivate' ORDER BY id").all()).results;
 const options={overwrite:true};const preview=await previewFamilyImport(env,owner,payload,options);report.preview=preview;
 if(preview.conflicts.length)throw Error('Import conflicts require private review.');
 report.applied=await applyFamilyImport(env,owner,payload,{...options,signature:preview.signature});
 report.after=(await DB.prepare("SELECT * FROM hq_records WHERE section='family' OR kind='familyPrivate' ORDER BY id").all()).results;
 const second=await previewFamilyImport(env,owner,payload,options);report.repeatPreview=second;
 if(second.createCount||second.updateCount||second.conflicts.length)throw Error('Repeat import was not idempotent.');
 report.ok=true;console.log(JSON.stringify({ok:true,created:report.applied.created,updated:report.applied.updated,unchanged:report.applied.unchanged,repeatImportChanges:0}));
}catch(e){report.error=String(e.message);console.error('Private import did not complete. Review the encrypted result; no family details were logged.');process.exitCode=1;}
finally{report.finishedAt=new Date().toISOString();await privateReport();}
