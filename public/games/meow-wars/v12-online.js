/* Meow Wars v1.2.0 — private online rooms.
   Two-player browser multiplayer: host/blue authoritative simulation, guest/red turn intents,
   compact state snapshots, room codes and reconnect support. */
(() => {
'use strict';

const MW12_VERSION = '1.2.0';
const MW12_BUILD = 'mw-v12-online-rooms-20260918a';
const SESSION_KEY = 'meow-wars-online-v1';
const NAME_KEY = 'meow-wars-online-name';
const SNAPSHOT_INTERVAL_MS = 100;
const STATE_INTENT_INTERVAL_MS = 90;

const stats = globalThis.__MEOW_WARS_V12_STATS = {
  roomsCreated: 0,
  roomsJoined: 0,
  socketsOpened: 0,
  reconnectAttempts: 0,
  reconnectSuccesses: 0,
  battlesStarted: 0,
  snapshotsSent: 0,
  snapshotsReceived: 0,
  intentsSent: 0,
  intentsApplied: 0,
  onlineEventsSent: 0,
  onlineEventsReceived: 0,
  guestFrames: 0
};

const online = globalThis.__MEOW_WARS_ONLINE = {
  session: loadSession(),
  room: null,
  socket: null,
  connected: false,
  intentionalClose: false,
  reconnectTimer: null,
  reconnectAttempt: 0,
  intentSeq: 0,
  snapshotSeq: 0,
  scene: null,
  launchedMatchId: null,
  lastStateIntentAt: 0,
  lastStateSignature: '',
  pendingIntents: [],
  overlay: null,
  banner: null,
  lobbyMessage: '',
  lobbyError: ''
};

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (!value || !/^\d{4}$/.test(value.code || '') || typeof value.token !== 'string') return null;
    return value;
  } catch {
    return null;
  }
}

function saveSession(value) {
  online.session = value;
  try {
    if (value) localStorage.setItem(SESSION_KEY, JSON.stringify(value));
    else localStorage.removeItem(SESSION_KEY);
  } catch {}
}

function saveName(name) {
  try { localStorage.setItem(NAME_KEY, name); } catch {}
}

function savedName() {
  try { return localStorage.getItem(NAME_KEY) || 'Player'; }
  catch { return 'Player'; }
}

function safeName(value) {
  const name = String(value || '').trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 28);
  return name || 'Player';
}

function socketUrl(code, token) {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return protocol + '//' + location.host + '/api/meow-wars/' + code + '/socket?token=' + encodeURIComponent(token);
}

async function api(path, body = null) {
  const response = await fetch('/api/meow-wars/' + path, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store'
  });
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok) throw new Error(data.error || 'The online room service is unavailable.');
  return data;
}

function localPlayer() {
  if (!online.room || !online.session) return null;
  return online.room.players?.find((p) => p.id === online.session.id) || null;
}

function hostPlayer() {
  return online.room?.players?.find((p) => p.id === online.room.hostId) || null;
}

function allPlayersConnected() {
  return Boolean(
    online.connected &&
    online.room?.phase === 'battle' &&
    online.room.players?.length === 2 &&
    online.room.players.every((p) => p.connected)
  );
}

function isHost() {
  return online.session?.id === 0;
}

function localTeam() {
  return Number(online.session?.team ?? -1);
}

