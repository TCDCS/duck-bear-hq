/** Pure family date, graph and map helpers. Never guess a missing date or parent. */
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const PARENT_TYPES=['parent','adoptive-parent','step-parent','guardian'];
export const EVIDENCE_LABELS={family:'Family confirmed',document:'Document supported',index:'Index entry',reported:'Reported / needs checking',unresolved:'Unresolved',excluded:'Excluded lead'};
export const RELATION_LABELS={parent:'Biological parent','adoptive-parent':'Adoptive parent','step-parent':'Step-parent',guardian:'Guardian',partner:'Partner / spouse','former-partner':'Former partner / spouse',sibling:'Sibling','adoptive-sibling':'Sibling through adoption','half-sibling':'Half-sibling',cousin:'Cousin',pet:'Family pet',witness:'Witness / friend',other:'Other connection'};
export function familyDate(value){
 const raw=String(value||'').trim();let m;
 if((m=raw.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/))){const y=+m[1],month=m[2]?+m[2]:1,day=m[3]?+m[3]:1;const stamp=new Date(`${m[1]}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}T12:00:00Z`);if(y>0&&month>=1&&month<=12&&day>=1&&Number.isFinite(+stamp)&&stamp.getUTCFullYear()===y&&stamp.getUTCMonth()+1===month&&stamp.getUTCDate()===day)return {raw,sort:+stamp,year:y,precision:m[3]?'day':m[2]?'month':'year',label:m[3]?`${day} ${MONTHS[month-1]} ${y}`:m[2]?`${MONTHS[month-1]} ${y}`:m[1]};}
 return {raw,sort:null,year:null,precision:'unknown',label:raw||'Date not known'};
}
export function periodLabel(d){const start=familyDate(d.start).label;return [d.start?start:'',d.end?`– ${familyDate(d.end).label}`:'',d.dateNote?`(${d.dateNote})`:''].filter(Boolean).join(' ')||'Date not known';}
export const mapLink=query=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(String(query||'').trim());
export function familyTimeline(people,events,relationships=[]){
 const names=new Map(people.map(p=>[p.id,p.data.name]));const out=events.map(r=>({...r.data,id:r.id,record:r,people:[r.data.personId,...(r.data.participants||[])],personName:names.get(r.data.personId)||'Unknown person'}));
 for(const p of people)for(const [key,type,title]of [['birth','birth','Born'],['death','death','Died']])if(p.data[key]&&!out.some(e=>e.personId===p.id&&e.eventType===type)){out.push({id:p.id+'-'+key,title,start:p.data[key],personId:p.id,personName:p.data.name,people:[p.id],eventType:type,evidence:p.data.evidence||'unresolved',sourceIds:p.data.sourceIds||[],record:p,placeId:p.data[key+'PlaceId']});}
 return out.map(e=>({...e,dateInfo:familyDate(e.start)})).sort((a,b)=>(a.dateInfo.sort??Infinity)-(b.dateInfo.sort??Infinity)||a.title.localeCompare(b.title));
}
export function familyLayout(people,relations,focus,depth=Infinity){
 const lookup=new Map(people.map(p=>[p.id,p])),root=lookup.has(focus)?focus:people.find(p=>p.data.isRoot)?.id||people[0]?.id;
 if(!root)return {nodes:[],edges:[],width:900,height:400,root:null};
 const links=relations.map(r=>({...r.data,id:r.id})).filter(e=>lookup.has(e.from)&&lookup.has(e.to)&&e.evidence!=='excluded');
 const states=new Map([[root,{generation:0,distance:0}]]),queue=[root];
 while(queue.length){const current=queue.shift(),s=states.get(current);if(s.distance>=depth)continue;for(const e of links){if(e.from!==current&&e.to!==current)continue;const next=e.from===current?e.to:e.from;if(states.has(next))continue;const step=PARENT_TYPES.includes(e.type)?(e.from===current?1:-1):e.type==='pet'?(e.from===current?1:-1):0;states.set(next,{generation:s.generation+step,distance:s.distance+1});queue.push(next);}}
 const generations=[...new Set([...states.values()].map(s=>s.generation))].sort((a,b)=>a-b),rows=new Map(generations.map(g=>[g,people.filter(p=>states.get(p.id)?.generation===g).sort((a,b)=>(a.id===root?-1:b.id===root?1:0)||a.data.name.localeCompare(b.data.name))]));
 const width=Math.max(900,...[...rows.values()].map(row=>row.length*236+72)),height=Math.max(400,generations.length*168+90),nodes=[];
 for(const [g,row]of rows){const y=(g-generations[0])*168+45;row.forEach((p,i)=>nodes.push({...p,...states.get(p.id),x:(width-row.length*236)/2+i*236,y,width:210,height:110}));}
 const nodeMap=new Map(nodes.map(n=>[n.id,n]));return {nodes,edges:links.filter(e=>nodeMap.has(e.from)&&nodeMap.has(e.to)),width,height,root};
}
export function nameLines(name,max=22){const words=String(name).split(/\s+/),lines=[''];for(const w of words){let last=lines.length-1;if(lines[last]&&lines[last].length+w.length+1>max){if(lines.length===3){lines[2]=lines[2].slice(0,max-1)+'…';break;}lines.push(w);}else lines[last]+=(lines[last]?' ':'')+w;}return lines;}
export const geoPoint=(latitude,longitude)=>({x:(Number(longitude)+180)*3,y:(90-Number(latitude))*3});
