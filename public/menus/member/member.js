(() => {
'use strict';
const $=id=>document.getElementById(id);
let state=null, ratings={overallRating:0,tasteRating:0,platingRating:0};

function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function niceDate(v){if(!v)return ''; const d=new Date(v+'T12:00:00'); return new Intl.DateTimeFormat('en-IE',{weekday:'short',day:'numeric',month:'short',year:'numeric'}).format(d);}
function nextMonday(){
  const d=new Date(); d.setHours(12,0,0,0); const day=d.getDay()||7; d.setDate(d.getDate()+(8-day)%7); if(day===1)d.setDate(d.getDate()+7);
  return d.toISOString().slice(0,10);
}
async function api(path,opts={}){
  const r=await fetch(path,{credentials:'same-origin',...opts,headers:{...(opts.body instanceof FormData?{}:{'Content-Type':'application/json'}),...(opts.headers||{})}});
  let data={}; try{data=await r.json();}catch{}
  if(!r.ok){const e=new Error(data.error||'Request failed.');e.status=r.status;throw e;} return data;
}
function status(el,msg,type=''){el.textContent=msg;el.className='form-status '+type;}
function buildStars(rootId,count,name){
  const root=$(rootId); root.replaceChildren();
  for(let n=1;n<=count;n++){
    const b=document.createElement('button'); b.type='button'; b.textContent='★'; b.title=n+' star'+(n===1?'':'s'); b.dataset.value=n;
    if(name==='overallRating'&&n===5)b.classList.add('special-five');
    if(name==='overallRating'&&n===6)b.classList.add('special-six');
    b.addEventListener('click',()=>{ratings[name]=n;[...root.children].forEach((x,i)=>x.classList.toggle('selected',i<n));if(name==='overallRating')showOverallMeaning(n);});
    root.append(b);
  }
}
function showOverallMeaning(n){
  const m=$('overallMeaning'),special=state?.ratingLabels?.[n];
  if(special)m.textContent=n+' stars — '+special;
  else m.textContent=n? n+' star'+(n===1?'':'s') : 'Choose 1–6 stars.';
}
function setStars(rootId,name,value){
  ratings[name]=Number(value)||0;
  [...$(rootId).children].forEach((x,i)=>x.classList.toggle('selected',i<ratings[name]));
  if(name==='overallRating')showOverallMeaning(ratings[name]);
}
function mealOption(meal){
  const d=new Date(meal.meal_date+'T12:00:00');
  const day=new Intl.DateTimeFormat('en-IE',{weekday:'short'}).format(d);
  return day+' · '+meal.meal_type[0].toUpperCase()+meal.meal_type.slice(1)+' · '+meal.display_name;
}
function fillMeals(){
  const select=$('mealSelect'), current=select.value; select.replaceChildren();
  for(const meal of state.meals){
    const o=document.createElement('option');o.value=meal.id;o.textContent=mealOption(meal);select.append(o);
  }
  if(current&&state.meals.some(m=>m.id===current))select.value=current;
  select.dispatchEvent(new Event('change'));
}
function currentUserReview(mealId){return state.reviews.find(r=>r.meal_id===mealId&&r.user_id===state.user.id);}
function renderPhotoPreview(files=[]){
  const root=$('photoPreview');root.replaceChildren();
  const existing=currentUserReview($('mealSelect').value)?.photos||[];
  for(const p of existing){const img=document.createElement('img');img.src=p.url;img.alt='Existing food photo';root.append(img);}
  for(const file of files){const img=document.createElement('img');img.src=URL.createObjectURL(file);img.alt='Selected food photo';root.append(img);}
}
function loadReviewForMeal(){
  const r=currentUserReview($('mealSelect').value);
  setStars('overallStars','overallRating',r?.overall_rating||0);
  setStars('tasteStars','tasteRating',r?.taste_rating||0);
  setStars('platingStars','platingRating',r?.plating_rating||0);
  $('reviewForm').elements.comment.value=r?.comment||'';
  renderPhotoPreview();
}
function renderSuggestions(){
  const root=$('suggestionList');root.replaceChildren();
  if(!state.suggestions.length){root.innerHTML='<div class="empty-state">No menu suggestions yet.</div>';return;}
  for(const s of state.suggestions){
    const card=document.createElement('article');card.className='suggestion-card';
    card.innerHTML='<header><div><h3>'+escapeHtml(s.title)+'</h3><div class="suggestion-meta"><span class="meta-pill">'+escapeHtml(s.meal_type)+'</span><span class="meta-pill">Week '+escapeHtml(niceDate(s.target_week_start))+'</span><span class="meta-pill status-'+escapeHtml(s.status)+'">'+escapeHtml(s.status)+'</span></div></div><span class="small-note">'+escapeHtml(s.display_name||'')+'</span></header>'+
      (s.description?'<p>'+escapeHtml(s.description)+'</p>':'')+(s.notes?'<p><strong>Notes:</strong> '+escapeHtml(s.notes)+'</p>':'');
    if(state.user.role==='admin'){
      const actions=document.createElement('div');actions.className='admin-status-actions';
      for(const v of ['Suggested','Shortlisted','Planned','Skipped']){
        const b=document.createElement('button');b.type='button';b.textContent=v;b.disabled=s.status===v;
        b.addEventListener('click',()=>changeSuggestionStatus(s.id,v));actions.append(b);
      }
      card.append(actions);
    }
    root.append(card);
  }
}
function renderReviews(){
  const root=$('reviewList');root.replaceChildren();
  if(!state.reviews.length){root.innerHTML='<div class="empty-state">No meal reviews yet.</div>';return;}
  for(const r of state.reviews){
    const meal=state.meals.find(m=>m.id===r.meal_id); if(!meal)continue;
    const card=document.createElement('article');card.className='review-card';
    const photos=(r.photos||[]).map(p=>'<img src="'+escapeHtml(p.url)+'" alt="Food photo for '+escapeHtml(meal.display_name)+'" loading="lazy">').join('');
    card.innerHTML='<header><div><h3>'+escapeHtml(meal.display_name)+'</h3><div class="review-meta"><span class="meta-pill">'+escapeHtml(meal.meal_type)+'</span><span class="meta-pill">'+escapeHtml(niceDate(meal.meal_date))+'</span><span class="meta-pill">'+escapeHtml(r.display_name)+'</span></div></div><div class="overall-badge">'+r.overall_rating+' ★</div></header>'+
      '<div class="review-scores"><span>Taste: '+r.taste_rating+'/5</span><span>Plating: '+r.plating_rating+'/5</span></div>'+
      (r.overall_rating>=5?'<p class="review-meaning">'+escapeHtml(r.overall_label)+'</p>':'')+
      (r.comment?'<p>'+escapeHtml(r.comment)+'</p>':'')+
      (photos?'<div class="review-photos">'+photos+'</div>':'');
    root.append(card);
  }
}
function applyDashboard(d){
  state=d.dashboard||d;
  $('welcomeName').textContent=state.user.displayName+'’s Menu Room';
  $('roleChip').textContent=state.user.role;
  fillMeals();renderSuggestions();renderReviews();
}
async function changeSuggestionStatus(id,value){
  try{const d=await api('/api/menus/suggestions/'+encodeURIComponent(id)+'/status',{method:'POST',body:JSON.stringify({status:value})});applyDashboard(d);}
  catch(e){alert(e.message);}
}
async function uploadPhoto(file){
  const fd=new FormData();fd.set('file',file);fd.set('purpose','menu-review');
  const d=await api('/api/media/upload',{method:'POST',body:fd});return d.attachment;
}
async function boot(){
  buildStars('overallStars',6,'overallRating');buildStars('tasteStars',5,'tasteRating');buildStars('platingStars',5,'platingRating');
  $('suggestionForm').elements.targetWeekStart.value=nextMonday();
  try{
    const d=await api('/api/menus/dashboard');
    $('memberApp').hidden=false;applyDashboard(d);
  }catch(e){
    if(e.status===401){$('loginGate').hidden=false;return;}
    $('loginGate').hidden=false;$('loginGate').querySelector('p:not(.menu-kicker)').textContent='The Menu Room could not load: '+e.message;
  }
}
$('mealSelect').addEventListener('change',loadReviewForMeal);
$('suggestionForm').addEventListener('submit',async e=>{
  e.preventDefault();const form=e.currentTarget,fd=new FormData(form);status($('suggestionStatus'),'Saving…');
  try{
    const d=await api('/api/menus/suggestions',{method:'POST',body:JSON.stringify({
      title:fd.get('title'),mealType:fd.get('mealType'),targetWeekStart:fd.get('targetWeekStart'),description:fd.get('description'),notes:fd.get('notes')
    })});
    applyDashboard(d);form.elements.title.value='';form.elements.description.value='';form.elements.notes.value='';status($('suggestionStatus'),'Added to the planning pool.','success');
  }catch(err){status($('suggestionStatus'),err.message,'error');}
});
$('reviewPhotos').addEventListener('change',()=>renderPhotoPreview([...$('reviewPhotos').files]));
$('reviewForm').addEventListener('submit',async e=>{
  e.preventDefault();if(!ratings.overallRating||!ratings.tasteRating||!ratings.platingRating){status($('reviewStatus'),'Choose overall, taste and plating ratings.','error');return;}
  const form=e.currentTarget,files=[...$('reviewPhotos').files],existingCount=(currentUserReview(form.elements.mealId.value)?.photos||[]).length,remaining=4-existingCount;
  if(files.length>remaining){status($('reviewStatus'),remaining>0?'You can add '+remaining+' more photo'+(remaining===1?'':'s')+' to this review.':'This review already has four photos.','error');return;}
  status($('reviewStatus'),files.length?'Uploading photos…':'Saving review…');
  try{
    const attachments=[];for(const file of files)attachments.push(await uploadPhoto(file));
    const d=await api('/api/menus/reviews',{method:'POST',body:JSON.stringify({
      mealId:form.elements.mealId.value,overallRating:ratings.overallRating,tasteRating:ratings.tasteRating,platingRating:ratings.platingRating,
      comment:form.elements.comment.value,attachments
    })});
    applyDashboard(d);$('reviewPhotos').value='';renderPhotoPreview();status($('reviewStatus'),'Review saved.','success');
  }catch(err){status($('reviewStatus'),err.message,'error');}
});
boot();
})();