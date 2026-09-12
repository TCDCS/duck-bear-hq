/* Public landing page. No account bootstrap, photos, points or orders are fetched. */
(() => {
'use strict';
const $=id=>document.getElementById(id);
const cast=globalThis.KartPortraits,art=$('gameCover');
if(Array.isArray(cast)&&cast.length>=5){const names=['Zachary','Guannan','Sara','Samy','Mulan'];for(let i=0;i<5;i++){const img=new Image();img.src=cast[i];img.alt=names[i]+' cartoon driver';img.style.left=[12.7,30,48.7,68,86.5][i]+'%';img.style.top=[63,51,63,51,63][i]+'%';art.append(img);}art.hidden=false;$('coverFallback').hidden=true;}
fetch('/api/public/session',{credentials:'same-origin',cache:'no-store'}).then(r=>r.ok?r.json():null).then(s=>{if(s?.signedIn){$('publicSignIn').textContent='My account ↗';$('publicSignIn').href='/account#home';}}).catch(()=>{});
fetch('/api/public/catalogue').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{
  const root=$('publicProducts');root.replaceChildren();
  if(!Array.isArray(data.products)||!data.products.length){const p=document.createElement('p');p.className='catalogue-status';p.textContent='The gift shop is having a breather. Games are open as usual.';root.append(p);return;}
  for(const product of data.products){
    const card=document.createElement('article');card.className='public-product';
    const icon=document.createElement('span');icon.className='product-emoji';icon.textContent=product.emoji;
    const category=document.createElement('small');category.textContent=product.category;
    const title=document.createElement('h3');title.textContent=product.name;
    const copy=document.createElement('p');copy.textContent=product.blurb;
    const bottom=document.createElement('div');bottom.className='product-bottom';
    const price=document.createElement('strong');price.textContent='£0.00';
    const order=document.createElement('a');order.href='/account#shop';order.textContent='Sign in to order →';
    bottom.append(price,order);card.append(icon,category,title,copy,bottom);root.append(card);
  }
}).catch(()=>{$('publicProducts').replaceChildren();const p=document.createElement('p');p.className='catalogue-status';p.textContent='The gift-shop catalogue is temporarily unavailable. You can still play every game above.';$('publicProducts').append(p);});
function legacyLink(){const hash=location.hash;if(hash==='#fun?games'||hash==='#fun'){location.hash='games';return;}if(/^#(orders|loyalty|admin|rewards)(\?|$)/.test(hash))location.replace('/account'+hash);}
legacyLink();window.addEventListener('hashchange',legacyLink);
if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
})();
