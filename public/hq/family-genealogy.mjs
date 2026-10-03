/** Presentation-only genealogy rules. Never rewrite or discard source records. */
import {familyTimeline,familyDate} from './family-model.mjs';
export const GENEALOGY_TYPES={birth:'Birth',death:'Death',marriage:'Marriage',separation:'Separation',divorce:'Divorce',adoption:'Adoption',registration:'Registration',migration:'Move',residence:'Residence',funeral:'Funeral','name-change':'Name change'};
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
 const birth=data.birth?familyDate(data.birth).label:'',death=data.death?familyDate(data.death).label:'';
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
const CW=270,CH=144,GAP=30,PAD=48;
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
 if(!focus||(layout.width*scale<=width-24&&layout.height*scale<=height-60))return {scale,x:(width-layout.width*scale)/2,y:(height-layout.height*scale)/2};
 const x=layout.mode==='ancestors'?24-focus.x*scale:width/2-(focus.x+focus.width/2)*scale;
 return {scale,x,y:(height-44)/2-(focus.y+focus.height/2)*scale};
}

/** Project only explicitly recorded private DOBs into an authorised display copy.
 * The caller obtains these records through the existing intimate read permission.
 * Free-text dates are never parsed, and conflicting private entries do not win.
 */
export function withPrivateBirthDates(people,records=[]){
 const dates=new Map();
 for(const r of records){const d=r.data||{},value=d.birthDate;if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))continue;const date=new Date(value+'T00:00:00Z');if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)continue;if(!dates.has(d.personId))dates.set(d.personId,new Set());dates.get(d.personId).add(value);}
 return people.map(p=>{const values=dates.get(p.id);return values?.size===1?{...p,data:{...p.data,birth:[...values][0],birthDatePrivacy:'household'}}:p;});
}

/** Full saved family, not just direct ancestors. Unlinked records stay visible. */
export function completeFamilyLayout(people,relations,focus){
 const list=people.filter(usable).sort(compare),byId=new Map(list.map(p=>[p.id,p]));
 const root=byId.has(focus)?focus:list.find(p=>p.data.isRoot)?.id||list[0]?.id;
 const edges=relations.filter(usable).map(r=>({...r.data,id:r.id})).filter(e=>byId.has(e.from)&&byId.has(e.to)&&e.from!==e.to).sort((a,b)=>a.id.localeCompare(b.id));
 if(!root)return {...bounds([],[],null,'all'),unlinkedIds:[],warnings:[]};
 return householdLayout(list,edges,root,'all');
}

/** Group actual partners/co-parents, then position their households by descent.
 * Membership in a layout group never creates a relationship or implies marriage.
 * Every connector retains its original record, type and endpoints.
 */