function send(data) {
  if (!online.socket || online.socket.readyState !== WebSocket.OPEN) return false;
  try {
    online.socket.send(JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

function sendIntent(intent) {
  online.intentSeq += 1;
  const payload = { type: 'intent', seq: online.intentSeq, ...intent };
  if (send(payload)) {
    stats.intentsSent += 1;
    return true;
  }
  return false;
}

function closeSocket(intentional = true) {
  online.intentionalClose = intentional;
  if (online.reconnectTimer) {
    clearTimeout(online.reconnectTimer);
    online.reconnectTimer = null;
  }
  const socket = online.socket;
  online.socket = null;
  online.connected = false;
  if (socket) {
    try { socket.close(1000, intentional ? 'Left room' : 'Reconnect'); } catch {}
  }
}

function clearOnlineRoom() {
  closeSocket(true);
  online.room = null;
  online.scene = null;
  online.launchedMatchId = null;
  online.pendingIntents.length = 0;
  saveSession(null);
  hideLobby();
  hideConnectionBanner();
}

function scheduleReconnect() {
  if (online.intentionalClose || !online.session || online.reconnectTimer) return;
  const delay = Math.min(8000, 700 * Math.pow(1.7, online.reconnectAttempt));
  online.reconnectAttempt += 1;
  stats.reconnectAttempts += 1;
  setConnectionBanner('RECONNECTING…', '#ffd35a');
  online.reconnectTimer = setTimeout(() => {
    online.reconnectTimer = null;
    connectSocket(true);
  }, delay);
}

function connectSocket(reconnect = false) {
  if (!online.session) return;
  closeSocket(false);
  online.intentionalClose = false;

  let socket;
  try {
    socket = new WebSocket(socketUrl(online.session.code, online.session.token));
  } catch {
    scheduleReconnect();
    return;
  }
  online.socket = socket;

  socket.addEventListener('open', () => {
    online.connected = true;
    online.reconnectAttempt = 0;
    stats.socketsOpened += 1;
    if (reconnect) stats.reconnectSuccesses += 1;
    setConnectionBanner('ONLINE · ROOM ' + online.session.code, '#7fe2ad');
    setTimeout(() => {
      if (online.connected && allPlayersConnected()) hideConnectionBanner();
    }, 800);
  });

  socket.addEventListener('message', (event) => {
    if (event.data === 'pong') return;
    let message;
    try { message = JSON.parse(event.data); }
    catch { return; }
    handleSocketMessage(message);
  });

  socket.addEventListener('close', (event) => {
    if (online.socket !== socket) return;
    online.socket = null;
    online.connected = false;
    if (online.intentionalClose) return;

    if ([4000, 4001].includes(event.code) && event.code === 4000) {
      online.lobbyError = 'This room expired.';
      saveSession(null);
      showLobby();
      return;
    }
    scheduleReconnect();
  });

  socket.addEventListener('error', () => {
    if (!online.intentionalClose) setConnectionBanner('CONNECTION INTERRUPTED', '#ff8b82');
  });
}

function handleSocketMessage(message) {
  if (!message || typeof message !== 'object') return;

  if (message.type === 'welcome') {
    if (!online.session) return;
    online.session.id = message.id;
    online.session.team = message.team;
    saveSession(online.session);
    online.room = message.room || online.room;
    renderLobby();
    if (message.state && !isHost()) applyGuestSnapshot(message.state, true);
    if (online.room?.phase === 'battle') launchOnlineBattle();
    return;
  }

  if (message.type === 'room') {
    online.room = message.room;
    renderLobby();

    if (online.room?.phase === 'battle') {
      launchOnlineBattle();
    } else if (online.room?.phase === 'lobby') {
      online.launchedMatchId = null;
      if (online.scene?.scene?.isActive?.() && online.scene.mode === 'online') {
        online.scene.scene.start('MenuScene');
      }
      showLobby();
    } else if (online.room?.phase === 'results') {
      showOnlineResult(online.room.result);
    }

    updateConnectionState();
    return;
  }

  if (message.type === 'snapshot') {
    if (!isHost()) {
      stats.snapshotsReceived += 1;
      applyGuestSnapshot(message.state, false);
    }
    return;
  }

  if (message.type === 'intent') {
    if (isHost()) {
      online.pendingIntents.push(message);
      drainRemoteIntents();
    }
    return;
  }

  if (message.type === 'event') {
    if (!isHost()) {
      stats.onlineEventsReceived += 1;
      playGuestEvent(message.event);
    }
    return;
  }

  if (message.type === 'error') {
    online.lobbyError = String(message.message || 'Room error.');
    renderLobby();
    setConnectionBanner(online.lobbyError, '#ff8b82');
  }
}

function updateConnectionState() {
  const scene = online.scene;
  if (!scene || scene.mode !== 'online') return;

  if (!online.connected) {
    setConnectionBanner('RECONNECTING…', '#ffd35a');
    return;
  }
  const host = hostPlayer();
  const guest = online.room?.players?.find((p) => p.id === 1);
  if (!host?.connected) {
    setConnectionBanner('HOST RECONNECTING…', '#ffd35a');
  } else if (!guest?.connected) {
    setConnectionBanner('OTHER PLAYER RECONNECTING…', '#ffd35a');
  } else {
    hideConnectionBanner();
  }
}

function ensureOverlay() {
  if (online.overlay?.isConnected) return online.overlay;

  const root = document.createElement('div');
  root.id = 'meow-online-overlay';
  root.style.cssText = [
    'position:fixed','inset:0','z-index:10000','display:none','align-items:center','justify-content:center',
    'background:rgba(4,12,24,.82)','backdrop-filter:blur(6px)','font-family:Arial,sans-serif','color:#fff',
    'padding:12px','box-sizing:border-box','touch-action:manipulation'
  ].join(';');
  root.addEventListener('click', (event) => {
    if (event.target === root && online.room?.phase !== 'battle') hideLobby();
  });
  document.body.appendChild(root);
  online.overlay = root;
  return root;
}

function inputStyle(extra = '') {
  return 'width:100%;box-sizing:border-box;border:2px solid #4d8bb7;border-radius:9px;background:#07192b;color:#fff;padding:11px 12px;font:700 16px Arial;outline:none;' + extra;
}

function buttonStyle(color = '#2077b7', extra = '') {
  return 'border:2px solid rgba(255,255,255,.7);border-radius:9px;background:' + color +
    ';color:#fff;padding:11px 15px;font:900 14px Arial;cursor:pointer;min-height:44px;' + extra;
}

function lobbyCard(inner) {
  return '<div style="width:min(680px,96vw);max-height:94vh;overflow:auto;background:#102a47;border:3px solid #63d8ff;border-radius:16px;box-shadow:0 24px 80px rgba(0,0,0,.55);padding:20px;box-sizing:border-box">' +
    inner + '</div>';
}

function showLobby() {
  const root = ensureOverlay();
  root.style.display = 'flex';
  renderLobby();
}

function hideLobby() {
  if (online.overlay) online.overlay.style.display = 'none';
}

function renderLobby() {
  const root = ensureOverlay();
  if (root.style.display === 'none') return;

  const room = online.room;
  const error = online.lobbyError
    ? '<div style="background:#6f2632;border:1px solid #ff8b98;border-radius:8px;padding:9px;margin:10px 0;font-weight:700">' + escapeHtml(online.lobbyError) + '</div>'
    : '';

  if (!room) {
    root.innerHTML = lobbyCard(
      '<div style="text-align:center">' +
      '<div style="font:900 30px Arial;color:#ffd253">ONLINE MEOW WARS</div>' +
      '<div style="color:#a9d9f4;margin:5px 0 16px">Private 1v1 · works across desktop and mobile browsers</div>' +
      '</div>' +
      error +
      '<label style="font-weight:900;font-size:12px;color:#bdeaff">YOUR NAME</label>' +
      '<input id="mw-online-name" maxlength="28" value="' + escapeHtml(savedName()) + '" style="' + inputStyle('margin:5px 0 14px') + '">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">' +
        '<button id="mw-online-create" style="' + buttonStyle('#2389ed') + '">CREATE ROOM</button>' +
        '<div>' +
          '<input id="mw-online-code" inputmode="numeric" pattern="[0-9]*" maxlength="4" placeholder="4-DIGIT CODE" style="' + inputStyle('text-align:center;letter-spacing:6px;margin-bottom:7px') + '">' +
          '<button id="mw-online-join" style="' + buttonStyle('#b33e7e','width:100%') + '">JOIN ROOM</button>' +
        '</div>' +
      '</div>' +
      (online.session
        ? '<button id="mw-online-reconnect" style="' + buttonStyle('#396278','width:100%;margin-top:13px') + '">RECONNECT TO ROOM ' + escapeHtml(online.session.code) + '</button>'
        : '') +
      '<button id="mw-online-close" style="' + buttonStyle('#38485c','width:100%;margin-top:13px') + '">BACK TO LOCAL GAME</button>' +
      '<div style="font-size:11px;color:#83a9bf;text-align:center;margin-top:12px">No account required. Room expires after two hours.</div>'
    );
    wireStartLobby();
    return;
  }

  const me = localPlayer();
  const guest = room.players?.find((p) => p.id === 1);
  const host = room.players?.find((p) => p.id === 0);
  const hostSide = online.session?.id === room.hostId;
  const phaseLabel = room.phase === 'lobby' ? 'WAITING ROOM' : room.phase.toUpperCase();

  const playerRow = (player, teamName) => {
    if (!player) {
      return '<div style="padding:12px;border-radius:10px;background:#07192b;border:1px dashed #52718a;color:#7894a6">' +
        teamName + ' · waiting for player…</div>';
    }
    return '<div style="padding:12px;border-radius:10px;background:#07192b;border:1px solid ' +
      (player.connected ? '#53d99a' : '#d89545') + '">' +
      '<b style="color:' + (player.team === 0 ? '#71c7ff' : '#ff8aa0') + '">' + teamName + '</b> · ' +
      escapeHtml(player.name) +
      '<span style="float:right;color:' + (player.connected ? '#7fe2ad' : '#f0b65e') + '">' +
      (player.connected ? (player.ready ? 'READY' : 'CONNECTED') : 'RECONNECTING') + '</span></div>';
  };

  const mapName = room.settings?.arenaId || 'garden-siege';
  const controls = [];
  if (room.phase === 'lobby') {
    if (!hostSide) {
      controls.push('<button id="mw-online-ready" style="' +
        buttonStyle(me?.ready ? '#3c596b' : '#258f62','width:100%') + '">' +
        (me?.ready ? 'NOT READY' : 'READY') + '</button>');
    } else {
      const canStart = room.players?.length === 2 && room.players.every((p) => p.connected && p.ready);
      controls.push('<button id="mw-online-start" ' + (canStart ? '' : 'disabled') + ' style="' +
        buttonStyle(canStart ? '#ef5b52' : '#4b5560','width:100%;opacity:' + (canStart ? '1' : '.55')) +
        '">START ONLINE BATTLE</button>');
    }
  }
  controls.push('<button id="mw-online-leave" style="' + buttonStyle('#753c48','width:100%;margin-top:9px') + '">LEAVE ROOM</button>');

  root.innerHTML = lobbyCard(
    '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">' +
      '<div><div style="font:900 13px Arial;color:#8ee7ba">' + phaseLabel + '</div>' +
      '<div style="font:900 34px Arial;letter-spacing:8px;color:#ffd253">' + escapeHtml(room.code) + '</div></div>' +
      '<div style="text-align:right;font-size:12px;color:#a9d9f4">Share this code with the other player<br>' +
      (hostSide ? 'You are BLUE / HOST' : 'You are RED / GUEST') + '</div>' +
    '</div>' +
    error +
    '<div style="display:grid;gap:8px;margin:15px 0">' +
      playerRow(host, 'BLUE') +
      playerRow(guest, 'RED') +
    '</div>' +
    '<div style="background:#0b2038;border-radius:10px;padding:12px;margin-bottom:14px">' +
      '<div style="font:900 12px Arial;color:#ffd253">BATTLEFIELD</div>' +
      '<div style="font:900 17px Arial;margin:3px 0">' + escapeHtml(displayArenaName(mapName)) + '</div>' +
      '<div style="font-size:11px;color:#a9d9f4">Host chose this map before creating the room. Blue squad: ' +
      escapeHtml(room.settings?.blueSquadId || '') + ' · Red squad: ' + escapeHtml(room.settings?.redSquadId || '') + '</div>' +
    '</div>' +
    controls.join('') +
    '<div style="font-size:11px;color:#83a9bf;text-align:center;margin-top:12px">If a phone sleeps or loses signal, the battle pauses and reconnects automatically.</div>'
  );

  wireRoomLobby();
}

function wireStartLobby() {
  const root = online.overlay;
  const nameInput = root.querySelector('#mw-online-name');
  const codeInput = root.querySelector('#mw-online-code');
  const getName = () => {
    const name = safeName(nameInput?.value);
    saveName(name);
    return name;
  };

  root.querySelector('#mw-online-create')?.addEventListener('click', async () => {
    online.lobbyError = '';
    try {
      const menu = globalThis.__MEOW_WARS_MENU_SCENE;
      const arena = ARENAS[menu?.arenaIndex || 0] || ARENAS[0];
      const data = await api('create', {
        name: getName(),
        arenaId: arena.id,
        blueSquadId: SQUADS[menu?.blueSquadIndex || 0]?.id || SQUADS[0].id,
        redSquadId: SQUADS[menu?.redSquadIndex || 1]?.id || SQUADS[1].id
      });
      stats.roomsCreated += 1;
      online.room = data.room;
      saveSession({
        code: data.room.code,
        token: data.token,
        id: data.id,
        team: data.team,
        name: getName()
      });
      renderLobby();
      connectSocket(false);
    } catch (error) {
      online.lobbyError = error.message;
      renderLobby();
    }
  });

  root.querySelector('#mw-online-join')?.addEventListener('click', async () => {
    online.lobbyError = '';
    try {
      const code = String(codeInput?.value || '').replace(/\D/g, '').slice(0, 4);
      if (!/^\d{4}$/.test(code)) throw new Error('Enter the four-digit room code.');
      const data = await api('join', { code, name: getName() });
      stats.roomsJoined += 1;
      online.room = data.room;
      saveSession({ code, token: data.token, id: data.id, team: data.team, name: getName() });
      renderLobby();
      connectSocket(false);
    } catch (error) {
      online.lobbyError = error.message;
      renderLobby();
    }
  });

  root.querySelector('#mw-online-reconnect')?.addEventListener('click', () => {
    online.lobbyError = '';
    connectSocket(true);
    renderLobby();
  });

  root.querySelector('#mw-online-close')?.addEventListener('click', hideLobby);
}

function wireRoomLobby() {
  const root = online.overlay;

  root.querySelector('#mw-online-ready')?.addEventListener('click', () => {
    const me = localPlayer();
    send({ type: 'ready', ready: !me?.ready });
  });

  root.querySelector('#mw-online-start')?.addEventListener('click', () => {
    send({ type: 'start' });
  });

  root.querySelector('#mw-online-leave')?.addEventListener('click', () => {
    send({ type: 'leave' });
    clearOnlineRoom();
  });
}

function displayArenaName(id) {
  const arena = ARENAS.find((item) => item.id === id);
  return arena?.name || id;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  })[char]);
}

