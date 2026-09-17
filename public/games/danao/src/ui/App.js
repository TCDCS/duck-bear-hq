const FIGHTERS = Object.freeze([
  { id: 'tiger', name: 'Tiger', chinese: '虎', style: 'Red jacket · fast hands' },
  { id: 'crane', name: 'Crane', chinese: '鹤', style: 'Teal sash · balanced' },
  { id: 'monkey', name: 'Monkey', chinese: '猴', style: 'Gold vest · slippery' },
  { id: 'ox', name: 'Ox', chinese: '牛', style: 'Blue coat · big hits' },
]);

export function createInitialUiState() {
  return {
    screen: 'menu',
    arenaId: 'courtyard',
    fighterId: 'tiger',
    botCount: 3,
    inMatch: false,
    paused: false,
    hud: [],
    banner: '',
    result: null,
    error: '',
    settings: {
      masterVolume: 0.72,
      music: true,
      sfx: true,
      cameraShake: true,
    },
  };
}

export function reduceUiState(state, action) {
  switch (action.type) {
    case 'OPEN_PLAY':
      return { ...state, screen: 'arena', error: '' };
    case 'OPEN_ARENAS':
      return { ...state, screen: 'arena', error: '' };
    case 'OPEN_FIGHTERS':
      return { ...state, screen: 'fighters', error: '' };
    case 'OPEN_SETTINGS':
      return { ...state, screen: 'settings', error: '' };
    case 'BACK_MENU':
      return { ...state, screen: 'menu', inMatch: false, paused: false, banner: '', result: null, error: '' };
    case 'SELECT_ARENA':
      return { ...state, arenaId: action.arenaId };
    case 'SELECT_FIGHTER':
      return { ...state, fighterId: action.fighterId };
    case 'SET_BOTS':
      return { ...state, botCount: Math.max(1, Math.min(3, Number(action.value) || 3)) };
    case 'SET_SETTING':
      return { ...state, settings: { ...state.settings, [action.key]: action.value } };
    case 'START_MATCH':
      return { ...state, screen: 'match', inMatch: true, paused: false, banner: '', result: null, error: '' };
    case 'PAUSE_MATCH':
      return state.inMatch ? { ...state, paused: true } : state;
    case 'RESUME_MATCH':
      return { ...state, paused: false };
    case 'HUD':
      return { ...state, hud: action.hud };
    case 'BANNER':
      return { ...state, banner: action.text || '' };
    case 'RESULT':
      return { ...state, screen: 'result', inMatch: false, paused: false, result: action.result, banner: '' };
    case 'ERROR':
      return { ...state, error: action.message || 'Danao could not start.' };
    default:
      return state;
  }
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[char]);
}

function menuButton(action, label, small = '') {
  return `<button class="menu-btn" data-action="${action}"><span>${label}</span>${small ? `<small>${small}</small>` : ''}</button>`;
}

function shell(content, className = '') {
  return `<div class="screen ${className}">${content}</div>`;
}

function mainMenu() {
  return shell(`
    <div class="title-lockup">
      <div class="seal">闹</div>
      <h1><span class="hanzi">大闹</span><span class="roman">DANAO</span></h1>
      <p>Wacky kung-fu. Big hits. Bigger knockouts.</p>
    </div>
    <div class="menu-stack">
      ${menuButton('play', 'PLAY', 'Jump straight to arena select')}
      ${menuButton('fighters', 'FIGHTERS', 'Pick your kung-fu troublemaker')}
      ${menuButton('arenas', 'ARENAS', 'Courtyard · Rooftop · Wrestling Ring')}
      ${menuButton('settings', 'SETTINGS', 'Audio · camera shake · controls')}
    </div>
    <div class="control-strip"><b>Keyboard</b> WASD · Space jump · J light · K heavy · L dodge <span></span><b>Gamepad</b> Left stick · A · X · Y · B</div>
  `, 'menu-screen');
}

