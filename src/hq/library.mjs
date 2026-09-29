import {now} from './core.mjs';
import {permission} from './schema.mjs';
// General health reference, not a personal diagnosis. The owner can edit this private starter page.
const GUIDE={title:'Hand wash & allergies',category:'Health & home',summary:'A simple note for Yaya about detergent irritation and choosing products.',tags:['hands','allergies','washing-up'],sourceUrl:'https://www.nhs.uk/conditions/contact-dermatitis/causes/',text:'The important distinction\nA reaction to washing-up liquid does not prove an allergy to one ingredient. Soaps, detergents and repeated wet work can irritate skin; preservatives and fragrance can also trigger contact allergy.\n\nA practical approach\nAvoid products that have already caused a reaction. Reduce direct contact with washing-up liquid and use suitable protective gloves for cleaning. A product described as sulfate-free is not automatically irritation-free or allergy-safe.\n\nShopping notes\nSodium lauryl sulfate (SLS), sodium laureth sulfate (SLES), fragrance ingredients such as limonene, and preservatives such as MI/MCI are ingredients to discuss when reviewing labels, not a confirmed personal allergy list. Keep the packaging or ingredient photos to show a clinician.\n\nWhen to get help\nAsk a GP about persistent, recurrent or severe symptoms. A dermatologist can assess possible contact allergy, including whether patch testing is appropriate.\n\nThis page is general information, not a diagnosis. Source: NHS contact dermatitis guidance, checked 29 September 2026.'};
export async function ensureLibrary(env,user){
 if(!(await permission(env,user,'intimate')).pair)return;
 if(await env.DB.prepare("SELECT 1 AS ok FROM hq_meta WHERE key='info-library-v1'").first())return;
 const stamp=now();await env.DB.batch([
  env.DB.prepare('INSERT OR IGNORE INTO hq_records(id,kind,section,parent_id,creator_id,updated_by,revision,data,created_at,updated_at) VALUES(?,?,?,NULL,?,?,1,?,?,?)').bind('info-allergies','info','library',user.id,user.id,JSON.stringify(GUIDE),stamp,stamp),
  env.DB.prepare("INSERT OR IGNORE INTO hq_meta VALUES('info-library-v1',?)").bind(stamp)
 ]);
}
