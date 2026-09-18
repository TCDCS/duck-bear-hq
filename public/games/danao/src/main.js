import { ARENAS } from './game/arena.js';
import { createDanaoRuntime } from './game/runtime.js';
import { mountApp } from './ui/App.js';
import { createDanaoRoomClient } from './online/room-client.js';
import { mountOnlineLobby } from './online/lobby.js';
import { createOnlineMatchBridge } from './online/match-bridge.js';
import { polishCheckoutChaos } from './art/store-polish.js';
import { polishDanaoArena } from './art/arena-polish.js';
import { showCombatFeedback } from './art/combat-feedback.js';
import { mountEnvironmentReactions } from './art/environment-reactions.js';
import { mountTouchControls } from './mobile/touch-controls.js';

const canvas = document.getElementById('game');
const root = document.getElementById('app');
const onlineRoot = document.getElementById('online-shell');
const status = document.getElementById('boot-status');
const touchControls = mountTouchControls({
  forceVisible: new URLSearchParams(globalThis.location?.search || '').get('touch') === '1',
});

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
let environmentReaction = null;
const onlineClient = createDanaoRoomClient();

function renderCombatFeedback(event) {
  const B = globalThis.BABYLON;
  const scene = B?.EngineStore?.LastCreatedScene;
  showCombatFeedback(B, scene, event);
  environmentReaction?.onFeedback?.(event);
}

const runtime = createDanaoRuntime(canvas, {
  onStatus(text) {
    status.textContent = text;
    status.style.display = text === 'Ready' ? 'none' : 'block';
  },
  onHud(hud) { app?.setHud(hud); },
  onBanner(text) { app?.showRoundResult(text); },
  onBannerClear() { app?.clearBanner(); },
  onResult(result) {
    touchControls.setActive(false);
    app?.showMatchResult(result);
    if (onlineBridge?.active && onlineClient.isHost) onlineBridge.reportResult(result);
  },
  onFeedback(event) {
    renderCombatFeedback(event);
    onlineBridge?.recordFeedback?.(event);
  },
});

onlineBridge = createOnlineMatchBridge({
  client: onlineClient,
  runtime,
  onFeedback(event) {
    renderCombatFeedback(event);
  },
  onError(message) {
    app?.showError?.(message);
  },
  onResult(result) {
    touchControls.setActive(false);
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
  environmentReaction = mountEnvironmentReactions(B, scene, arenaId);
}

async function startFromState(state) {
  environmentReaction = null;
  touchControls.setActive(false);
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
    touchControls.setActive(true);
  } catch (error) {
    touchControls.setActive(false);
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
      touchControls.setPaused(false);
      return;
    }
    touchControls.setPaused(paused);
    runtime.setPaused(paused);
  },
  onQuit() {
    environmentReaction = null;
    touchControls.setActive(false);
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
      touchControls.setActive(true);
      status.style.display = 'none';
    } catch (error) {
      touchControls.setActive(false);
      onlineBridge.stop();
      onlineRoot.hidden = false;
      app?.returnToMenu?.();
      status.style.display = 'none';
      throw error;
    }
  },
  onReturnLocal() {
    environmentReaction = null;
    touchControls.setActive(false);
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
  environmentReaction?.dispose?.();
  environmentReaction = null;
  touchControls.dispose();
  runtime.dispose();
}, { once: true });

refreshMenuCopy();
status.textContent = 'Ready — choose Play';
setTimeout(() => { if (!app.getState().inMatch) status.style.display = 'none'; }, 850);
