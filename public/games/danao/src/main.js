import { ARENAS } from './game/arena.js';
import { createDanaoRuntime } from './game/runtime.js';
import { mountApp } from './ui/App.js';

const canvas = document.getElementById('game');
const root = document.getElementById('app');
const status = document.getElementById('boot-status');

let app;
const runtime = createDanaoRuntime(canvas, {
  onStatus(text) {
    status.textContent = text;
    status.style.display = text === 'Ready' ? 'none' : 'block';
  },
  onHud(hud) { app?.setHud(hud); },
  onBanner(text) { app?.showRoundResult(text); },
  onBannerClear() { app?.clearBanner(); },
  onResult(result) { app?.showMatchResult(result); },
});

async function startFromState(state) {
  status.style.display = 'block';
  await runtime.startMatch({
    arenaId: state.arenaId,
    fighterId: state.fighterId,
    botCount: state.botCount,
    settings: state.settings,
  });
}

app = mountApp(root, {
  arenas: ARENAS,
  onStart: startFromState,
  onRestart: startFromState,
  onPause(paused) {
    runtime.setPaused(paused);
  },
  onQuit() {
    runtime.stopMatch();
    runtime.startMenuAudio();
    status.style.display = 'none';
  },
  onSettings(next) {
    runtime.setSettings(next);
  },
});


let menuAudioUnlocked = false;
function unlockMenuAudio() {
  if (menuAudioUnlocked || app?.getState().inMatch) return;
  menuAudioUnlocked = true;
  runtime.startMenuAudio();
}
window.addEventListener('pointerdown', unlockMenuAudio, { once: true, passive: true });
window.addEventListener('keydown', unlockMenuAudio, { once: true });

window.addEventListener('beforeunload', () => { app?.dispose?.(); runtime.dispose(); }, { once: true });
status.textContent = 'Ready — choose Play';
setTimeout(() => { if (!app.getState().inMatch) status.style.display = 'none'; }, 850);