function householdLayout(list,edges,root,mode='family'){
 const byId=new Map(list.map(p=>[p.id,p])),warnings=[],uf=new Map(list.map(p=>[p.id,p.id]));
 const find=id=>{let at=id;while(uf.get(at)!==at)at=uf.get(at);return at;};
 const join=(a,b)=>{a=find(a);b=find(b);if(a!==b)uf.set(a<b?b:a,a<b?a:b);};
 const parentEdges=edges.filter(e=>PARENT_TYPES.has(e.type));
 const descends=(a,b)=>{const seen=new Set([a]),todo=[a];while(todo.length){const x=todo.shift();for(const e of parentEdges)if(e.from===x&&!seen.has(e.to)){if(e.to===b)return true;seen.add(e.to);todo.push(e.to);}}return false;};
 const groupPair=(a,b)=>{if(!descends(a,b)&&!descends(b,a))join(a,b);};
 for(const e of edges)if(PARTNER_TYPES.has(e.type))groupPair(e.from,e.to);
 const coparents=new Map();for(const e of parentEdges){const key=e.to+'|'+e.type;if(!coparents.has(key))coparents.set(key,[]);coparents.get(key).push(e.from);}
 for(const parents of coparents.values())for(let i=1;i<parents.length;i++)groupPair(parents[0],parents[i]);
 const groups=new Map();for(const p of list){const k=find(p.id);if(!groups.has(k))groups.set(k,{id:k,people:[],rank:0,parents:new Set(),children:new Set()});groups.get(k).people.push(p);}
 // Reject only cyclic placement constraints; retain the recorded edge for review.
 const reach=(a,b)=>{const seen=new Set(),todo=[a];while(todo.length){const x=todo.pop();if(x===b)return true;if(seen.has(x))continue;seen.add(x);todo.push(...groups.get(x).children);}return false;};
 for(const e of parentEdges){const a=find(e.from),b=find(e.to);if(a===b||reach(b,a)){warnings.push('Conflicting generation: '+e.id);continue;}groups.get(a).children.add(b);groups.get(b).parents.add(a);}
 // Equal-generation links constrain ranks only, not card grouping. This keeps
 // a sibling's children in the right row even where grandparents are unknown.
 const rankUF=new Map([...groups.keys()].map(k=>[k,k]));
 const rankFind=id=>{while(rankUF.get(id)!==id)id=rankUF.get(id);return id;};
 const rankReach=(a,b)=>{const seen=new Set(),todo=[a];while(todo.length){const x=todo.pop();if(x===b)return true;if(seen.has(x))continue;seen.add(x);for(const g of groups.values())if(rankFind(g.id)===x)for(const c of g.children){const next=rankFind(c);if(next!==x)todo.push(next);}}return false;};
 for(const e of edges){const peer=['sibling','half-sibling','adoptive-sibling','cousin'].includes(e.type)||(!PARENT_TYPES.has(e.type)&&(!isPerson(byId.get(e.from))||!isPerson(byId.get(e.to))));if(!peer)continue;
  const a=rankFind(find(e.from)),b=rankFind(find(e.to));if(a===b)continue;if(rankReach(a,b)||rankReach(b,a))continue;rankUF.set(a<b?b:a,a<b?a:b);
 }
 const units=new Map();for(const g of groups.values()){const id=rankFind(g.id);if(!units.has(id))units.set(id,{id,parents:new Set(),children:new Set(),rank:0});}
 for(const g of groups.values())for(const c of g.children){const a=rankFind(g.id),b=rankFind(c);if(a!==b){units.get(a).children.add(b);units.get(b).parents.add(a);}}
 const pending=new Map([...units].map(([k,g])=>[k,g.parents.size])),queue=[...units.keys()].filter(k=>!pending.get(k)).sort(),order=[];
 while(queue.length){const k=queue.shift(),g=units.get(k);order.push(k);for(const c of [...g.children].sort()){const child=units.get(c);child.rank=Math.max(child.rank,g.rank+1);pending.set(c,pending.get(c)-1);if(!pending.get(c)){queue.push(c);queue.sort();}}}
 for(const k of [...order].reverse()){const g=units.get(k);if(g.children.size)g.rank=Math.min(...[...g.children].map(c=>units.get(c).rank))-1;}
 for(const g of groups.values())g.rank=units.get(rankFind(g.id)).rank;
 const linked=new Set(edges.flatMap(e=>[e.from,e.to])),unlinkedIds=list.filter(p=>!linked.has(p.id)&&p.id!==root).map(p=>p.id);
 const bottom=Math.max(...[...groups.values()].map(g=>g.rank));for(const id of unlinkedIds)groups.get(find(id)).rank=bottom+1;
 const groupCompare=(a,b)=>compare(a.people[0],b.people[0])||a.id.localeCompare(b.id);
 for(const g of groups.values()){
  g.people.sort(compare);
  // Place a person with several recorded partners between them where possible.
  const degree=id=>edges.filter(e=>PARTNER_TYPES.has(e.type)&&(e.from===id||e.to===id)).length;
  if(g.people.length>2){const pivot=[...g.people].sort((a,b)=>degree(b.id)-degree(a.id)||compare(a,b))[0];const others=g.people.filter(p=>p!==pivot);g.people=[...others.slice(0,1),pivot,...others.slice(1)];}
  g.width=g.people.length*(CW+GAP)-GAP;
 }
 const rows=new Map();for(const g of groups.values()){if(!rows.has(g.rank))rows.set(g.rank,[]);rows.get(g.rank).push(g);}const ranks=[...rows.keys()].sort((a,b)=>a-b);
 for(const row of rows.values())row.sort(groupCompare);
 // Barycentric sweeps order whole households, never individual partners.
 const position=new Map();const positions=()=>{for(const rank of ranks)rows.get(rank).forEach((g,i)=>position.set(g.id,i));};positions();
 for(let pass=0;pass<4;pass++){const sweep=pass%2?[...ranks].reverse():ranks;for(const rank of sweep){const row=rows.get(rank);const score=g=>{const neighbours=[...(pass%2?g.children:g.parents)];return neighbours.length?neighbours.reduce((n,k)=>n+(position.get(k)||0),0)/neighbours.length:position.get(g.id);};row.sort((a,b)=>score(a)-score(b)||groupCompare(a,b));positions();}}
 const rowIndex=new Map(ranks.map((r,i)=>[r,i])),gapCounts=Array(ranks.length).fill(0);
 for(const e of edges){const a=rowIndex.get(groups.get(find(e.from)).rank),b=rowIndex.get(groups.get(find(e.to)).rank);gapCounts[Math.min(a,b)]++;if(Math.abs(a-b)>1)gapCounts[Math.max(a,b)-1]++;}
 const ys=[];let y=PAD;for(let i=0;i<ranks.length;i++){ys.push(y);y+=CH+Math.max(110,56+gapCounts[i]*7);}
 const rowWidth=row=>row.reduce((n,g)=>n+g.width,0)+Math.max(0,row.length-1)*86;
 const areaWidth=Math.max(500,...[...rows.values()].map(rowWidth)),nodes=[],rootRank=groups.get(find(root)).rank;
 for(const rank of ranks){let x=PAD+(areaWidth-rowWidth(rows.get(rank)))/2;for(const g of rows.get(rank)){g.people.forEach((p,i)=>nodes.push({...p,key:p.id,generation:rank-rootRank,x:x+i*(CW+GAP),y:ys[rowIndex.get(rank)],width:CW,height:CH,household:g.id,relationCaption:p.id===root?'Focus person':unlinkedIds.includes(p.id)?'Connection not yet recorded':p.data.entityType==='pet'?'Family pet':p.data.entityType==='associate'?'Friend / associate':rank<rootRank?'Earlier generation':rank>rootRank?'Younger generation':'Family / partner'}));x+=g.width+86;}}
 const nodeById=new Map(nodes.map(n=>[n.id,n])),used=Array(ranks.length).fill(0),ports=new Map();
 for(const n of nodes)ports.set(n.id,edges.filter(e=>e.from===n.id||e.to===n.id).map(e=>e.id).sort());
 const port=(n,e)=>n.x+n.width/2+(ports.get(n.id).indexOf(e.id)-(ports.get(n.id).length-1)/2)*6;
 const lane=row=>ys[row]+CH+24+(used[row]++)*7;
 let gutter=0;const paths=edges.map(e=>{const a=nodeById.get(e.from),b=nodeById.get(e.to),ra=rowIndex.get(groups.get(find(a.id)).rank),rb=rowIndex.get(groups.get(find(b.id)).rank),ax=port(a,e),bx=port(b,e);let points;
  if(ra===rb){if(PARTNER_TYPES.has(e.type)&&Math.abs(a.x-b.x)<=CW+GAP+1)points=a.x<b.x?[{x:a.x+CW,y:a.y+CH/2},{x:b.x,y:b.y+CH/2}]:[{x:a.x,y:a.y+CH/2},{x:b.x+CW,y:b.y+CH/2}];else{const track=lane(ra);points=[{x:ax,y:a.y+CH},{x:ax,y:track},{x:bx,y:track},{x:bx,y:b.y+CH}];}}
  else {const down=ra<rb,top=down?a:b,low=down?b:a,rt=Math.min(ra,rb),rl=Math.max(ra,rb),tx=port(top,e),lx=port(low,e),track=lane(rt);
   points=[{x:tx,y:top.y+CH},{x:tx,y:track}];if(rl-rt===1)points.push({x:lx,y:track});else{const outer=PAD+areaWidth+40+(gutter++)*9,last=lane(rl-1);points.push({x:outer,y:track},{x:outer,y:last},{x:lx,y:last});}points.push({x:lx,y:low.y});if(!down)points.reverse();
  }
  return {...e,points};
 });
 const layout=bounds(nodes,paths,root,mode);layout.width=Math.max(layout.width,PAD+areaWidth+gutter*9+96);layout.height=Math.max(layout.height,ys.at(-1)+CH+60+used.at(-1)*7);
 return {...layout,unlinkedIds,warnings};
}

