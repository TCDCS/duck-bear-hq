/* Navigation only. Existing login, roles, checkout and exports are unchanged. */
(() => {
  const actions=document.querySelector('.top-actions');
  if(actions){const link=document.createElement('a');link.href='/#games';link.textContent='Games';link.className='secondary';actions.prepend(link);}
  const view=document.getElementById('view');if(!view)return;
  const fix=()=>{const form=document.getElementById('loginForm');if(!form)return;const note=form.querySelector('.muted.tiny');if(note&&note.textContent!=='Games are open to everyone. Sign in for your orders, points and private account.')note.textContent='Games are open to everyone. Sign in for your orders, points and private account.';if(!form.querySelector('[data-public-home]')){const link=document.createElement('a');link.dataset.publicHome='1';link.href='/';link.className='secondary full';link.textContent='Back to the website';form.append(link);}};
  new MutationObserver(fix).observe(view,{childList:true,subtree:true});fix();
})();