function setConnectionBanner(text, color) {
  let banner = online.banner;
  if (!banner?.isConnected) {
    banner = document.createElement('div');
    banner.id = 'meow-online-banner';
    banner.style.cssText = 'position:fixed;z-index:9999;top:max(8px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);padding:7px 13px;border-radius:999px;background:#0a1c30;border:2px solid #6bcff5;color:#fff;font:900 11px Arial;pointer-events:none;box-shadow:0 6px 20px rgba(0,0,0,.35)';
    document.body.appendChild(banner);
    online.banner = banner;
  }
  banner.textContent = text;
  banner.style.borderColor = color || '#6bcff5';
  banner.style.display = 'block';
}

function hideConnectionBanner() {
  if (online.banner) online.banner.style.display = 'none';
}

function maybeAutoReconnect() {
  if (!online.session || online.connected || online.socket) return;
  connectSocket(true);
}

function launchOnlineBattle() {
  const room = online.room;
  if (!room || room.phase !== 'battle' || !online.session) return;
  if (online.launchedMatchId === room.matchId && online.scene?.mode === 'online') {
    hideLobby();
    updateConnectionState();
    return;
  }

  const menu = globalThis.__MEOW_WARS_MENU_SCENE;
  const activeGame = globalThis.__MEOW_WARS_GAME_SCENE;
  if (activeGame?.mode === 'online' && activeGame.__mw12MatchId === room.matchId) {
    online.launchedMatchId = room.matchId;
    online.scene = activeGame;
    hideLobby();
    return;
  }

  const payload = {
    mode: 'online',
    arenaId: room.settings.arenaId,
    blueSquadId: room.settings.blueSquadId,
    redSquadId: room.settings.redSquadId,
    onlineMatchId: room.matchId,
    onlineTeam: online.session.team
  };

  online.launchedMatchId = room.matchId;
  hideLobby();
  if (menu?.scene?.isActive?.()) {
    menu.scene.start('GameScene', payload);
  } else if (activeGame?.scene) {
    activeGame.scene.restart(payload);
  }
}

