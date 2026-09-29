/** Shared chapter styling only. No account records, permissions or persistence live here. */
const chapters={
 home:{id:'home',label:'Our little world',art:'plans'},
 menus:{id:'menus',label:'At our table',art:'menus'},
 family:{id:'family',label:'Our favourite people',art:'family'},
 scrapbook:{id:'scrapbook',label:'The memory book',art:'scrapbook'},
 plans:{id:'plans',label:'Little adventures',art:'plans'},
 info:{id:'info',label:'Good things to know',art:'info'},
 settings:{id:'settings',label:'Make yourself at home',art:'settings'},
 admin:{id:'admin',label:'Behind the scenes',art:'settings'},
 auth:{id:'auth',label:'Your private entrance',art:'settings'},
 games:{id:'games',label:'A little friendly chaos',art:'games'},
 shop:{id:'shop',label:'Little treats',art:'menus'}
};
export function chapterFor(path='/'){
 const part=path.split('/').filter(Boolean)[0]||'';
 const id=({menus:'menus','family-tree':'family',scrapbook:'scrapbook','image-library':'scrapbook',plans:'plans',info:'info',settings:'settings',admin:'admin',games:'games',shop:'shop',orders:'shop',points:'shop','sign-in':'auth','reset-password':'auth','verify-email':'auth','accept-invitation':'auth'})[part]||'home';
 return chapters[id];
}
export function applySketchChapter(path=globalThis.location?.pathname||'/'){
 if(typeof document==='undefined'||!document.body)return;
 const chapter=chapterFor(path);document.body.dataset.chapter=chapter.id;
 document.documentElement.classList.add('sketch-theme');
 for(const meta of document.querySelectorAll('meta[name="theme-color"]'))meta.content='#fff4db';
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>applySketchChapter(),{once:true});
 else applySketchChapter();
}

// Legacy public menu shells use only the public signed-in boolean, never account bootstrap.
if(typeof document!=='undefined' && location.pathname.startsWith('/menus/') && document.querySelector('[data-signed-in]')){
 fetch('/api/public/session',{credentials:'same-origin',cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{
  if(d?.signedIn)document.querySelectorAll('[data-signed-in]').forEach(a=>a.hidden=false);
 }).catch(()=>{});
}
