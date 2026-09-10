(()=>{
  'use strict';
  const errors=[];
  const clean=v=>String(v||'').replace(/https?:\/\/[^\s)]+/g,'[url]').slice(0,900);
  const record=(kind,value)=>{
    const msg=value?.message||value?.reason?.message||value?.reason||value||kind;
    const stack=value?.error?.stack||value?.reason?.stack||'';
    errors.push({kind,message:clean(msg),stack:clean(stack)});
    if(errors.length>4) errors.shift();
  };
  window.addEventListener('error',e=>record('JavaScript error',e));
  window.addEventListener('unhandledrejection',e=>record('Unhandled promise rejection',e));
  function visible(el){if(!el)return false;const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)!==0&&r.width>0&&r.height>0;}
  async function freshReload(){try{if('serviceWorker'in navigator){const regs=await navigator.serviceWorker.getRegistrations();await Promise.all(regs.map(r=>r.unregister()));}if('caches'in window){const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('duck-bear')).map(k=>caches.delete(k)));}}catch{}const u=new URL(location.href);u.searchParams.set('fresh',Date.now().toString());location.replace(u.toString());}
  function showDiagnostic(view){if(document.getElementById('duckBearBootDiagnostic'))return;const last=errors[errors.length-1],box=document.createElement('section');box.id='duckBearBootDiagnostic';box.style.cssText='max-width:720px;margin:32px auto;padding:22px;border:1px solid rgba(120,80,40,.22);border-radius:20px;background:#fffaf0;color:#232019;font:16px/1.5 system-ui,sans-serif;box-shadow:0 12px 35px rgba(0,0,0,.08)';const title=document.createElement('h2');title.textContent='🦥 Zoo HQ did not finish loading';title.style.margin='0 0 8px';const p=document.createElement('p');p.textContent=last?`${last.kind}: ${last.message}`:'The page shell loaded, but the main app did not render. This diagnostic is now active.';p.style.margin='0 0 14px';const code=document.createElement('code');code.textContent=last?.stack||'No browser error was reported.';code.style.cssText='display:block;white-space:pre-wrap;word-break:break-word;font-size:12px;padding:10px;border-radius:12px;background:#f4efe5;margin-bottom:14px';const btn=document.createElement('button');btn.type='button';btn.textContent='Reload Zoo HQ fresh';btn.style.cssText='min-height:44px;border:0;border-radius:12px;padding:10px 16px;background:#1f6b45;color:white;font-weight:800';btn.addEventListener('click',freshReload);box.append(title,p,code,btn);view.replaceChildren(box);}
  function inspect(){const view=document.getElementById('view');if(!view)return;for(const el of [...view.children]){if(!visible(el)){el.style.setProperty('display','block','important');el.style.setProperty('visibility','visible','important');el.style.setProperty('opacity','1','important');}}const hasUsefulContent=view.textContent.trim().length>2&&[...view.children].some(visible);if(!hasUsefulContent)showDiagnostic(view);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(inspect,2200),{once:true});else setTimeout(inspect,2200);
})();