function networkFrozen(scene) {
  if (scene.mode !== 'online') return false;
  return !allPlayersConnected();
}

function assignNetId(object, prefix) {
  if (!object.__mw12Id) {
    object.__mw12Id = prefix + '-' + (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2));
  }
  return object.__mw12Id;
}

function ammoSnapshot(scene) {
  return scene.teamAmmo.map((map) => {
    const object = {};
    for (const [id, amount] of map.entries())
      object[id] = amount === Infinity ? -1 : Number(amount);
    return object;
  });
}

function winnerTeam(scene) {
  if (!scene.gameOver) return null;
  const blue = scene.cats.some((cat) => cat.team === 0 && cat.alive);
  const red = scene.cats.some((cat) => cat.team === 1 && cat.alive);
  if (blue && !red) return 0;
  if (red && !blue) return 1;
  return -1;
}

function makeHostSnapshot(scene) {
  online.snapshotSeq += 1;
  return {
    seq: online.snapshotSeq,
    turnTeam: scene.activeCat().team,
    turnNumber: scene.turnNumber,
    activeId: scene.activeCat().id,
    wind: scene.wind,
    timerMs: Math.max(0, scene.turnRemainingMs),
    selectedWeaponId: WEAPONS[scene.selectedWeaponIndex]?.id || 'bazooka',
    chargePower: scene.chargePower,
    actionLocked: scene.actionLocked,
    gameOver: scene.gameOver,
    winnerTeam: winnerTeam(scene),
    cats: scene.cats.map((cat) => ({
      id: cat.id, team: cat.team, x: cat.x, y: cat.y, vx: cat.vx, vy: cat.vy,
      health: cat.health, alive: cat.alive
    })),
    projectiles: scene.projectiles.map((projectile) => ({
      id: assignNetId(projectile, 'p'),
      weaponId: projectile.weapon.id,
      x: projectile.x,
      y: projectile.y,
      rotation: Number(projectile.object?.rotation || 0)
    })),
    deployables: scene.deployables.map((item) => ({
      id: assignNetId(item, 'd'),
      weaponId: item.weapon.id,
      x: item.x,
      y: item.y
    })),
    runners: scene.runners.map((runner) => ({
      id: assignNetId(runner, 'r'),
      weaponId: runner.weapon.id,
      x: runner.x,
      y: runner.y,
      direction: runner.direction
    })),
    craters: [...(scene.__mw12Craters || [])],
    props: (scene.__mw11Props || []).map((prop) => ({
      type: prop.type,
      x: prop.x,
      y: prop.y,
      hp: Math.max(0, prop.hp || 0),
      destroyed: Boolean(prop.destroyed),
      angle: Number(prop.image?.angle || 0)
    })),
    ammo: ammoSnapshot(scene)
  };
}

function sendHostSnapshot(scene, force = false) {
  if (!isHost() || scene.mode !== 'online' || !online.connected || online.room?.phase !== 'battle') return;
  const now = performance.now();
  if (!force && now - (scene.__mw12LastSnapshotAt || 0) < SNAPSHOT_INTERVAL_MS) return;
  scene.__mw12LastSnapshotAt = now;
  if (send({ type: 'snapshot', state: makeHostSnapshot(scene) })) stats.snapshotsSent += 1;
}

