import { ARENAS } from './game/arena.js';
import { createDanaoRuntime } from './game/runtime.js';
import { mountApp } from './ui/App.js';
import { createDanaoRoomClient } from './online/room-client.js';
import { mountOnlineLobby } from './online/lobby.js';
import { createOnlineMatchBridge } from './online/match-bridge.js';

const canvas = document.getElementById('game');
const root = document.getElementById('app');
const onlineRoot = document.getElementById('online-shell');
const status = document.getElementById('boot-status');

let app;
let onlineLobby;
let onlineBridge;
const onlineClient = createDanaoRoomClient();

const runtime = createDanaoRuntime(canvas, {
  onStatus(text) {
    status.textContent = text;
    status.style.display = text === 'Ready' ? 'none' : 'block';
  },
  onHud(hud) { app?.setHud(hud); },
  onBanner(text) { app?.showRoundResult(text); },
  onBannerClear() { app?.clearBanner(); },
  onResult(result) {
    app?.showMatchResult(result);
    if (onlineBridge?.active && onlineClient.isHost) onlineBridge.reportResult(result);
  },
});

onlineBridge = createOnlineMatchBridge({
  client: onlineClient,
  runtime,
  onError(message) {
    app?.showError?.(message);
  },
  onResult(result) {
    const winnerPlayer = onlineClient.room?.players?.find?.((player) => player.id === result?.winner);
    onlineBridge.stop();
    onlineClient.leave();
    app?.showMatchResult({
      winner: winnerPlayer?.character || winnerPlayer?.name || 'Winner',
      online: true,
    });
  },
});

async function startFromState(state) {
  if (onlineBridge?.active) onlineBridge.stop();
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
    if (onlineBridge?.active) {
      if (paused) app?.setPaused?.(false);
      return;
    }
    runtime.setPaused(paused);
  },
  onQuit() {
    if (onlineBridge?.active) onlineBridge.stop();
    if (onlineClient.room) onlineClient.leave();
    runtime.stopMatch();
    runtime.startMenuAudio();
    status.style.display = 'none';
  },
  onSettings(next) {
    runtime.setSettings(next);
  },
});

onlineLobby = mountOnlineLobby(onlineRoot, {
  client: onlineClient,
  getLocalState: () => app?.getState?.() || {},
  async onStartOnline({ room, localPlayerId, arenaId }) {
    const state = app?.getState?.() || {};
    app?.beginMatch?.();
    status.textContent = 'Connecting online fight…';
    status.style.display = 'block';
    try {
      await onlineBridge.start({
        room,
        localPlayerId,
        arenaId,
        settings: state.settings || {},
      });
      status.style.display = 'none';
    } catch (error) {
      onlineBridge.stop();
      app?.returnToMenu?.();
      status.style.display = 'none';
      throw error;
    }
  },
  onReturnLocal() {
    if (onlineBridge?.active) onlineBridge.stop();
    app?.returnToMenu?.();
    runtime.startMenuAudio();
    status.style.display = 'none';
  },
});

let onlineFrameId = 0;
function onlineFrame(time) {
  if (onlineBridge?.active) onlineBridge.tick(time);
  onlineFrameId = globalThis.requestAnimationFrame?.(onlineFrame) || 0;
}
onlineFrameId = globalThis.requestAnimationFrame?.(onlineFrame) || 0;

let menuAudioUnlocked = false;
function unlockMenuAudio() {
  if (menuAudioUnlocked || app?.getState().inMatch) return;
  menuAudioUnlocked = true;
  runtime.startMenuAudio();
}
window.addEventListener('pointerdown', unlockMenuAudio, { once: true, passive: true });
window.addEventListener('keydown', unlockMenuAudio, { once: true });

window.addEventListener('beforeunload', () => {
  if (onlineFrameId) globalThis.cancelAnimationFrame?.(onlineFrameId);
  onlineLobby?.dispose?.();
  onlineBridge?.dispose?.();
  onlineClient.close?.();
  app?.dispose?.();
  runtime.dispose();
}, { once: true });

status.textContent = 'Ready — choose Play';
setTimeout(() => { if (!app.getState().inMatch) status.style.display = 'none'; }, 850);
