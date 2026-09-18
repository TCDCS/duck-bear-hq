import { ARENAS } from './game/arena.js';
import { createDanaoRuntime } from './game/runtime.js';
import { mountApp } from './ui/App.js';
import { createDanaoRoomClient } from './online/room-client.js';
import { mountOnlineLobby } from './online/lobby.js';
import { createOnlineMatchBridge } from './online/match-bridge.js';
import { polishCheckoutChaos } from './art/store-polish.js';
import { polishDanaoArena } from './art/arena-polish.js';

const canvas = document.getElementById('game');
const root = document.getElementById('app');
const onlineRoot = document.getElementById('online-shell');
const status = document.getElementById('boot-status');

const buildVersion = document.createElement('div');
buildVersion.id = 'build-version';
buildVersion.textContent = 'DANAO';
document.body.appendChild(buildVersion);
fetch('./release.json', { cache: 'no-store' })
  .then((response) => response.ok ? response.json() : null)
  .then((release) => {
    if (release?.version) buildVersion.textContent = `DANAO v${release.version}`;
  })
  .catch(() => {});

const CURRENT_ARENA_COPY = 'Checkout Chaos · Lantern Courtyard · Teahouse Rooftop';
function refreshMenuCopy() {
  for (const hint of root.querySelectorAll?.('.menu-btn small') || []) {
    if (/Wrestling Hall/i.test(hint.textContent || '')) hint.textContent = CURRENT_ARENA_COPY;
  }
}
const menuCopyObserver = globalThis.MutationObserver
  ? new MutationObserver(refreshMenuCopy)
  : null;
menuCopyObserver?.observe(root, { childList: true, subtree: true });

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

function polishActiveArena(arenaId) {
  const B = globalThis.BABYLON;
  const scene = B?.EngineStore?.LastCreatedScene;
  polishCheckoutChaos(B, scene, arenaId);
  polishDanaoArena(B, scene, arenaId);
}

async function startFromState(state) {
  if (onlineBridge?.active) onlineBridge.stop();
  onlineRoot.hidden = true;
  status.style.display = 'block';
  try {
    await runtime.startMatch({
      arenaId: state.arenaId,
      fighterId: state.fighterId,
      botCount: state.botCount,
      settings: state.settings,
    });
    polishActiveArena(state.arenaId);
  } catch (error) {
    onlineRoot.hidden = false;
    throw error;
  }
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
    onlineRoot.hidden = false;
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
    onlineRoot.hidden = true;
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
      polishActiveArena(arenaId);
      status.style.display = 'none';
    } catch (error) {
      onlineBridge.stop();
      onlineRoot.hidden = false;
      app?.returnToMenu?.();
      status.style.display = 'none';
      throw error;
    }
  },
  onReturnLocal() {
    if (onlineBridge?.active) onlineBridge.stop();
    onlineRoot.hidden = false;
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
  menuCopyObserver?.disconnect?.();
  onlineLobby?.dispose?.();
  onlineBridge?.dispose?.();
  onlineClient.close?.();
  app?.dispose?.();
  runtime.dispose();
}, { once: true });

refreshMenuCopy();
status.textContent = 'Ready — choose Play';
setTimeout(() => { if (!app.getState().inMatch) status.style.display = 'none'; }, 850);
