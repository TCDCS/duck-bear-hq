import {MAX_UPLOAD,assertMedia,audit,body,boundedBytes,fail,json,newId,now,requireOwner,requireSection,required,text} from './core.mjs';
export function imageType(bytes){if(bytes.length<12)return null;if([137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return 'image/png';if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';if(new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP')return 'image/webp';return null;}
export async function upload(request,env,user,helpers){
 if(request.method!=='POST')fail(405,'Use POST to upload.');
 const bytes=await boundedBytes(request,MAX_UPLOAD+65536);let form;try{form=await new Request(request.url,{method:'POST',headers:request.headers,body:bytes}).formData();}catch{fail(400,'Choose a photo to upload.');}
 const section=form.get('section');if(!['menus','family','scrapbook','artwork'].includes(section))fail(400,'Choose an upload section.');await requireSection(env,user,section,2);
 const file=form.get('file');if(!file||typeof file.arrayBuffer!=='function'||!file.size)fail(400,'Choose a photo to upload.');if(file.size>MAX_UPLOAD)fail(413,'Photos must be no larger than 8 MiB.');
 const content=new Uint8Array(await file.arrayBuffer()),type=imageType(content);if(!type||file.type!==type)fail(415,'Use a genuine JPEG, PNG or WebP photo.');
 const id=newId('img'),key=`site/${section}/${id}`;
 await env.MEDIA.put(key,content,{httpMetadata:{contentType:type},customMetadata:{private:'true',section}});
 try{await env.DB.prepare('INSERT INTO site_media(id,section,storage_key,content_type,byte_size,created_by,created_at) VALUES(?,?,?,?,?,?,?)').bind(id,section,key,type,file.size,user.id,now()).run();}catch(e){await env.MEDIA.delete(key);throw e;}
 await audit(env,helpers,user,'media.upload',id);return json({media:{id,url:'/media/site/'+id,section,type,size:file.size}},201);
}
export async function serveSiteMedia(request,env,user,id){
 if(!['GET','HEAD'].includes(request.method))return json({error:'Use GET or HEAD.'},405);
 const published=await env.DB.prepare("SELECT media_id FROM site_artwork WHERE slot='home' AND published=1 AND media_id=?").bind(id).first();
 if(!published&&!user?.active)return json({error:'Please sign in.'},401);
 const media=await env.DB.prepare('SELECT * FROM site_media WHERE id=?').bind(id).first();if(!media)return json({error:'Photo not found.'},404);
 if(published&&media.section!=='artwork')return json({error:'Photo not found.'},404);
 if(!published){try{
 // Private cover artwork inherits the destination section's access, not public visibility.
 if(media.section==='artwork'){const slots=(await env.DB.prepare("SELECT slot FROM site_artwork WHERE media_id=? AND slot<>'home'").bind(id).all()).results;let allowed=false;for(const slot of slots){try{await requireSection(env,user,slot.slot,1);allowed=true;break;}catch(e){if(e.status!==403)throw e;}}if(!allowed)await requireOwner(env,user);}
 else await requireSection(env,user,media.section,1);
 }catch(e){if(e.status)return json({error:e.message},e.status);throw e;}}
 const obj=await env.MEDIA.get(media.storage_key);if(!obj)return json({error:'Photo not found.'},404);
 const headers={'Content-Type':media.content_type,'Content-Length':String(media.byte_size),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Referrer-Policy':'no-referrer'};
 return new Response(request.method==='HEAD'?null:obj.body,{headers});
}
export async function artworkRoute(request,env,user,slot,helpers){
 if(request.method==='GET'&&!slot){await requireOwner(env,user);const rows=(await env.DB.prepare('SELECT * FROM site_artwork').all()).results;return json({artwork:rows.map(r=>({...r,url:r.media_id?'/media/site/'+r.media_id:null}))});}
 await requireOwner(env,user);if(request.method!=='PUT'||!['home','menus','family','scrapbook'].includes(slot))fail(405,'Choose a valid artwork slot.');const b=await body(request),id=await assertMedia(env,b.mediaId,'artwork'),alt=id?required(b.alt,200,'Alternative text'):'';
 if(slot==='home'&&id&&b.publishPublic!==true)fail(400,'Confirm that this artwork may appear on the public homepage.');
 await env.DB.prepare('INSERT INTO site_artwork(slot,media_id,alt,published,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(slot) DO UPDATE SET media_id=excluded.media_id,alt=excluded.alt,published=excluded.published,updated_at=excluded.updated_at').bind(slot,id,alt,slot==='home'&&id?1:0,now()).run();
 await audit(env,helpers,user,'artwork.update',slot);return json({ok:true});
}