function sendGuestState(scene, force = false) {
  if (isHost() || scene.mode !== 'online' || !online.connected || online.room?.phase !== 'battle') return;
  const active = scene.activeCat();
  if (!active || active.team !== localTeam() || scene.actionLocked || scene.gameOver) return;

  const now = performance.now();
  if (!force && now - online.lastStateIntentAt < STATE_INTENT_INTERVAL_MS) return;

  const weaponId = WEAPONS[scene.selectedWeaponIndex]?.id || 'bazooka';
  const signature = [
    Math.round(active.x),
    Math.round(scene.aimAngleDeg * 2),
    scene.facing,
    weaponId
  ].join('|');
  if (!force && signature === online.lastStateSignature) return;

  online.lastStateIntentAt = now;
  online.lastStateSignature = signature;
  sendIntent({
    kind: 'state',
    x: active.x,
    angle: scene.aimAngleDeg,
    facing: scene.facing,
    weaponId
  });
}

function drainRemoteIntents() {
  const scene = online.scene;
  if (!scene || scene.mode !== 'online' || !isHost()) return;
  while (online.pendingIntents.length) {
    const message = online.pendingIntents.shift();
    applyRemoteIntent(scene, message.intent);
  }
}

function applyRemoteIntent(scene, intent) {
  if (!intent || scene.gameOver || scene.activeCat().team !== 1) return;
  const active = scene.activeCat();

  if (intent.kind === 'state') {
    active.x = clamp(Number(intent.x), 28, WIDTH - 28);
    const surface = surfaceY(scene.terrain, active.x);
    if (surface < HEIGHT && active.vy === 0) active.y = surface - CAT_FOOT;
    scene.aimAngleDeg = clamp(Number(intent.angle), 8, 82);
    scene.facing = intent.facing < 0 ? -1 : 1;
    if (intent.weaponId) {
      const index = WEAPONS.findIndex((weapon) => weapon.id === intent.weaponId);
      if (index >= 0 && (scene.teamAmmo[1].get(intent.weaponId) ?? 0) !== 0)
        scene.selectedWeaponIndex = index;
    }
    scene.syncSprites?.();
  } else if (intent.kind === 'weapon') {
    const index = WEAPONS.findIndex((weapon) => weapon.id === intent.weaponId);
    if (index >= 0 && (scene.teamAmmo[1].get(intent.weaponId) ?? 0) !== 0)
      scene.selectedWeaponIndex = index;
  } else if (intent.kind === 'fire') {
    active.x = clamp(Number(intent.x), 28, WIDTH - 28);
    const surface = surfaceY(scene.terrain, active.x);
    if (surface < HEIGHT && active.vy === 0) active.y = surface - CAT_FOOT;
    scene.aimAngleDeg = clamp(Number(intent.angle), 8, 82);
    scene.facing = intent.facing < 0 ? -1 : 1;
    scene.chargePower = clamp(Number(intent.power), .36, 1);
    const index = WEAPONS.findIndex((weapon) => weapon.id === intent.weaponId);
    if (index >= 0 && (scene.teamAmmo[1].get(intent.weaponId) ?? 0) !== 0)
      scene.selectedWeaponIndex = index;
    // Execute the preserved authoritative fire path directly; the public v1.2
    // wrapper intentionally blocks the host's own controls on the remote Red turn.
    v11FireCurrentWeapon.call(scene);
  }

  stats.intentsApplied += 1;
  sendHostSnapshot(scene, true);
}

function mirrorColor(weaponId) {
  try { return projectileColor(weaponId); }
  catch { return 0xffffff; }
}

function syncMirrors(scene, key, items, factory) {
  if (!scene[key]) scene[key] = new Map();
  const map = scene[key];
  const keep = new Set();

  for (const item of items || []) {
    keep.add(item.id);
    let object = map.get(item.id);
    if (!object?.active) {
      object = factory(item);
      map.set(item.id, object);
    }
    object.setPosition(item.x, item.y);
    if (item.rotation !== undefined) object.rotation = item.rotation;
  }

  for (const [id, object] of map) {
    if (!keep.has(id)) {
      object.destroy();
      map.delete(id);
    }
  }
}

function applyAmmo(scene, ammo) {
  if (!Array.isArray(ammo) || ammo.length !== 2) return;
  ammo.forEach((team, index) => {
    if (!team || typeof team !== 'object') return;
    for (const [weaponId, amount] of Object.entries(team))
      scene.teamAmmo[index].set(weaponId, Number(amount) === -1 ? Infinity : Number(amount));
  });
}

function applyCraterSnapshot(scene, craters) {
  if (!Array.isArray(craters)) return;
  if (!Number.isInteger(scene.__mw12AppliedCraters)) scene.__mw12AppliedCraters = 0;
  if (craters.length < scene.__mw12AppliedCraters) scene.__mw12AppliedCraters = 0;

  let changed = false;
  for (let i = scene.__mw12AppliedCraters; i < craters.length; i += 1) {
    const crater = craters[i];
    carveCircle(scene.terrain, crater.x, crater.y, crater.radius);
    changed = true;
  }
  scene.__mw12AppliedCraters = craters.length;
  if (changed) scene.paintTerrainTexture();
}

function applyPropSnapshot(scene, props) {
  if (!Array.isArray(props) || !scene.__mw11Props) return;
  for (let i = 0; i < Math.min(props.length, scene.__mw11Props.length); i += 1) {
    const state = props[i];
    const prop = scene.__mw11Props[i];
    prop.x = state.x;
    prop.y = state.y;
    prop.hp = state.hp;
    prop.destroyed = state.destroyed;
    if (prop.image?.active) {
      prop.image.setPosition(state.x, state.y);
      prop.image.angle = state.angle || 0;
      if (state.destroyed) prop.image.destroy();
      else {
        prop.image.setAlpha(Math.max(.55, Math.min(1, .6 + .4 * (state.hp / (prop.maxHp || 1)))));
      }
    }
  }
}