/** Expand the displayed household's ancestry, including current/former co-parents. */
export function extendedFamilyLayout(people,relations,focus,{extendedFamily=false,extendedAncestry=false,generations=4}={}){
 const {list,root,edges}=graph(people,relations,focus);if(!root)return {...bounds([],[],null,'family'),unlinkedIds:[],warnings:[]};
 const close=immediateFamilyLayout(people,relations,root),selected=new Set(close.nodes.map(n=>n.id));
 if(extendedFamily){
  const seed=[root,...close.nodes.filter(n=>n.generation===-1).map(n=>n.id)];
  for(const id of seed)for(const {person} of closeRelatives(people,relations,id).siblings)selected.add(person.id);
  for(const e of edges)if(e.type==='cousin'&&(e.from===root||e.to===root))selected.add(e.from===root?e.to:e.from);
  for(let pass=0;pass<2;pass++)for(const id of [...selected])for(const e of edges){if(e.from===id&&PARENT_TYPES.has(e.type))selected.add(e.to);if(PARTNER_TYPES.has(e.type)&&(e.from===id||e.to===id))selected.add(e.from===id?e.to:e.from);}
 }
 if(extendedAncestry){let frontier=[...selected];const seen=new Set(frontier),max=Math.min(6,Math.max(2,Number(generations)||4));for(let depth=0;depth<max-1&&frontier.length;depth++){const next=[];for(const id of frontier)for(const e of edges)if(e.to===id&&ANCESTOR_TYPES.has(e.type)){selected.add(e.from);if(!seen.has(e.from)){seen.add(e.from);next.push(e.from);}}frontier=next;}}
 return {...householdLayout(list.filter(p=>selected.has(p.id)),edges.filter(e=>selected.has(e.from)&&selected.has(e.to)),root),extendedFamily,extendedAncestry};
}
