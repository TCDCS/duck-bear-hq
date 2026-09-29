export const $=selector=>document.querySelector(selector);
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const names={breakfast:'Breakfast',lunch:'Lunch',dinner:'Dinner',other:'Other'};
export const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
export async function api(path,options={}){
 const headers=new Headers(options.headers||{});if(options.body!==undefined&&!(options.body instanceof FormData))headers.set('Content-Type','application/json');
 let response;try{response=await fetch(path,{...options,headers,body:options.body instanceof FormData?options.body:options.body===undefined?undefined:JSON.stringify(options.body),credentials:'same-origin',cache:'no-store'});}catch{throw new Error('The connection was interrupted. Your unsaved text is still here. Try again.');}
 let result;try{result=await response.json();}catch{throw new Error('The website returned an unexpected response. Please try again.');}
 if(!response.ok){const error=new Error(result.error||'This action could not be completed.');error.status=response.status;throw error;}return result;
}
let toastTimer;
export function toast(message){$('#toast').textContent=message;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('#toast').textContent='';},5500);}
export function dateLabel(value){if(!value)return 'Date not set';return new Intl.DateTimeFormat('en-IE',{day:'numeric',month:'short',year:'numeric'}).format(new Date(value+'T12:00:00Z'));}
export function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function nextMonday(){const d=new Date(today()+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return d.toISOString().slice(0,10);}
export function title(heading,description,action='',label='OUR LITTLE WORLD'){
 document.title=heading+' · Duck & Bear';return `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/our-space/">Our space</a><span aria-hidden="true">/</span><span>${esc(heading)}</span></nav><div class="page-heading"><div><p class="eyebrow">${esc(label)}</p><h1>${esc(heading)}</h1><p>${esc(description)}</p></div>${action}</div>`;
}
export function button(label,id,classes='primary'){return `<button type="button" class="button ${esc(classes)}" id="${esc(id)}">${esc(label)}</button>`;}
export function field(name,label,value='',type='text',extra=''){return `<label class="field"><span>${esc(label)}</span><input type="${esc(type)}" name="${esc(name)}" value="${esc(value)}" ${extra}></label>`;}
export function area(name,label,value='',max=4000){return `<label class="field"><span>${esc(label)}</span><textarea name="${esc(name)}" maxlength="${max}" rows="4">${esc(value)}</textarea></label>`;}
export function select(name,label,value,options){return `<label class="field"><span>${esc(label)}</span><select name="${esc(name)}">${options.map(([v,l])=>`<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(l)}</option>`).join('')}</select></label>`;}
export function check(name,label,checked=false){return `<label class="check"><input type="checkbox" name="${esc(name)}" ${checked?'checked':''}>${esc(label)}</label>`;}
export function photoField(mediaId){return `<div class="photo-input">${field('photo','Photo · JPEG, PNG or WebP (up to 8 MiB)','','file','accept="image/jpeg,image/png,image/webp"')}<p class="hint">Images are resized and metadata is removed before upload. Private photos stay in this section.</p><img id="upload-preview" alt="Selected photo preview" ${mediaId?`src="/media/site/${esc(mediaId)}"`:'hidden'}>${mediaId?check('removePhoto','Remove the current photo'):''}</div>`;}
export function empty(message){return `<div class="empty"><p>${esc(message)}</p><span aria-hidden="true">✿</span></div>`;}
export function cover(session,section){const c=session.covers?.find(c=>c.slot===section);return c?`<img class="section-cover" src="${esc(c.url)}" alt="${esc(c.alt)}">`:'';}
export function requireAccess(session,key,level=1){if((session.access[key]||0)>=level)return true;$('#content').innerHTML=title('A private little corner','You do not have access to this section.')+`<div class="paper"><p>Ask the site owner to check your permissions. The scrapbook is only for Duck &amp; Bear.</p><a class="button primary" href="/our-space/">Back to our space</a></div>`;return false;}
export function data(form){return Object.fromEntries(new FormData(form));}
export async function withButton(button,task){const old=button.textContent;button.disabled=true;button.textContent='Saving…';try{return await task();}finally{button.disabled=false;button.textContent=old;}}
let unsaved=false,previewUrl=null;
export function markDirty(){unsaved=true;if($("#editor")?.open)$("#editor-form").dataset.dirty="1";}
export function markSaved(){unsaved=false;}
window.addEventListener('beforeunload',e=>{if(unsaved){e.preventDefault();e.returnValue='';}});
const dialog=$('#editor'),form=$('#editor-form');let onSave=null;
function closeEditor(){if(form.dataset.dirty==='1'&&!confirm('Discard the unsaved changes in this editor?'))return;dialog.close();markSaved();if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}}
$('#close-editor').addEventListener('click',closeEditor);$('#cancel-editor').addEventListener('click',closeEditor);dialog.addEventListener('cancel',e=>{e.preventDefault();closeEditor();});
form.addEventListener('input',()=>{form.dataset.dirty='1';markDirty();});
form.addEventListener('submit',async event=>{event.preventDefault();$('#editor-error').textContent='';try{await withButton($('#save-editor'),async()=>{await onSave(data(form),form);});form.dataset.dirty='';markSaved();dialog.close();if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}}catch(error){$('#editor-error').textContent=error.message;$('#editor-error').scrollIntoView({block:'nearest'});}});
export function editor(heading,html,save,label='Save'){
 $('#editor-title').textContent=heading;$('#editor-fields').innerHTML=html;$('#save-editor').textContent=label;$('#editor-error').textContent='';form.dataset.dirty='';onSave=save;dialog.showModal();
 const input=form.querySelector('input[type=file]');input?.addEventListener('change',()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);const file=input.files[0];if(file){previewUrl=URL.createObjectURL(file);const preview=$('#upload-preview');preview.src=previewUrl;preview.hidden=false;}});
}
export async function uploadedPhoto(form,section,existing=null){
 if(form.elements.removePhoto?.checked)return null;const file=form.elements.photo?.files?.[0];if(!file)return existing;
 if(file.size>8*1024*1024)throw new Error('Choose a photo smaller than 8 MiB.');if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Choose a JPEG, PNG or WebP image.');
 let bitmap;try{bitmap=await createImageBitmap(file);}catch{throw new Error('This photo could not be opened. Try another JPEG, PNG or WebP.');}
 const scale=Math.min(1,2000/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,file.type==='image/png'?'image/png':'image/jpeg',.86));if(!blob)throw new Error('This photo could not be prepared. Please try another.');
 const payload=new FormData();payload.set('section',section);payload.set('file',new File([blob],blob.type==='image/png'?'photo.png':'photo.jpg',{type:blob.type}));const response=await api('/api/site/media',{method:'POST',body:payload});return response.media.id;
}
export function bindSearch(input,render){input.addEventListener('input',()=>render(input.value.toLowerCase().trim()));}
export function showPhoto(id,alt){const viewer=$('#photo-viewer');$('#viewer-image').src='/media/site/'+encodeURIComponent(id);$('#viewer-image').alt=alt;viewer.showModal();}
$('#close-photo').addEventListener('click',()=>{$('#photo-viewer').close();$('#viewer-image').removeAttribute('src');});