function applyGuestSnapshot(state, immediate) {
  if (isHost() || !state) return;
  const scene = online.scene || globalThis.__MEOW_WARS_GAME_SCENE;
  if (!scene || scene.mode !== 'online') {
    online.__pendingSnapshot = state;
    return;
  }

  const previousActive = scene.turns?.current;
  if (state.activeId && scene.catById(state.activeId)) scene.turns.resetTo(state.activeId);
  scene.turnNumber = state.turnNumber;
  scene.wind = state.wind;
  scene.turnRemainingMs = state.timerMs;
  scene.actionLocked = state.actionLocked;
  scene.chargePower = state.chargePower;

  const weaponIndex = WEAPONS.findIndex((weapon) => weapon.id === state.selectedWeaponId);
  if (weaponIndex >= 0) scene.selectedWeaponIndex = weaponIndex;

  for (const catState of state.cats || []) {
    const cat = scene.catById(catState.id);
    if (!cat) continue;
    cat.x = catState.x;
    cat.y = catState.y;
    cat.vx = catState.vx || 0;
    cat.vy = catState.vy || 0;
    cat.health = catState.health;
    cat.alive = catState.alive;
    cat.sprite.setPosition(cat.x, cat.y);
    cat.sprite.setAlpha(cat.alive ? 1 : .42);
  }

  applyAmmo(scene, state.ammo);
  applyCraterSnapshot(scene, state.craters);
  applyPropSnapshot(scene, state.props);

  syncMirrors(scene, '__mw12ProjectileMirrors', state.projectiles, (item) =>
    scene.add.circle(item.x, item.y, item.weaponId === 'fish-launcher' ? 8 : 5, mirrorColor(item.weaponId), .96).setDepth(20)
  );
  syncMirrors(scene, '__mw12DeployableMirrors', state.deployables, (item) =>
    scene.add.rectangle(item.x, item.y, 12, 14, mirrorColor(item.weaponId), .96).setDepth(12)
  );
  syncMirrors(scene, '__mw12RunnerMirrors', state.runners, (item) =>
    scene.add.ellipse(item.x, item.y, 22, 11, mirrorColor(item.weaponId), .96).setDepth(12)
  );

  if (state.activeId && previousActive !== state.activeId) {
    try { scene.showTurnBanner(scene.activeCat()); } catch {}
    online.lastStateSignature = '';
  }

  if (state.gameOver && !scene.__mw12ResultShown) {
    scene.gameOver = true;
    showGuestResult(scene, state.winnerTeam);
  } else if (!state.gameOver) {
    scene.gameOver = false;
  }

  scene.syncSprites?.();
  scene.drawHealthBars?.();
  scene.updateHud?.();
  stats.guestFrames += 1;

  if (immediate) updateConnectionState();
}

function showGuestResult(scene, winner) {
  if (scene.__mw12ResultShown) return;
  scene.__mw12ResultShown = true;
  const overlay = scene.add.rectangle(640, 315, 660, 190, 0x111522, .94).setDepth(350);
  overlay.setStrokeStyle(4, 0xffe36e, .85);
  const label = winner === 0
    ? scene.blueSquad.name.toUpperCase() + ' WINS!'
    : winner === 1
      ? scene.redSquad.name.toUpperCase() + ' WINS!'
      : 'EVERYBODY LOST!';
  scene.add.text(640, 285, label, {
    fontFamily: 'Arial Black, Arial', fontSize: '40px', color: '#ffe36e'
  }).setOrigin(.5).setDepth(351);
  scene.add.text(640, 347, isHost() ? 'R: rematch   M: leave room' : 'Waiting for host rematch   ·   M: leave room', {
    fontFamily: 'Arial', fontSize: '18px', color: '#ffffff'
  }).setOrigin(.5).setDepth(351);
}

function showOnlineResult(result) {
  const scene = online.scene;
  if (scene?.mode === 'online') showGuestResult(scene, result?.winnerTeam ?? null);
}

function sendOnlineEvent(event) {
  if (!isHost() || !online.connected || online.room?.phase !== 'battle') return;
  if (send({ type: 'event', event })) stats.onlineEventsSent += 1;
}

function playGuestEvent(event) {
  const scene = online.scene;
  if (!scene || scene.mode !== 'online' || !event) return;

  if (event.kind === 'explode') {
    const weapon = WEAPONS.find((item) => item.id === event.weaponId);
    if (weapon) {
      scene.sfx.explosion?.(Math.max(.6, Math.min(1.5, weapon.blastRadius / 60)));
      scene.explosionFx(event.x, event.y, weapon);
      if (globalThis.__MEOW_WARS_SETTINGS?.screenShake !== false)
        scene.cameras.main.shake(100 + weapon.blastRadius, .003);
    }
  } else if (event.kind === 'tracer') {
    v11DrawTracer.call(scene, event.x1, event.y1, event.x2, event.y2, event.color || 0xffffff);
  }
}

function createOnlineHud(scene) {
  const side = isHost() ? 'BLUE · HOST' : 'RED · GUEST';
  const color = isHost() ? '#75ccff' : '#ff91a6';
  scene.__mw12OnlineHud = scene.add.text(640, 18, 'ONLINE · ROOM ' + online.session.code + ' · ' + side, {
    fontFamily: 'Arial Black, Arial',
    fontSize: '11px',
    color,
    backgroundColor: 'rgba(8,20,35,.82)',
    padding: { x: 9, y: 5 }
  }).setOrigin(.5, 0).setDepth(500);
}

function cleanupMirrors(scene) {
  for (const key of ['__mw12ProjectileMirrors', '__mw12DeployableMirrors', '__mw12RunnerMirrors']) {
    const map = scene[key];
    if (map instanceof Map) {
      for (const object of map.values()) object?.destroy?.();
      map.clear();
    }
    scene[key] = null;
  }
}

function leaveOnlineFromBattle(scene) {
  send({ type: 'leave' });
  clearOnlineRoom();
  scene.scene.start('MenuScene');
}

function rematchOnline(scene) {
  if (!isHost()) {
    setConnectionBanner('WAITING FOR HOST REMATCH', '#ffd35a');
    return;
  }
  send({ type: 'rematch' });
  scene.__mw12ResultShown = false;
}

