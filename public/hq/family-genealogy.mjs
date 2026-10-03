/** Presentation-only genealogy rules. Never rewrite or discard source records. */
import {familyTimeline,familyDate} from './family-model.mjs';
export const GENEALOGY_TYPES={birth:'Birth',death:'Death',marriage:'Marriage',separation:'Separation',divorce:'Divorce',adoption:'Adoption',registration:'Registration',migration:'Move',residence:'Residence',funeral:'Funeral'};
export const LOCATION_TYPES={birth:'Born',death:'Died',current:'Living now'};
const ANCESTOR_TYPES=new Set(['parent','adoptive-parent']);
const PARENT_TYPES=new Set([...ANCESTOR_TYPES,'step-parent','guardian']);
const PARTNER_TYPES=new Set(['partner','former-partner']);
const compare=(a,b)=>a.data.name.localeCompare(b.data.name)||a.id.localeCompare(b.id);
const usable=r=>r.data.evidence!=='excluded';
export const isPerson=p=>!['pet','associate'].includes(p.data.entityType)&&usable(p);
export function genealogyTimeline(people,events,relations=[]){
 const ids=new Set(people.filter(isPerson).map(p=>p.id));
 return familyTimeline(people.filter(isPerson),events.filter(e=>usable(e)&&Object.hasOwn(GENEALOGY_TYPES,e.data.eventType)&&ids.has(e.data.personId)),relations);
}
export function lifespan(data){
 const birth=familyDate(data.birth).year,death=familyDate(data.death).year;
 return [birth||'?',death|| (data.livingStatus==='living'?'Living':data.livingStatus==='deceased'?'Deceased':'?')].join(' – ');
}
const validLocation=text=>text&&!/^(unknown|not (known|recorded|established|confirmed)|unresolved|unconfirmed)\b/i.test(text);
export function genealogyLocations(people,events,places){
 const placeById=new Map(places.filter(usable).map(p=>[p.id,p]));
 const grouped=new Map();
 for(const person of people.filter(isPerson))for(const type of ['birth','death','current']){
  const d=person.data;
  if(type==='current'&&(d.death||d.livingStatus==='deceased'))continue;
  let id=d[type+'PlaceId'],text=d[type+'Place'];
  if(!id&&!validLocation(text)&&type!=='current'){
   const candidates=events.filter(e=>usable(e)&&e.data.personId===person.id&&e.data.eventType===type&&e.data.placeId);
   const ids=[...new Set(candidates.map(e=>e.data.placeId))];
   // Conflicting events do not establish a single place.
   if(ids.length===1)id=ids[0];
  }
  let p=placeById.get(id);
  if(!p&&validLocation(text))p=places.find(p=>usable(p)&&[p.data.title,p.data.locality].some(v=>v?.toLowerCase().trim()===text.toLowerCase().trim()));
  if(!p&&!validLocation(text))continue;
  const title=validLocation(text)?text:p?.data.title;
  if(!title)continue;
  const key=p?.id||'text:'+title.toLowerCase().trim();
  if(!grouped.has(key)){
   const lat=p?.data.latitude,lon=p?.data.longitude;
   const mapped=lat!==null&&lat!==undefined&&lon!==null&&lon!==undefined&&Number.isFinite(Number(lat))&&Number.isFinite(Number(lon));
   grouped.set(key,{id:key,title:p?.data.title||title,latitude:mapped?Number(lat):null,longitude:mapped?Number(lon):null,precision:p?.data.precision||'unmapped',mapQuery:p?.data.mapQuery||title,country:p?.data.country||'',associations:[]});
  }
  grouped.get(key).associations.push({personId:person.id,personName:d.name,type,label:LOCATION_TYPES[type],date:type==='current'?'':d[type]||'',placeLabel:title});
 }
 return [...grouped.values()].sort((a,b)=>a.title.localeCompare(b.title)).map(p=>({...p,associations:p.associations.sort((a,b)=>a.personName.localeCompare(b.personName)||a.type.localeCompare(b.type))}));
}
function graph(people,relations,focus){
 const list=people.filter(isPerson).sort(compare),byId=new Map(list.map(p=>[p.id,p]));
 const root=byId.has(focus)?focus:list.find(p=>p.data.isRoot)?.id||list[0]?.id;
 const edges=relations.filter(usable).map(r=>({...r.data,id:r.id})).filter(e=>byId.has(e.from)&&byId.has(e.to)&&e.from!==e.to).sort((a,b)=>a.type.localeCompare(b.type)||compare(byId.get(a.from),byId.get(b.from))||a.to.localeCompare(b.to));
 return {list,byId,root,edges};
}
const CW=230,CH=100,GAP=28,PAD=40;
function bounds(nodes,edges,root,mode){return {nodes,edges,root,mode,width:Math.max(420,...nodes.map(n=>n.x+n.width+PAD)),height:Math.max(300,...nodes.map(n=>n.y+n.height+PAD))};}
/** An ancestor can appear twice in a pedigree without duplicating their record. */
export function pedigreeLayout(people,relations,focus,generations=4){
 const {byId,root,edges}=graph(people,relations,focus);
 if(!root)return bounds([],[],null,'ancestors');
 const max=Math.min(6,Math.max(2,Number(generations)||4)),nodes=[],lines=[];let leaf=0;
 function visit(id,level,path,seen){
  if(nodes.length>=150||seen.has(id))return null;
  const node={...byId.get(id),key:path,generation:-level,x:PAD+level*(CW+72),y:0,width:CW,height:CH};nodes.push(node);
  const parents=edges.filter(e=>e.to===id&&ANCESTOR_TYPES.has(e.type));
  node.expandable=parents.length>0&&level>=max-1;
  const chain=new Set(seen);chain.add(id);
  const attached=level<max-1?parents.map((e,i)=>{const n=visit(e.from,level+1,path+'-'+i,chain);if(n)lines.push({...e,from:n.key,to:node.key});return n;}).filter(Boolean):[];
  node.y=attached.length?attached.reduce((sum,n)=>sum+n.y,0)/attached.length:PAD+(leaf++)*(CH+GAP);
  return node;
 }
 visit(root,0,'root',new Set());
 return bounds(nodes,lines,root,'ancestors');
}
/** A readable three-generation window. Other relatives are reached by refocusing. */
export function immediateFamilyLayout(people,relations,focus){
 const {byId,root,edges}=graph(people,relations,focus);
 if(!root)return bounds([],[],null,'family');
 const parents=[...new Set(edges.filter(e=>e.to===root&&PARENT_TYPES.has(e.type)).map(e=>e.from))];
 const partners=[...new Set(edges.filter(e=>PARTNER_TYPES.has(e.type)&&(e.from===root||e.to===root)).map(e=>e.from===root?e.to:e.from))];
 const children=[...new Set(edges.filter(e=>e.from===root&&PARENT_TYPES.has(e.type)).map(e=>e.to))];
 // Include recorded co-parents, without inventing a partnership.
 for(const e of edges)if(children.includes(e.to)&&PARENT_TYPES.has(e.type)&&e.from!==root&&!partners.includes(e.from)&&!parents.includes(e.from)&&!children.includes(e.from))partners.push(e.from);
 const sortIds=ids=>ids.sort((a,b)=>compare(byId.get(a),byId.get(b)));
 sortIds(parents);sortIds(partners);sortIds(children);
 // One partner each side of the focus avoids long lines across other cards.
 const middle=partners.length?[partners[0],root,...partners.slice(1)]:[root];
 const rows=[parents,middle,children].filter(row=>row.length),width=Math.max(...rows.map(r=>r.length*(CW+GAP)-GAP))+PAD*2,nodes=[];
 rows.forEach((row,y)=>row.forEach((id,x)=>nodes.push({...byId.get(id),key:id,generation:parents.includes(id)?-1:children.includes(id)?1:0,x:(width-(row.length*(CW+GAP)-GAP))/2+x*(CW+GAP),y:PAD+y*(CH+110),width:CW,height:CH})));
 const shown=new Set(nodes.map(n=>n.id));
 const lines=edges.filter(e=>shown.has(e.from)&&shown.has(e.to)&&((PARENT_TYPES.has(e.type)&&((parents.includes(e.from)&&e.to===root)||(middle.includes(e.from)&&children.includes(e.to))))||(PARTNER_TYPES.has(e.type)&&(e.from===root||e.to===root))));
 return bounds(nodes,lines,root,'family');
}
export function closeRelatives(people,relations,id){
 const {byId,edges}=graph(people,relations,id),result={parents:[],partners:[],children:[],siblings:[]};
 const add=(group,key,type)=>{if(byId.has(key)&&!result[group].some(x=>x.person.id===key))result[group].push({person:byId.get(key),type});};
 for(const e of edges){
  if(PARENT_TYPES.has(e.type)){if(e.to===id)add('parents',e.from,e.type);if(e.from===id)add('children',e.to,e.type);}
  else if(e.from===id||e.to===id){const other=e.from===id?e.to:e.from;if(PARTNER_TYPES.has(e.type))add('partners',other,e.type);if(e.type.includes('sibling'))add('siblings',other,e.type);}
 }
 // Only derive sibling links from actual shared biological/adoptive parents.
 const parentIds=new Set(edges.filter(e=>e.to===id&&ANCESTOR_TYPES.has(e.type)).map(e=>e.from));
 for(const e of edges)if(e.to!==id&&parentIds.has(e.from)&&ANCESTOR_TYPES.has(e.type))add('siblings',e.to,e.type==='adoptive-parent'?'adoptive-sibling':'sibling');
 return result;
}
/** Start at readable text size; Fit remains an explicit overview control. */
export function initialTreeViewport(layout,width,height){
 const fit=Math.min((width-48)/layout.width,(height-100)/layout.height,1);
 const scale=Math.max(.9,fit),focus=layout.nodes.find(n=>n.id===layout.root)||layout.nodes[0];
 if(!focus||fit>=.9)return {scale,x:(width-layout.width*scale)/2,y:(height-layout.height*scale)/2};
 const x=layout.mode==='ancestors'?24-focus.x*scale:width/2-(focus.x+focus.width/2)*scale;
 return {scale,x,y:(height-44)/2-(focus.y+focus.height/2)*scale};
}
