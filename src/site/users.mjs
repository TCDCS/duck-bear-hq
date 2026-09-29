import {body,fail,json,newId,now,required,requireOwner,siteAccess,text,audit} from './core.mjs';
export async function usersRoute(request,env,user,parts,helpers){
 await requireOwner(env,user);const targetId=parts[1];
 if(request.method==='GET'&&!targetId){
 const users=(await env.DB.prepare("SELECT u.id,u.username,u.display_name,u.role,u.active,u.created_at,u.updated_at,o.slot FROM users u LEFT JOIN site_owners o ON o.user_id=u.id ORDER BY u.created_at,u.id").all()).results;
 const permissions=(await env.DB.prepare('SELECT user_id,section,level FROM site_permissions').all()).results;
 return json({users:users.map(u=>({...u,permissions:Object.fromEntries(permissions.filter(p=>p.user_id===u.id).map(p=>[p.section,p.level]))}))});
 }
 const b=await body(request);
 if(b.role!==undefined||b.scrapbook!==undefined||b.owner!==undefined)fail(400,'Roles and private ownership cannot be set through this form.');
 if(request.method==='POST'&&!targetId){
 const username=required(b.username,30,'Username');if(!/^[A-Za-z0-9_.-]{3,30}$/.test(username))fail(400,'Username must be 3–30 letters, numbers, dots, underscores or hyphens.');
 const displayName=required(b.displayName,100,'Display name'),password=b.password;if(typeof password!=='string'||password.length<12||password.length>128)fail(400,'Use a temporary password of 12–128 characters.');
 if(await env.DB.prepare('SELECT id FROM users WHERE username=? COLLATE NOCASE').bind(username).first())fail(409,'That username is already in use.');
 const hash=await helpers.hashPassword(password),id=newId('usr'),t=now();
 await env.DB.prepare('INSERT INTO users(id,username,display_name,role,password_hash,password_salt,password_iterations,active,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,username,displayName,'member',hash.hash,hash.salt,hash.iterations,1,t,t).run();
 await audit(env,helpers,user,'user.create',id);return json({user:{id,username,display_name:displayName,active:1,updated_at:t}},201);
 }
 if(!targetId||!['PATCH','DELETE'].includes(request.method))fail(405,'This action is not supported.');
 const target=await env.DB.prepare('SELECT id,username,display_name,active,updated_at FROM users WHERE id=?').bind(targetId).first();if(!target)fail(404,'User not found.');
 const protectedOwner=await env.DB.prepare('SELECT slot FROM site_owners WHERE user_id=?').bind(targetId).first();
 if(protectedOwner&&(request.method==='DELETE'||b.active===false))fail(409,'The owner and partner accounts are protected.');
 if(b.updatedAt!==target.updated_at)fail(409,'This account changed. Reload it before saving.');
 const t=now(target.updated_at);
 if(request.method==='DELETE'){
 const hash=await helpers.hashPassword(crypto.randomUUID()+crypto.randomUUID());
 const results=await env.DB.batch([
 env.DB.prepare('UPDATE users SET username=?,display_name=?,active=0,password_hash=?,password_salt=?,password_iterations=?,updated_at=? WHERE id=? AND updated_at=?').bind('deleted_'+crypto.randomUUID().replaceAll('-',''),'Deleted account',hash.hash,hash.salt,hash.iterations,t,targetId,target.updated_at),
 env.DB.prepare('DELETE FROM sessions WHERE user_id=? AND EXISTS (SELECT 1 FROM users WHERE id=? AND updated_at=?)').bind(targetId,targetId,t),env.DB.prepare('DELETE FROM site_permissions WHERE user_id=? AND EXISTS (SELECT 1 FROM users WHERE id=? AND updated_at=?)').bind(targetId,targetId,t),env.DB.prepare('DELETE FROM site_legacy_users WHERE user_id=? AND EXISTS (SELECT 1 FROM users WHERE id=? AND updated_at=?)').bind(targetId,targetId,t)
 ]);
 if(!results[0].meta.changes)fail(409,'This account changed. Reload it before saving.');
 // Also remove email/reset records so a deleted account cannot be recovered.
 const security=await helpers.readAccountSecurity(env);security.profiles=security.profiles.filter(p=>p.user_id!==targetId);security.resetTokens=security.resetTokens.filter(p=>p.user_id!==targetId);security.recoveryRequests=security.recoveryRequests.filter(p=>p.user_id!==targetId);await helpers.writeAccountSecurity(env,security);
 await audit(env,helpers,user,'user.delete',targetId);return json({ok:true,message:'Account access removed. Historical orders and audit references are retained.'});
 }
 const name=b.displayName===undefined?target.display_name:required(b.displayName,100,'Display name');
 if(b.active!==undefined&&typeof b.active!=='boolean')fail(400,'Active must be true or false.');
 const active=b.active===undefined?target.active:Number(b.active);
 if(target.username.startsWith('deleted_')&&active)fail(409,'Deleted accounts cannot be restored; create a new account instead.');
 const statements=[env.DB.prepare('UPDATE users SET display_name=?,active=?,updated_at=? WHERE id=? AND updated_at=?').bind(name,active,t,targetId,target.updated_at)];
 if(!active)statements.push(env.DB.prepare('DELETE FROM sessions WHERE user_id=? AND EXISTS (SELECT 1 FROM users WHERE id=? AND updated_at=?)').bind(targetId,targetId,t));
 const results=await env.DB.batch(statements);if(!results[0].meta.changes)fail(409,'This account changed. Reload it before saving.');
 await audit(env,helpers,user,'user.update',targetId);return json({ok:true});
}
export async function permissionsRoute(request,env,user,targetId,helpers){
 await requireOwner(env,user);if(request.method!=='PUT'||!targetId)fail(405,'Use PUT for a user permission update.');const b=await body(request);
 if(Object.keys(b).some(k=>!['family','menus'].includes(k)))fail(400,'Only family-tree and menu permissions can be delegated.');
 if(!Number.isInteger(b.family)||!Number.isInteger(b.menus)||![0,1,2].includes(b.family)||![0,1,2].includes(b.menus))fail(400,'Choose none, read or contribute for both sections.');
 if(await env.DB.prepare('SELECT slot FROM site_owners WHERE user_id=?').bind(targetId).first())fail(409,'The owner and partner already have full access.');
 const target=await env.DB.prepare('SELECT id,active FROM users WHERE id=?').bind(targetId).first();if(!target?.active)fail(404,'Choose an active user.');
 await env.DB.batch(['family','menus'].map(section=>env.DB.prepare('INSERT INTO site_permissions(user_id,section,level) VALUES(?,?,?) ON CONFLICT(user_id,section) DO UPDATE SET level=excluded.level').bind(targetId,section,b[section])));
 await audit(env,helpers,user,'permissions.update',targetId);return json({ok:true});
}
export async function partnerRoute(request,env,user,helpers){
 await requireOwner(env,user);if(request.method!=='POST')fail(405,'Use POST.');const b=await body(request);
 if(await env.DB.prepare("SELECT user_id FROM site_owners WHERE slot='partner'").first())fail(409,'A private partner is already configured.');
 const target=await env.DB.prepare('SELECT id,active FROM users WHERE id=?').bind(text(b.userId,100)).first();if(!target?.active||target.id===user.id)fail(400,'Choose a different active account.');
 if(b.confirmPrivateAccess!==true)fail(400,'Confirm access to your shared private spaces.');
 await env.DB.prepare("INSERT INTO site_owners(user_id,slot) VALUES(?,'partner')").bind(target.id).run();await audit(env,helpers,user,'partner.set',target.id);return json({ok:true});
}