function ensureOnlineLauncher() {
  let button = document.getElementById('mw-online-launcher');
  if (button) return button;
  button = document.createElement('button');
  button.id = 'mw-online-launcher';
  button.type = 'button';
  button.textContent = 'ONLINE 1V1';
  button.setAttribute('aria-label', 'Play Meow Wars online');
  button.style.cssText = [
    'position:fixed','z-index:8000','top:max(10px,env(safe-area-inset-top))','left:max(10px,env(safe-area-inset-left))',
    'min-width:132px','min-height:42px','padding:8px 14px','border-radius:10px','border:2px solid #8fffe1',
    'background:rgba(18,107,104,.96)','color:#fff','font:900 13px Arial','letter-spacing:.3px',
    'box-shadow:0 5px 20px rgba(0,0,0,.35)','cursor:pointer','touch-action:manipulation'
  ].join(';');
  button.addEventListener('click', showLobby);
  document.body.appendChild(button);
  return button;
}

function showOnlineLauncher(visible) {
  const button = ensureOnlineLauncher();
  button.style.display = visible ? 'block' : 'none';
}

function syncLobbyButton(scene) {
  scene.__mw12OnlineButton = { active: true };
  showOnlineLauncher(true);
}

const v11MenuCreate = MenuScene.prototype.create;
MenuScene.prototype.create = function() {
  v11MenuCreate.call(this);

  for (const child of this.children.list) {
    if (typeof child.text === 'string') {
      if (child.text.includes('MEOW WARS v1.1.0'))
        child.setText(child.text.replace('MEOW WARS v1.1.0', 'MEOW WARS v' + MW12_VERSION));
      if (child.text.includes('mw-v11-living-battlefields-20260918a'))
        child.setText(child.text.replace('mw-v11-living-battlefields-20260918a', MW12_BUILD));
    }
  }

  syncLobbyButton(this);
  queueMicrotask(maybeAutoReconnect);
};

const v11Init = GameScene.prototype.init;
GameScene.prototype.init = function(data) {
  const onlineMode = data?.mode === 'online';
  v11Init.call(this, onlineMode ? { ...data, mode: 'local' } : data);
  if (onlineMode) {
    this.mode = 'online';
    this.__mw12MatchId = data.onlineMatchId;
    this.__mw12OnlineTeam = data.onlineTeam;
  }
};

const v11IsCpuTurn = GameScene.prototype.isCpuTurn;
GameScene.prototype.isCpuTurn = function() {
  if (this.mode === 'online') return false;
  return v11IsCpuTurn.call(this);
};

const v11GameCreate = GameScene.prototype.create;
GameScene.prototype.create = function() {
  showOnlineLauncher(false);
  v11GameCreate.call(this);
  if (this.mode !== 'online') return;

  online.scene = this;
  globalThis.__MEOW_WARS_GAME_SCENE = this;
  this.__mw12Craters = [];
  this.__mw12AppliedCraters = 0;
  this.__mw12ResultShown = false;
  this.__mw12LastSnapshotAt = 0;
  cleanupMirrors(this);
  this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    cleanupMirrors(this);
    if (online.scene === this) online.scene = null;
  });
  createOnlineHud(this);
  stats.battlesStarted += 1;

  if (isHost()) {
    sendHostSnapshot(this, true);
  } else if (online.__pendingSnapshot) {
    const state = online.__pendingSnapshot;
    online.__pendingSnapshot = null;
    applyGuestSnapshot(state, true);
  }

  updateConnectionState();
};

const v11UpdateHumanInput = GameScene.prototype.updateHumanInput;
GameScene.prototype.updateHumanInput = function(dtMs) {
  if (this.mode !== 'online') return v11UpdateHumanInput.call(this, dtMs);

  const active = this.activeCat();
  if (!active || active.team !== localTeam()) return;
  if (networkFrozen(this)) return;

  v11UpdateHumanInput.call(this, dtMs);
  if (!isHost()) sendGuestState(this, false);
};

const v11CatPhysics = GameScene.prototype.updateCatPhysics;
GameScene.prototype.updateCatPhysics = function(dt) {
  if (this.mode === 'online' && !isHost()) return;
  return v11CatPhysics.call(this, dt);
};

const v11Projectiles = GameScene.prototype.updateProjectiles;
GameScene.prototype.updateProjectiles = function(dtMs) {
  if (this.mode === 'online' && !isHost()) return;
  return v11Projectiles.call(this, dtMs);
};

const v11Deployables = GameScene.prototype.updateDeployables;
GameScene.prototype.updateDeployables = function(dtMs) {
  if (this.mode === 'online' && !isHost()) return;
  return v11Deployables.call(this, dtMs);
};

const v11Runners = GameScene.prototype.updateRunners;
GameScene.prototype.updateRunners = function(dtMs) {
  if (this.mode === 'online' && !isHost()) return;
  return v11Runners.call(this, dtMs);
};

const v11Resolution = GameScene.prototype.updateActionResolution;
GameScene.prototype.updateActionResolution = function() {
  if (this.mode === 'online' && !isHost()) return;
  return v11Resolution.call(this);
};

const v11EndTurn = GameScene.prototype.endTurn;
GameScene.prototype.endTurn = function(reason = 'fired') {
  if (this.mode === 'online' && !isHost()) return;
  const result = v11EndTurn.call(this, reason);
  if (this.mode === 'online' && isHost()) sendHostSnapshot(this, true);
  return result;
};

