/** Interactive genealogy chart. All data and portraits remain in the signed-in site. */
import {$,$$,esc,imageUrl,linkButton} from './client.mjs';
import {familyDate,RELATION_LABELS} from './family-model.mjs';
import {pedigreeLayout,immediateFamilyLayout,extendedFamilyLayout,closeRelatives,lifespan,isPerson,initialTreeViewport} from './family-genealogy.mjs';
const PROFILE='/family-tree/people/';
const initials=name=>String(name).split(/\s+/).slice(0,2).map(s=>s[0]||'').join('');
const portrait=p=>p.data.avatarId?`<img src="${imageUrl(p.data.avatarId)}" alt="" style="object-position:${Number(p.data.avatarX??50)}% ${Number(p.data.avatarY??50)}%" draggable="false">`:`<span aria-hidden="true">${esc(initials(p.data.name))}</span>`;
function edgePath(e,nodes,mode){
 const a=nodes.get(e.from),b=nodes.get(e.to);
 if(mode==='ancestors'){
  const x1=b.x+b.width,y1=b.y+b.height/2,x2=a.x,y2=a.y+a.height/2,mid=(x1+x2)/2;
  return `M ${x1} ${y1} H ${mid} V ${y2} H ${x2}`;
 }
 const x1=a.x+a.width/2,x2=b.x+b.width/2;
 if(a.y===b.y){
  if(Math.abs(a.x-b.x)<a.width+45)return a.x<b.x?`M ${a.x+a.width} ${a.y+a.height/2} H ${b.x}`:`M ${b.x+b.width} ${b.y+b.height/2} H ${a.x}`;
  const y=a.y+a.height+22;return `M ${x1} ${a.y+a.height} V ${y} H ${x2} V ${b.y+b.height}`;
 }
 const y1=a.y+a.height,y2=b.y,mid=y1+(y2-y1)*.5;
 return `M ${x1} ${y1} V ${mid} H ${x2} V ${y2}`;
}
function viewport(host,world,size){
 let scale=1,x=0,y=0,pointers=new Map(),gesture=null,moved=false,fitMode='initial';
 const clamp=n=>Math.max(.22,Math.min(2,n));
 const draw=()=>{world.style.transform=`translate(${x}px,${y}px) scale(${scale})`;const out=$('[data-scale]',host);if(out)out.textContent=Math.round(scale*100)+'%';};
 const fit=()=>{const w=host.clientWidth,h=host.clientHeight;scale=clamp(Math.min((w-48)/size.width,(h-100)/size.height,1));x=(w-size.width*scale)/2;y=(h-size.height*scale)/2;fitMode='fit';draw();};
 const initial=()=>{const start=initialTreeViewport(size,host.clientWidth,host.clientHeight);({scale,x,y}=start);fitMode='initial';draw();};
 const zoom=(factor,cx=host.clientWidth/2,cy=host.clientHeight/2)=>{const next=clamp(scale*factor);x=cx-(cx-x)*next/scale;y=cy-(cy-y)*next/scale;scale=next;fitMode=false;draw();};
 const abort=new AbortController(),opts={signal:abort.signal};
 host.addEventListener('wheel',e=>{if(e.target.closest('.tree-preview,.tree-toolbar'))return;e.preventDefault();const r=host.getBoundingClientRect();zoom(Math.exp(-e.deltaY*.002),e.clientX-r.left,e.clientY-r.top);},{...opts,passive:false});
 const point=e=>({x:e.clientX,y:e.clientY});
 const snapshot=()=>{const p=[...pointers.values()];if(p.length===1)gesture={...p[0],x0:x,y0:y};else if(p.length===2){const r=host.getBoundingClientRect();gesture={distance:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),scale,cx:(p[0].x+p[1].x)/2-r.left,cy:(p[0].y+p[1].y)/2-r.top,x0:x,y0:y};}};
 host.addEventListener('pointerdown',e=>{if(e.button>0||e.target.closest('button,a,input,select,.tree-preview'))return;pointers.set(e.pointerId,point(e));host.setPointerCapture(e.pointerId);moved=false;snapshot();host.classList.add('is-panning');},opts);
 host.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId)||!gesture)return;pointers.set(e.pointerId,point(e));fitMode=false;
  if(pointers.size===1){const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;moved ||= Math.abs(dx)+Math.abs(dy)>4;x=gesture.x0+dx;y=gesture.y0+dy;}
  else {const p=[...pointers.values()],r=host.getBoundingClientRect(),next=clamp(gesture.scale*Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)/Math.max(1,gesture.distance));x=(p[0].x+p[1].x)/2-r.left-(gesture.cx-gesture.x0)*next/gesture.scale;y=(p[0].y+p[1].y)/2-r.top-(gesture.cy-gesture.y0)*next/gesture.scale;scale=next;moved=true;}
  draw();
 },opts);
 const end=e=>{pointers.delete(e.pointerId);if(pointers.size)snapshot();else{gesture=null;host.classList.remove('is-panning');}};
 host.addEventListener('pointerup',end,opts);host.addEventListener('pointercancel',end,opts);
 host.addEventListener('click',e=>{if(moved&&!e.target.closest('button,a'))e.stopPropagation();},opts);
 host.addEventListener('keydown',e=>{if(e.target!==host)return;if(e.key==='+'||e.key==='='){zoom(1.2);e.preventDefault();}else if(e.key==='-'){zoom(1/1.2);e.preventDefault();}else if(e.key==='Home'){fit();e.preventDefault();}else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();x+=e.key==='ArrowLeft'?60:e.key==='ArrowRight'?-60:0;y+=e.key==='ArrowUp'?60:e.key==='ArrowDown'?-60:0;fitMode=false;draw();}},opts);
 $('[data-tree-zoom=in]',host).onclick=()=>zoom(1.2);
 $('[data-tree-zoom=out]',host).onclick=()=>zoom(1/1.2);
 $('[data-tree-zoom=fit]',host).onclick=fit;
 $('[data-tree-zoom=actual]',host).onclick=()=>zoom(1/scale);
 let observer=new ResizeObserver(()=>{if(!host.isConnected){observer.disconnect();abort.abort();return;}if(fitMode==='fit')fit();else if(fitMode==='initial')initial();});observer.observe(host);
 initial();return {destroy(){abort.abort();observer.disconnect();},fit};
}
export function renderGenealogyTree(body,model,A){
 const people=model.people.filter(isPerson).sort((a,b)=>a.data.name.localeCompare(b.data.name)),byId=new Map(people.map(p=>[p.id,p]));
 if(!people.length){body.innerHTML='<section class="panel"><h2>Start with one person</h2><p>Add yourself, then connect your parents and family.</p>'+linkButton(PROFILE+'new/','Add a person')+'</section>';return;}
 const q=new URLSearchParams(location.search),home=people.find(p=>p.data.isRoot)||people[0];
 let focus=byId.has(q.get('focus'))?q.get('focus'):home.id,mode=q.get('view')==='family'?'family':'ancestors',depth=Math.min(6,Math.max(2,Number(q.get('generations'))||4)),selected=null,view=null,extendedFamily=q.get('extendedFamily')==='1',extendedAncestry=q.get('extendedAncestry')==='1';
 body.innerHTML=`<section class="genealogy-workbench" aria-label="Family tree explorer">
  <div class="tree-toolbar"><div class="tree-view-switch" role="group" aria-label="Tree layout"><button type="button" data-tree-mode="ancestors">Ancestors</button><button type="button" data-tree-mode="family">Family</button></div>
   <div class="tree-search-wrap"><label class="sr-only" for="tree-search">Find a person in the tree</label><input id="tree-search" type="search" placeholder="Find a person…" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="tree-search-results" aria-autocomplete="list"><div id="tree-search-results" role="listbox" hidden></div></div>
   <div class="tree-extended-options" hidden><label><input type="checkbox" id="tree-extended-family" ${extendedFamily?'checked':''}>Extended family</label><label><input type="checkbox" id="tree-extended-ancestry" ${extendedAncestry?'checked':''}>Extended ancestry</label></div><label class="tree-generations">Generations<select name="tree-depth" aria-label="Generations">${[2,3,4,5,6].map(n=>`<option value="${n}" ${n===depth?'selected':''}>${n}</option>`).join('')}</select></label>
   <button type="button" class="tree-tool" id="tree-home">Home person</button><button type="button" class="tree-tool" id="tree-fullscreen" aria-label="Expand tree to full screen">⛶</button>
  </div>
  <div class="genealogy-stage" id="family-tree-canvas" tabindex="0" role="region" aria-label="Interactive family tree. Drag to move; scroll or use plus and minus to zoom. Arrow keys move the chart.">
   <div class="tree-world" id="tree-world"></div>
   <div class="tree-zoom-controls" role="group" aria-label="Tree zoom"><button type="button" data-tree-zoom="in" aria-label="Zoom in">+</button><button type="button" data-tree-zoom="out" aria-label="Zoom out">−</button><button type="button" data-tree-zoom="fit">Fit</button><button type="button" data-tree-zoom="actual" aria-label="Actual size"><span data-scale>100%</span></button></div>
   <div class="tree-hint">Drag to explore · Use Fit to see all branches</div><aside class="tree-preview" id="tree-preview" aria-label="Selected person" hidden></aside>
  </div>
  <footer class="tree-footer"><div id="tree-summary" role="status"></div><div class="tree-key"><span class="tree-key-bio">Biological</span><span class="tree-key-adopt">Adoptive</span><span class="tree-key-partner">Partner / former partner</span></div></footer>
 </section>`;
 const stage=$('#family-tree-canvas',body),world=$('#tree-world',body),preview=$('#tree-preview',body),search=$('#tree-search',body),results=$('#tree-search-results',body);
 function setUrl(){const params=new URLSearchParams(location.search);params.set('focus',focus);params.set('view',mode);params.set('generations',String(depth));params.set('extendedFamily',extendedFamily?'1':'0');params.set('extendedAncestry',extendedAncestry?'1':'0');history.replaceState({},'',location.pathname+'?'+params);}
 function recenter(id){if(!byId.has(id))return;focus=id;selected=null;preview.hidden=true;results.hidden=true;search.value='';search.setAttribute('aria-expanded','false');setUrl();draw();}
 function selectPerson(id){
  const person=byId.get(id);if(!person)return;selected=id;const d=person.data,relations=closeRelatives(people,model.relations,id);
  $$('.tree-person',world).forEach(el=>el.classList.toggle('is-selected',el.dataset.person===id));
  preview.hidden=false;
  preview.innerHTML=`<button class="tree-preview-close" aria-label="Close person preview">×</button><div class="tree-preview-avatar">${portrait(person)}</div><h2>${esc(d.name)}</h2><p class="tree-preview-dates">${esc(lifespan(d))}</p>${d.alternateName?`<p class="tree-other-name">${esc(d.alternateName)}</p>`:''}<dl class="tree-preview-facts"><dt>Born</dt><dd>${esc(d.birth?familyDate(d.birth).label:'Not recorded')}${d.birthPlace?'<br>'+esc(d.birthPlace):''}</dd>${d.death||d.livingStatus==='deceased'?`<dt>Died</dt><dd>${esc(d.death?familyDate(d.death).label:'Date not recorded')}${d.deathPlace?'<br>'+esc(d.deathPlace):''}</dd>`:''}${d.currentPlace&&!d.death&&d.livingStatus!=='deceased'?`<dt>Living</dt><dd>${esc(d.currentPlace)}</dd>`:''}</dl><div class="tree-preview-actions"><a class="button" href="${PROFILE+person.id}/">View profile</a><button class="button secondary" id="tree-recenter">Centre tree here</button>${A.me.access.family?.contribute?`<a class="tree-small-link" href="/family-tree/relationships/new/?from=${esc(id)}">Add relationship</a>`:''}</div>${Object.entries(relations).filter(([,items])=>items.length).map(([group,items])=>`<section class="tree-preview-relatives"><h3>${esc(group[0].toUpperCase()+group.slice(1))}</h3>${items.map(({person:p,type})=>`<button class="tree-relative" data-relative="${esc(p.id)}"><span>${esc(p.data.name)}</span><small>${esc(type==='parent'?'Biological':type==='adoptive-parent'?'Adoptive':type==='former-partner'?'Former partner':type==='partner'?'Partner':RELATION_LABELS[type]||type)}</small></button>`).join('')}</section>`).join('')}`;
  $('.tree-preview-close',preview).onclick=()=>{preview.hidden=true;selected=null;$('.tree-person.is-selected',world)?.focus();};
  $('#tree-recenter',preview).onclick=()=>recenter(id);
  $$('[data-relative]',preview).forEach(b=>b.onclick=()=>selectPerson(b.dataset.relative));
 }
 function draw(){
  view?.destroy();const layout=mode==='ancestors'?pedigreeLayout(people,model.relations,focus,depth):extendedFamilyLayout(people,model.relations,focus,{extendedFamily,extendedAncestry,generations:depth});
  const nodes=new Map(layout.nodes.map(n=>[n.key,n]));
  $$('[data-tree-mode]',body).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.treeMode===mode)));
  $('.tree-generations',body).hidden=mode!=='ancestors'&&!extendedAncestry;$('.tree-extended-options',body).hidden=mode!=='family';
  world.style.width=layout.width+'px';world.style.height=layout.height+'px';
  world.innerHTML=`<svg id="family-tree-svg" class="tree-connections" width="${layout.width}" height="${layout.height}" aria-hidden="true" focusable="false">${layout.edges.map(e=>`<path d="${edgePath(e,nodes,mode)}" class="tree-edge edge-${esc(e.type)}"><title>${esc(RELATION_LABELS[e.type]||e.type)}</title></path>`).join('')}</svg>${layout.nodes.map(n=>`<button type="button" class="tree-person ${n.id===focus?'is-focus':''}" data-person="${esc(n.id)}" data-node="${esc(n.key)}" style="left:${n.x}px;top:${n.y}px;width:${n.width}px;height:${n.height}px" title="${esc(n.data.name+' · '+lifespan(n.data))}" aria-label="Show ${esc(n.data.name)}"><span class="tree-card-portrait">${portrait(n)}</span><span class="tree-card-copy"><strong>${esc(n.data.name)}</strong><span class="tree-card-years">${esc(lifespan(n.data))}</span><small>${n.relationCaption||(n.id===focus?'Focus person':n.expandable?'More ancestors →':n.generation<0?(layout.edges.some(e=>e.from===n.key&&e.type==='adoptive-parent')?'Adoptive family':'Ancestor'):n.generation>0?'Child':'Family')}</small></span></button>`).join('')}`;
  $$('[data-person]',world).forEach(b=>{b.onclick=()=>selectPerson(b.dataset.person);b.ondblclick=()=>recenter(b.dataset.person);});
  $('#tree-summary',body).textContent=byId.get(focus).data.name+' · '+new Set(layout.nodes.map(n=>n.id)).size+' people shown'+(mode==='family'?' · '+(extendedFamily?'Extended family':'Parents, partners and children')+(extendedAncestry?' and earlier ancestors':''):' · Direct ancestors');
  view=viewport(stage,world,layout);
  if(selected)selectPerson(selected);
 }
 $$('[data-tree-mode]',body).forEach(b=>b.onclick=()=>{mode=b.dataset.treeMode;setUrl();draw();});
 $('#tree-extended-family',body).onchange=e=>{extendedFamily=e.target.checked;setUrl();draw();};
 $('#tree-extended-ancestry',body).onchange=e=>{extendedAncestry=e.target.checked;setUrl();draw();};
 $('[name=tree-depth]',body).onchange=e=>{depth=Number(e.target.value);setUrl();draw();};
 $('#tree-home',body).onclick=()=>recenter(home.id);
 $('#tree-fullscreen',body).onclick=async()=>{const bench=$('.genealogy-workbench',body);try{if(document.fullscreenElement)await document.exitFullscreen();else await bench.requestFullscreen();view.fit();}catch{stage.focus();}};
 function searchPeople(){const term=search.value.trim().toLowerCase(),matches=term?people.filter(p=>[p.data.name,p.data.alternateName,...(p.data.aliases||[])].join(' ').toLowerCase().includes(term)).slice(0,12):[];results.innerHTML=matches.length?matches.map(p=>`<button type="button" role="option" aria-selected="false" data-search-person="${esc(p.id)}"><strong>${esc(p.data.name)}</strong><small>${esc(lifespan(p.data))}</small></button>`).join(''):'<p>No matching people</p>';results.hidden=!term;search.setAttribute('aria-expanded',String(!!term));$$('[data-search-person]',results).forEach(b=>b.onclick=()=>recenter(b.dataset.searchPerson));}
 search.oninput=searchPeople;search.onkeydown=e=>{if(e.key==='Escape'){results.hidden=true;search.setAttribute('aria-expanded','false');}else if(e.key==='ArrowDown'){e.preventDefault();$('button',results)?.focus();}else if(e.key==='Enter'){const options=$$('button',results);if(options.length===1)recenter(options[0].dataset.searchPerson);}};
 results.onkeydown=e=>{const buttons=$$('button',results),index=buttons.indexOf(document.activeElement);if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();buttons[(index+(e.key==='ArrowDown'?1:buttons.length-1))%buttons.length]?.focus();}if(e.key==='Escape'){results.hidden=true;search.focus();search.setAttribute('aria-expanded','false');}};
 body.addEventListener('keydown',e=>{if(e.key==='Escape'&&!preview.hidden){preview.hidden=true;$('.tree-person.is-selected',world)?.focus();}});
 draw();
}