function arenaScreen(state, arenas) {
  const cards = arenas.map((arena) => `
    <button class="arena-card ${state.arenaId === arena.id ? 'selected' : ''}" data-arena="${arena.id}">
      <div class="arena-thumb arena-${arena.id}"><span>${escapeHtml(arena.chineseName)}</span></div>
      <div><b>${escapeHtml(arena.name)}</b><p>${escapeHtml(arena.description)}</p></div>
    </button>
  `).join('');
  return shell(`
    <div class="panel wide">
      <div class="panel-head"><button class="back" data-action="back">←</button><div><span>CHOOSE THE CHAOS</span><h2>Arena Select</h2></div></div>
      <div class="arena-grid">${cards}</div>
      <div class="match-options">
        <label>Bots <select data-setting="bots"><option value="1" ${state.botCount === 1 ? 'selected' : ''}>1</option><option value="2" ${state.botCount === 2 ? 'selected' : ''}>2</option><option value="3" ${state.botCount === 3 ? 'selected' : ''}>3</option></select></label>
        <button class="start-btn" data-action="start">START FIGHT</button>
      </div>
    </div>
  `, 'panel-screen');
}

function fighterScreen(state) {
  const cards = FIGHTERS.map((fighter) => `
    <button class="fighter-card fighter-${fighter.id} ${state.fighterId === fighter.id ? 'selected' : ''}" data-fighter="${fighter.id}">
      <span class="fighter-mark">${fighter.chinese}</span><b>${fighter.name}</b><small>${fighter.style}</small>
    </button>
  `).join('');
  return shell(`
    <div class="panel">
      <div class="panel-head"><button class="back" data-action="back">←</button><div><span>PICK A TROUBLEMAKER</span><h2>Fighters</h2></div></div>
      <div class="fighter-grid">${cards}</div>
      <button class="start-btn secondary" data-action="back">DONE</button>
    </div>
  `, 'panel-screen');
}

function settingsScreen(state) {
  const s = state.settings;
  return shell(`
    <div class="panel settings-panel">
      <div class="panel-head"><button class="back" data-action="back">←</button><div><span>KEEP IT SIMPLE</span><h2>Settings</h2></div></div>
      <label class="setting-row"><span><b>Master volume</b><small>Overall game audio</small></span><input data-setting="masterVolume" type="range" min="0" max="1" step="0.05" value="${s.masterVolume}"></label>
      <label class="setting-row"><span><b>Music</b><small>Procedural kung-fu arcade soundtrack</small></span><input data-setting="music" type="checkbox" ${s.music ? 'checked' : ''}></label>
      <label class="setting-row"><span><b>Sound effects</b><small>Hits, jumps, ring-outs and menu sounds</small></span><input data-setting="sfx" type="checkbox" ${s.sfx ? 'checked' : ''}></label>
      <label class="setting-row"><span><b>Camera shake</b><small>Short impact shake on heavy hits</small></span><input data-setting="cameraShake" type="checkbox" ${s.cameraShake ? 'checked' : ''}></label>
      <button class="start-btn secondary" data-action="back">DONE</button>
    </div>
  `, 'panel-screen');
}

function matchScreen(state) {
  const hud = (state.hud || []).map((fighter, index) => `
    <div class="score-chip p${index + 1} ${fighter.danger > 0.58 ? 'danger' : ''} ${fighter.active === false ? 'out' : ''}">
      <span>${escapeHtml(fighter.name)}</span><b>${fighter.score ?? 0}</b>
      <em>${fighter.active === false ? 'RESPAWN' : fighter.danger > 0.58 ? 'EDGE!' : ''}</em>
      <i style="--health:${Math.max(0, Math.min(100, fighter.health ?? 100))}%"></i>
    </div>
  `).join('');
  const pause = state.paused ? `
    <div class="pause-overlay">
      <div class="pause-card"><span>暂停</span><h2>PAUSED</h2><p>Take a second. The chaos will still be here.</p>
        <button class="start-btn" data-action="resume">RESUME</button>
        <button class="pause-option" data-action="restart">RESTART MATCH</button>
        <button class="pause-option" data-action="quit">BACK TO MENU</button>
      </div>
    </div>` : '';
  return `<div class="match-ui"><div class="scoreboard">${hud}</div>${state.banner ? `<div class="round-banner">${escapeHtml(state.banner)}</div>` : ''}<button class="quit-match" data-action="pause">PAUSE</button>${pause}</div>`;
}

function resultScreen(state) {
  const winner = state.result?.winner || 'Winner';
  return shell(`
    <div class="result-card">
      <span class="result-kicker">MATCH OVER</span>
      <h2>${escapeHtml(winner)} wins!</h2>
      <div class="result-hanzi">胜</div>
      <button class="start-btn" data-action="start">REMATCH</button>
      <button class="text-btn" data-action="back">BACK TO MENU</button>
    </div>
  `, 'result-screen');
}

