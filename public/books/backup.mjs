import {API,esc,request,message,button} from './common.mjs';
import {readZip} from '../hq/zip.mjs';
const MAX_BACKUP_BYTES=180*1024*1024;
export async function mountBooksBackup({me,onBack}){
 if(!me?.owner)throw new Error('Only Zachary can manage the shared library backup.');
 const main=document.querySelector('#main');main.innerHTML=`<div class="hero"><div><p class="eyebrow">LIBRARY RECOVERY</p><h1>Book backups</h1><p>Keep a private copy of the library records and books uploaded here.</p></div><button class="quiet" id="backup-back">Back to books</button></div><section class="settings-card"><h2>Save a backup</h2><p>The ZIP contains your catalogue, uploaded books and covers, collections, preferences, and both readers’ saved notes and progress. It contains no Google tokens, passwords or website sign-in details.</p><p class="warning">Google Drive originals are not included. Keep your HDD or another separate backup of those files. Protect this ZIP: it includes private reading records.</p><a class="action" href="${API}/backup" download="duck-bear-books-backup.zip">Download Books backup</a></section><section class="settings-card"><h2>Recover an empty Books library</h2><p>Recovery never wipes or overwrites existing Books records. It needs the same household accounts in the target website. Your other Duck &amp; Bear sections are not changed.</p><p>Choose a backup to preview it before anything is restored. ZIP limit: 180 MB. If it is larger, use a database export and a separate private-file backup.</p><label for="books-backup-file">Choose a Books backup ZIP</label><input id="books-backup-file" type="file" accept=".zip,application/zip"><div id="restore-result" role="status" aria-live="polite" class="stack"></div></section>`;
 document.querySelector('#backup-back').onclick=onBack;
 const picker=document.querySelector('#books-backup-file'),result=document.querySelector('#restore-result');
 picker.onchange=async()=>{const file=picker.files?.[0];if(!file)return;picker.disabled=true;result.replaceChildren();try{
  if(file.size>MAX_BACKUP_BYTES)throw new Error('Choose a Books backup ZIP under 180 MB.');
  result.textContent='Checking the archive…';const entries=readZip(await file.arrayBuffer()),bytes=entries.get('manifest.json');
  if(!bytes||bytes.length>8*1024*1024)throw new Error('The backup manifest is missing or too large.');
  const manifest=JSON.parse(new TextDecoder().decode(bytes));
  const preview=await request(API+'/restore/preview',{method:'POST',data:{manifest}});
  result.innerHTML=`<h3>Backup preview</h3><p>${Number(preview.books)||0} books · ${Number(preview.uploadedFiles)||0} uploaded files · ${Number(preview.readingPositions)||0} reading positions · ${Number(preview.annotations)||0} notes and bookmarks.</p><p class="warning">${esc(preview.warning)}</p>`;
  if(!preview.canRestore||!preview.jobId)return;
  if(!Array.isArray(manifest.objects)||manifest.objects.some(o=>!entries.has(o.path)))throw new Error('An original or cover is missing from the archive.');
  const label=document.createElement('label');label.htmlFor='confirm-books-restore';label.textContent='Type RESTORE BOOKS to confirm';const confirmation=document.createElement('input');confirmation.id='confirm-books-restore';confirmation.autocomplete='off';
  const progress=document.createElement('p');progress.setAttribute('role','status');
  const apply=button('Restore Books',async()=>{confirmation.disabled=true;picker.disabled=true;try{let index=0;for(const object of manifest.objects){progress.textContent=`Checking and uploading file ${++index} of ${manifest.objects.length}…`;await request(`${API}/restore/${encodeURIComponent(preview.jobId)}/files/${encodeURIComponent(object.fileId)}`,{method:'PUT',headers:{'content-type':'application/octet-stream'},body:entries.get(object.path)});}progress.textContent='Restoring records…';const done=await request(`${API}/restore/${encodeURIComponent(preview.jobId)}/apply`,{method:'POST',data:{confirm:confirmation.value}});result.replaceChildren();const text=document.createElement('p');text.textContent=done.message;result.append(text,button('Open books',onBack));}catch(e){progress.textContent=e.message;confirmation.disabled=false;throw e;}finally{picker.disabled=false;}});
  apply.disabled=true;confirmation.oninput=()=>{apply.disabled=confirmation.value!=='RESTORE BOOKS';};result.append(label,confirmation,apply,progress);
 }catch(e){result.textContent=e.message;message(e.message,true);}finally{picker.disabled=false;}};
}