const v11FireCurrentWeapon = GameScene.prototype.fireCurrentWeapon;
GameScene.prototype.fireCurrentWeapon = function() {
  if (this.mode !== 'online') return v11FireCurrentWeapon.call(this);

  const active = this.activeCat();
  if (active.team !== localTeam() || networkFrozen(this)) return;

  if (!isHost()) {
    if (this.actionLocked || this.gameOver) return;
    const weapon = WEAPONS[this.selectedWeaponIndex];
    const ammo = this.teamAmmo[1].get(weapon.id) ?? 0;
    if (ammo === 0) return;
    const sent = sendIntent({
      kind: 'fire',
      x: this.activeCat().x,
      angle: this.aimAngleDeg,
      power: this.chargePower,
      facing: this.facing,
      weaponId: weapon.id
    });
    if (sent) {
      this.muzzleFx(this.activeCat(), weapon);
      this.actionLocked = true;
      this.resolutionDeadline = this.time.now + 9000;
    }
    return;
  }

  const result = v11FireCurrentWeapon.call(this);
  sendHostSnapshot(this, true);
  return result;
};

const v11SelectWeaponByIndex = GameScene.prototype.selectWeaponByIndex;
GameScene.prototype.selectWeaponByIndex = function(index) {
  const result = v11SelectWeaponByIndex.call(this, index);
  if (this.mode === 'online' && !isHost() && this.activeCat().team === localTeam()) {
    const weapon = WEAPONS[this.selectedWeaponIndex];
    sendIntent({ kind: 'weapon', weaponId: weapon.id });
    sendGuestState(this, true);
  }
  return result;
};

const v11CycleWeapon = GameScene.prototype.cycleWeapon;
GameScene.prototype.cycleWeapon = function(direction) {
  const result = v11CycleWeapon.call(this, direction);
  if (this.mode === 'online' && !isHost() && this.activeCat().team === localTeam()) {
    const weapon = WEAPONS[this.selectedWeaponIndex];
    sendIntent({ kind: 'weapon', weaponId: weapon.id });
    sendGuestState(this, true);
  }
  return result;
};

const v11Explode = GameScene.prototype.explode;
GameScene.prototype.explode = function(x, y, weapon, ownerId) {
  if (this.mode === 'online' && !isHost()) return;
  if (this.mode === 'online' && isHost() && weapon?.blastRadius > 0) {
    const radius = weapon.blastRadius * .82 * (weapon.craterScale ?? 1);
    this.__mw12Craters ||= [];
    this.__mw12Craters.push({ x, y, radius });
  }

  const result = v11Explode.call(this, x, y, weapon, ownerId);
  if (this.mode === 'online' && isHost()) {
    sendOnlineEvent({ kind: 'explode', x, y, weaponId: weapon.id });
    sendHostSnapshot(this, true);
  }
  return result;
};

const v11DrawTracer = GameScene.prototype.drawTracer;
GameScene.prototype.drawTracer = function(x1, y1, x2, y2, color) {
  const result = v11DrawTracer.call(this, x1, y1, x2, y2, color);
  if (this.mode === 'online' && isHost()) {
    sendOnlineEvent({ kind: 'tracer', x1, y1, x2, y2, color });
  }
  return result;
};

const v11CheckWin = GameScene.prototype.checkWin;
GameScene.prototype.checkWin = function() {
  if (this.mode === 'online' && !isHost()) return;
  const wasOver = this.gameOver;
  const result = v11CheckWin.call(this);
  if (this.mode === 'online' && isHost() && !wasOver && this.gameOver) {
    sendHostSnapshot(this, true);
    send({ type: 'result', result: { winnerTeam: winnerTeam(this), reason: 'elimination' } });
  }
  return result;
};

const v11RestartInput = GameScene.prototype.handleRestartInput;
GameScene.prototype.handleRestartInput = function() {
  if (this.mode !== 'online') return v11RestartInput.call(this);

  const restartDown = !!this.keys?.restart?.isDown;
  const menuDown = !!this.keys?.menu?.isDown;

  if (restartDown && !this.__mw12RestartHeld) {
    this.__mw12RestartHeld = true;
    rematchOnline(this);
  }
  if (!restartDown) this.__mw12RestartHeld = false;

  if (menuDown && !this.__mw12MenuHeld) {
    this.__mw12MenuHeld = true;
    leaveOnlineFromBattle(this);
  }
  if (!menuDown) this.__mw12MenuHeld = false;
};

const v11GameUpdate = GameScene.prototype.update;
GameScene.prototype.update = function(time, delta) {
  if (this.mode !== 'online') return v11GameUpdate.call(this, time, delta);

  if (networkFrozen(this)) {
    updateConnectionState();
    this.syncSprites?.();
    this.drawHealthBars?.();
    this.updateHud?.();
    return;
  }

  const active = this.activeCat();
  const localOwnsTurn = active?.team === localTeam();
  const savedTouch = this.__mw10Touch;
  if (!localOwnsTurn) this.__mw10Touch = null;

  try {
    v11GameUpdate.call(this, time, delta);
  } finally {
    if (!localOwnsTurn) this.__mw10Touch = savedTouch;
  }

  if (!localOwnsTurn && !isHost()) {
    this.aimGraphics?.clear?.();
    this.__mw09AimGuide?.clear?.();
  }

  online.scene = this;

  if (isHost()) {
    drainRemoteIntents();
    sendHostSnapshot(this, false);
  } else {
    sendGuestState(this, false);
  }
};

const previousBuildInfo = globalThis.__MEOW_WARS_BUILD_INFO;
document.documentElement.dataset.meowWarsVersion = MW12_VERSION;
document.documentElement.dataset.meowWarsBuild = MW12_BUILD;
const gameHost = document.getElementById('game');
if (gameHost) {
  gameHost.dataset.version = MW12_VERSION;
  gameHost.dataset.build = MW12_BUILD;
}
globalThis.__MEOW_WARS_VERSION = MW12_VERSION;
globalThis.__MEOW_WARS_BUILD = MW12_BUILD;
globalThis.__MEOW_WARS_BUILD_INFO = () => {
  const base = typeof previousBuildInfo === 'function' ? previousBuildInfo() : {};
  return {
    ...base,
    version: MW12_VERSION,
    build: MW12_BUILD,
    online: {
      room: online.room?.code || null,
      connected: online.connected,
      playerId: online.session?.id ?? null,
      team: online.session?.team ?? null,
      phase: online.room?.phase || null,
      authoritativeHost: true
    },
    v12Stats: { ...stats }
  };
};
})();