export function renderAppHtml(state, arenas = []) {
  let html = '';
  if (state.screen === 'arena') html = arenaScreen(state, arenas);
  else if (state.screen === 'fighters') html = fighterScreen(state);
  else if (state.screen === 'settings') html = settingsScreen(state);
  else if (state.screen === 'match') html = matchScreen(state);
  else if (state.screen === 'result') html = resultScreen(state);
  else html = mainMenu();
  if (state.error) html += `<div class="error-toast">${escapeHtml(state.error)}</div>`;
  return html;
}

export function mountApp(root, { arenas = [], onStart = async () => {}, onQuit = () => {}, onPause = () => {}, onRestart = async () => {}, onSettings = () => {} } = {}) {
  let state = createInitialUiState();

  const render = () => { root.innerHTML = renderAppHtml(state, arenas); };
  const dispatch = (action) => { state = reduceUiState(state, action); render(); };

  root.addEventListener('click', async (event) => {
    const arena = event.target.closest?.('[data-arena]');
    if (arena) return dispatch({ type: 'SELECT_ARENA', arenaId: arena.dataset.arena });
    const fighter = event.target.closest?.('[data-fighter]');
    if (fighter) return dispatch({ type: 'SELECT_FIGHTER', fighterId: fighter.dataset.fighter });
    const button = event.target.closest?.('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'play' || action === 'arenas') dispatch({ type: 'OPEN_PLAY' });
    else if (action === 'fighters') dispatch({ type: 'OPEN_FIGHTERS' });
    else if (action === 'settings') dispatch({ type: 'OPEN_SETTINGS' });
    else if (action === 'back') { if (state.screen === 'result') onQuit(); dispatch({ type: 'BACK_MENU' }); }
    else if (action === 'pause') { dispatch({ type: 'PAUSE_MATCH' }); onPause(true); }
    else if (action === 'resume') { dispatch({ type: 'RESUME_MATCH' }); onPause(false); }
    else if (action === 'restart') {
      onPause(false);
      state = reduceUiState(state, { type: 'START_MATCH' });
      render();
      try { await onRestart(structuredClone(state)); }
      catch (error) { dispatch({ type: 'ERROR', message: error?.message || 'Could not restart the match.' }); }
    }
    else if (action === 'quit') { onPause(false); onQuit(); dispatch({ type: 'BACK_MENU' }); }
    else if (action === 'start') {
      state = reduceUiState(state, { type: 'START_MATCH' });
      render();
      try { await onStart(structuredClone(state)); }
      catch (error) { dispatch({ type: 'ERROR', message: error?.message || 'Could not start the match.' }); }
    }
  });

  root.addEventListener('input', (event) => {
    const input = event.target;
    if (!input?.dataset?.setting) return;
    const key = input.dataset.setting;
    if (key === 'bots') dispatch({ type: 'SET_BOTS', value: input.value });
    else {
      const value = input.type === 'checkbox' ? input.checked : Number(input.value);
      state = reduceUiState(state, { type: 'SET_SETTING', key, value });
      onSettings(structuredClone(state.settings));
      if (input.type !== 'range') render();
    }
  });


  const pauseKeyHandler = (event) => {
    if (!state.inMatch || state.screen !== 'match') return;
    if (event.code !== 'Escape' && event.code !== 'KeyP') return;
    event.preventDefault?.();
    const nextPaused = !state.paused;
    state = reduceUiState(state, { type: nextPaused ? 'PAUSE_MATCH' : 'RESUME_MATCH' });
    render();
    onPause(nextPaused);
  };
  globalThis.addEventListener?.('keydown', pauseKeyHandler, { passive: false });

  render();
  return {
    getState: () => structuredClone(state),
    setHud: (hud) => { state = reduceUiState(state, { type: 'HUD', hud }); if (state.screen === 'match') render(); },
    showRoundResult: (text) => { state = reduceUiState(state, { type: 'BANNER', text }); if (state.screen === 'match') render(); },
    clearBanner: () => { state = reduceUiState(state, { type: 'BANNER', text: '' }); if (state.screen === 'match') render(); },
    showMatchResult: (result) => { state = reduceUiState(state, { type: 'RESULT', result }); render(); },
    showError: (message) => dispatch({ type: 'ERROR', message }),
    setPaused: (paused) => { state = reduceUiState(state, { type: paused ? 'PAUSE_MATCH' : 'RESUME_MATCH' }); render(); },
    dispose: () => globalThis.removeEventListener?.('keydown', pauseKeyHandler),
  };
}
