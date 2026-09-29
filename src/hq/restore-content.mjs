import {fail} from './core.mjs';
/** Restore/import must not introduce links that normal editing would reject. */
export function validateRestoreContent(value,depth=0){
 if(depth>24)fail(400,'Backup content is nested too deeply.');
 if(value===null||typeof value!=='object')return;
 if(Array.isArray(value)){for(const child of value)validateRestoreContent(child,depth+1);return;}
 for(const [key,child] of Object.entries(value)){
  if(['__proto__','constructor','prototype'].includes(key))fail(400,'Invalid backup field.');
  if(['link','url'].includes(key)&&child){
   if(typeof child!=='string')fail(400,'Backup links must be text.');
   let u;try{u=new URL(child);}catch{fail(400,'Backup links must use a valid http or https address.');}
   if(!['http:','https:'].includes(u.protocol)||u.username||u.password)fail(400,'Backup links must use http or https without credentials.');
  }
  validateRestoreContent(child,depth+1);
 }
}
