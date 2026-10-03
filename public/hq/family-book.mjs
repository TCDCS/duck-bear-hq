import {$,api,esc,action,empty,select,linkButton,toast} from './client.mjs';
import {buildBook,renderBookHtml} from './family-book-model.mjs';
export async function familyBookView(A){
 if(!A.me.access.family?.export){A.content.innerHTML=empty('Export permission required','Ask the tree owner to enable family export for your account.');return;}
 A.content.innerHTML=`<header class="genealogy-heading"><div><p class="genealogy-kicker">DUCK & BEAR · FAMILY</p><h1>Books & PDF export</h1><p class="genealogy-description">Create a printable book from the saved family tree. Nothing is sent to an external service.</p></div>${linkButton('/family-tree/tree/','Back to tree',true)}</header><section class="panel family-book-settings"><div class="form-grid"><label class="field">Book title<input id="book-title" maxlength="160" placeholder="Our family, branch by branch"></label>${select('book-format','Format',[['child','Child’s family storybook'],['reference','Complete family reference book'],['tree','Entire tree — linked family sheets']],'child')}</div><p id="book-format-note">A page for every recorded person, with approved child-friendly text, name meanings, family connections and photos. Raw notes and unresolved research are not copied into this edition.</p>${A.me.pair?'<label class="check"><input type="checkbox" id="book-faith">Include recorded religion / family faith background</label><label class="check"><input type="checkbox" id="book-private" disabled>Include confidential household appendix (reference book only)</label>':''}<p class="family-warning">Review before sharing, especially photographs and child-friendly text. The child’s edition excludes household addresses, exact private birth details and allergies. It is not a full evidence archive.</p><div class="actions"><button class="button" id="book-build">Build preview</button><button class="button secondary" id="book-print" disabled>Print / Save as PDF</button></div><p id="book-status" role="status"></p><p class="muted">Choose Save as PDF in your browser’s print window. Use A4, enable background graphics and turn browser headers and footers off. Your site data is unchanged.</p></section><div id="book-preview-host"></div>`;
 let iframe=null,ready=false,generation=0;
 const format=$('[name=book-format]'),status=$('#book-status'),print=$('#book-print'),host=$('#book-preview-host');
 function invalidate(){generation++;ready=false;print.disabled=true;if(iframe){iframe.remove();iframe=null;}status.textContent='';}
 format.onchange=()=>{invalidate();const choice=format.value,priv=$('#book-private');if(priv){priv.disabled=choice!=='reference';if(priv.disabled)priv.checked=false;}$('#book-format-note').textContent=choice==='child'?'A page for every recorded person, with approved child-friendly text, name meanings, family connections and photos. Raw notes and unresolved research are not copied into this edition.':choice==='reference'?'All active family records, including full names, dates, photographs, relationships, every stored event, places, sources and unresolved research. Household information is optional and private. This does not replace the backup with original image files and revision history.':'A printable family sheet for every person, with parents, partners, children and siblings. Connections stay readable across pages instead of shrinking the entire tree onto one tiny sheet.';};
 for(const id of ['book-title','book-faith','book-private'])$('#'+id)?.addEventListener('input',invalidate);
 action($('#book-build'),async()=>{
  invalidate();const attempt=generation;status.textContent='Preparing the saved family records…';
  const mode=format.value,includePrivate=$('#book-private')?.checked===true,includeFaith=$('#book-faith')?.checked===true;
  const q=new URLSearchParams({mode,private:includePrivate?'1':'0',faith:includeFaith?'1':'0'});
  const snapshot=await api('/api/hq/family/book?'+q);if(attempt!==generation||!host.isConnected)return;
  const book=buildBook(snapshot.records,{mode,title:$('#book-title').value,includePrivate,includeFaith});
  if(!book.people.length){status.textContent='No family members to export yet.';return;}
  const frame=document.createElement('iframe');iframe=frame;iframe.className='family-book-preview';iframe.title='Printable family book preview';iframe.setAttribute('sandbox','allow-same-origin allow-modals');
  const loaded=new Promise(resolve=>frame.addEventListener('load',resolve,{once:true}));frame.srcdoc=renderBookHtml(book);host.append(frame);await loaded;
  if(attempt!==generation||!frame.isConnected)return;await frame.contentDocument.fonts.ready;
  if(attempt!==generation||!frame.isConnected)return;const images=[...frame.contentDocument.images];await Promise.all(images.map(img=>img.decode().catch(()=>{})));
  if(attempt!==generation||!frame.isConnected)return;
  const missing=images.filter(i=>!i.naturalWidth).length;ready=true;print.disabled=false;
  status.textContent=`Preview ready: ${book.people.length} people, pets and associates${mode==='reference'?' · '+book.recordCount+' records':''}${missing?' · '+missing+' images could not be loaded; check before printing':''}${includePrivate?' · CONFIDENTIAL household appendix included':''}.`;
 });
 print.onclick=()=>{if(!ready||!iframe)return;iframe.contentWindow.focus();iframe.contentWindow.print();};
}
