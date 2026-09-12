/* Games tab extension. Existing website handlers retain ownership of every other tab. */
(()=>{
  'use strict';
  const view=document.getElementById('view');if(!view)return;
  const gamesHash='#fun?games',isGames=()=>location.hash===gamesHash;
  function sync(){
    const tabs=view.querySelector('.fun-tabs'),panel=view.querySelector('#funPanel');
    if(!tabs||!panel)return;
    let tab=tabs.querySelector('[data-kart-tab]');
    if(!tab){tab=document.createElement('button');tab.type='button';tab.className='tab-btn';tab.dataset.kartTab='games';tab.textContent='🎮 Games';tab.addEventListener('click',()=>{if(isGames())sync();else location.hash=gamesHash;});tabs.append(tab);}
    tab.classList.toggle('active',isGames());if(!isGames())return;
    tabs.querySelectorAll('[data-action="fun-tab"]').forEach(x=>x.classList.remove('active'));
    if(panel.querySelector('#wacky-races-card'))return;
    panel.innerHTML=`<div class="cards-2"><article class="fun-card" id="wacky-races-card">
      <p class="eyebrow">Duck &amp; Bear Games</p><div class="big-icon" aria-hidden="true">🏎️ 🇬🇧 🇮🇪</div>
      <h2>Wacky Races</h2><p>Five London circuits and Dublin — Liffey Lunacy. Race karts, police cars, ambulances or buses. Collect fruit and chocolate ice cream. Mind the pizza and whiskey spills.</p>
      <p class="muted">Zachary, Guannan, Sara, Samy and Mulan are on the starting grid.</p>
      <a class="primary" href="/games/wacky-races/">Play Wacky Races →</a>
      <p class="muted tiny">Opens race setup first. Choose your circuit, driver and vehicle, then press Start race. Keyboard, gamepad, touch or optional tilt steering. Landscape works best on phones.</p>
    </article><aside class="fun-card"><h2>Before the lights go out</h2>
      <p>Arrow keys or W A S D to steer. Shift to drift, Space to use an item and R to recover. On a phone, use the on-screen buttons.</p>
      <p>Pause and choose Controls &amp; sound to enable tilt steering. Tap Enable tilt steering, allow motion access, then calibrate while holding the phone comfortably. Touch controls remain available.</p>
      <p>Choose Back to the paddock to change driver, vehicle or circuit. Choose Games to return here. Sound starts after a tap or key press.</p>
      <p class="muted tiny">Solo races and live multiplayer rooms for up to seven friends. Saves stay on this browser and do not change Yaya Points. Optional streamed music needs an internet connection; the built-in music and effects do not.</p>
    </aside></div>`;
  }
  document.addEventListener('click',e=>{if(isGames()&&e.target.closest('[data-action="fun-tab"]'))history.replaceState(null,'','#fun');},true);
  new MutationObserver(sync).observe(view,{childList:true,subtree:true});
  window.addEventListener('hashchange',sync);window.addEventListener('pageshow',sync);sync();
})();
