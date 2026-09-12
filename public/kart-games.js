/* Adds the Games tab without changing the existing shop, loyalty or fun handlers. */
(() => {
  'use strict';
  const view=document.getElementById('view');
  if(!view) return;
  const gamesHash='#fun?games';
  const isGames=()=>location.hash===gamesHash;
  function sync() {
    const tabs=view.querySelector('.fun-tabs');
    const panel=view.querySelector('#funPanel');
    if(!tabs || !panel) return;
    let tab=tabs.querySelector('[data-kart-tab]');
    if(!tab) {
      tab=document.createElement('button');
      tab.type='button';tab.className='tab-btn';tab.dataset.kartTab='games';
      tab.textContent='🎮 Games';
      tab.addEventListener('click',()=>{if(isGames()) sync();else location.hash=gamesHash;});
      tabs.append(tab);
    }
    tab.classList.toggle('active',isGames());
    if(!isGames()) return;
    tabs.querySelectorAll('[data-action="fun-tab"]').forEach(x=>x.classList.remove('active'));
    if(panel.querySelector('#proper-karted-card')) return;
    panel.innerHTML=`<div class="cards-2"><article class="fun-card" id="proper-karted-card">
      <p class="eyebrow">Duck & Bear Games</p><div class="big-icon" aria-hidden="true">🏎️🇬🇧</div>
      <h2>Proper Karted: London</h2>
      <p>Race through Hyde Park, Regent Street, Westminster, Camden and the Docklands. British power-ups, seven rivals and absolutely no sensible driving.</p>
      <p class="muted">Zachary, Guannan, Sara, Samy and Mulan are on the starting grid.</p>
      <a class="primary" href="/games/proper-karted/?play=1">Play Proper Karted →</a>
      <p class="muted tiny">Opens its own full-page game. Keyboard or touch controls. Landscape works best on phones.</p>
    </article><aside class="fun-card"><h2>Before the lights go out</h2>
      <p>Use the arrow keys or W A S D to drive. On a phone, use the on-screen controls.</p>
      <p>Pause and choose Back to the paddock to change driver or circuit. Choose Back to Duck &amp; Bear Games to return to the website. Sound starts after your first tap or key press.</p>
      <p class="muted tiny">Single-player with computer opponents. Driver settings and best times are saved on this browser; they do not change Yaya Points.</p>
    </aside></div>`;
  }
  // Returning to another Fun tab must remove the games query before the existing
  // delegated click handler renders that tab. It still owns all normal actions.
  document.addEventListener('click',e=>{
    if(isGames() && e.target.closest('[data-action="fun-tab"]')) history.replaceState(null,'','#fun');
  },true);
  new MutationObserver(sync).observe(view,{childList:true,subtree:true});
  window.addEventListener('hashchange',sync);
  window.addEventListener('pageshow',sync);
  sync();
})();
