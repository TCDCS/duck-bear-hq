/* Meow Wars v1.2.0 — private online rooms for desktop + mobile browsers. */
(() => {
'use strict';

const MW12_VERSION = '1.2.0';
const MW12_BUILD = 'mw-v12-online-20260918a';
const SESSION_KEY = 'meow-wars-online-v1';

const stats = globalThis.__MEOW_WARS_V12_STATS = {
  creates: 0,
  joins: 0,
  socketOpens: 0,
  reconnects: 0,
  roomUpdates: 0,
  starts: 0,
  posesSent: 0,
  posesReceived: 0,
  actionsSent: 0,
  actionsApplied: 0,
  checkpointsSent: 0,
  checkpointsApplied: 0,
  resultsSent: 0
};

const online = globalThis.__MEOW_WARS_ONLINE = {
  session: null,
  room: null,
  socket: null,
  connected: false,
  manualClose: false,
  reconnectTimer: null,
  reconnectAttempt: 0,
  panel: null,
  lobby: null,
  status: '',
  checkpoint: null,
  pendingAction: null,
  lastAppliedActionSeq: 0,
  inputSeq: 0,
  checkpointSeq: 0,
  activeScene: null
};

function readSession() {
  try {
    const value = JSON.parse(globalThis.localStorage?.getItem(SESSION_KEY) || 'null');
    if (!value || !/^\d{4}$/.test(String(value.code || '')) || !/^[a-f\d-]{36}$/i.test(String(value.token || ''))) return null;
    if (![0, 1].includes(Number(value.id))) return null;
    return {
      code: String(value.code),
      token: String(value.token),
      id: Number(value.id),
      name: String(value.name || 'Cat Commander').slice(0, 24)
    };
  } catch {
    return null;
  }
}
function writeSession(session) {
  online.session = session ? { ...session } : null;
  try {
    if (session) globalThis.localStorage?.setItem(SESSION_KEY, JSON.stringify(session));
    else globalThis.localStorage?.removeItem(SESSION_KEY);
  } catch {}
}
online.session = readSession();

function safeText(value, fallback = '') {
  return String(value == null ? fallback : value).replace(/[<>&]/g, '').slice(0, 80);
}
function wsUrl(code, token) {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return protocol + '//' + location.host + '/api/meow/' + encodeURIComponent(code) + '/socket?token=' + encodeURIComponent(token);
}
async function postJson(path, body) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store'
  });
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok) throw new Error(data.error || 'Online request failed.');
  return data;
}
function send(message) {
  if (!online.socket || online.socket.readyState !== WebSocket.OPEN) return false;
  online.socket.send(JSON.stringify(message));
  return true;
}
function setStatus(message) {
  online.status = String(message || '');
  const node = document.getElementById('mw12-status');
  if (node) node.textContent = online.status;
  updateConnectionBadge();
}
function removeNode(node) {
  try { node?.remove?.(); } catch {}
}
function closePanel() {
  removeNode(online.panel);
  online.panel = null;
}
function closeLobby() {
  removeNode(online.lobby);
  online.lobby = null;
}
function cardShell(title) {
  const overlay = document.createElement('div');
  overlay.style.cssText = [
    'position:fixed','inset:0','z-index:10000','display:flex','align-items:center','justify-content:center',
    'background:rgba(3,10,20,.76)','font-family:Arial,sans-serif','padding:12px','box-sizing:border-box'
  ].join(';');

  const card = document.createElement('div');
  card.style.cssText = [
    'width:min(480px,calc(100vw - 24px))','max-height:calc(100vh - 24px)','overflow:auto',
    'background:#102a47','border:3px solid #63d8ff','border-radius:18px','box-shadow:0 20px 70px rgba(0,0,0,.55)',
    'padding:20px','box-sizing:border-box','color:#edf9ff'
  ].join(';');

  const heading = document.createElement('div');
  heading.textContent = title;
  heading.style.cssText = 'font:900 25px Arial,sans-serif;color:#ffd253;text-align:center;margin-bottom:8px';
  card.appendChild(heading);
  overlay.appendChild(card);
  return { overlay, card };
}
function label(text) {
  const el = document.createElement('label');
  el.textContent = text;
  el.style.cssText = 'display:block;font:800 12px Arial,sans-serif;color:#a9d9f4;margin:12px 0 5px';
  return el;
}
function inputBox(placeholder, maxLength = 24) {
  const input = document.createElement('input');
  input.placeholder = placeholder;
  input.maxLength = maxLength;
  input.autocomplete = 'off';
  input.style.cssText = [
    'display:block','width:100%','box-sizing:border-box','border:2px solid #4f93bc','border-radius:10px',
    'background:#07182a','color:white','font:800 18px Arial,sans-serif','padding:11px 12px','outline:none'
  ].join(';');
  return input;
}
function button(text, primary = false) {
  const el = document.createElement('button');
  el.type = 'button';
  el.textContent = text;
  el.style.cssText = [
    'border:2px solid ' + (primary ? '#ffe16a' : '#65c9ff'),
    'border-radius:11px',
    'background:' + (primary ? '#745a20' : '#173d61'),
    'color:white','font:900 14px Arial,sans-serif','padding:10px 14px','cursor:pointer','min-height:43px'
  ].join(';');
  return el;
}
function muted(text) {
  const p = document.createElement('div');
  p.textContent = text;
  p.style.cssText = 'font:12px/1.45 Arial,sans-serif;color:#a9c6d8;text-align:center;margin:7px 0';
  return p;
}

function menuSelections() {
  const menu = globalThis.__MEOW_WARS_MENU_SCENE;
  const arena = ARENAS[menu?.arenaIndex || 0] || ARENAS[0];
  const blue = SQUADS[menu?.blueSquadIndex || 0] || SQUADS[0];
  const red = SQUADS[menu?.redSquadIndex || 1] || SQUADS[1] || SQUADS[0];
  return { arenaId: arena.id, blueSquadId: blue.id, redSquadId: red.id };
}

function inviteUrl(code) {
  const url = new URL(location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('meowRoom', code);
  return url.toString();
}

async function shareRoom(code) {
  const url = inviteUrl(code);
  const text = 'Join my Meow Wars room: MEOW-' + code;
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Meow Wars', text, url });
      return;
    }
    await navigator.clipboard?.writeText(url);
    setStatus('Invite link copied.');
  } catch {
    setStatus('Room code: MEOW-' + code);
  }
}

function openOnlinePanel(prefill = '') {
  closePanel();
  closeLobby();

  const { overlay, card } = cardShell('ONLINE MEOW WARS');
  online.panel = overlay;

  card.appendChild(muted('Private 1v1 room · works across desktop and mobile browsers'));

  card.appendChild(label('YOUR NAME'));
  const name = inputBox('Cat Commander', 24);
  try { name.value = localStorage.getItem('meow-wars-player-name') || ''; } catch {}
  card.appendChild(name);

  const create = button('CREATE PRIVATE ROOM', true);
  create.style.cssText += ';display:block;width:100%;margin-top:14px';
  card.appendChild(create);

  const divider = document.createElement('div');
  divider.textContent = '— OR JOIN —';
  divider.style.cssText = 'text-align:center;color:#789bb2;font:800 11px Arial;margin:16px 0 8px';
  card.appendChild(divider);

  card.appendChild(label('4-DIGIT ROOM CODE'));
  const code = inputBox('4827', 4);
  code.inputMode = 'numeric';
  code.pattern = '[0-9]*';
  code.value = /^\d{4}$/.test(String(prefill || '')) ? String(prefill) : '';
  card.appendChild(code);

  const join = button('JOIN ROOM', true);
  join.style.cssText += ';display:block;width:100%;margin-top:12px';
  card.appendChild(join);

  const status = document.createElement('div');
  status.id = 'mw12-status';
  status.textContent = online.status;
  status.style.cssText = 'min-height:20px;text-align:center;color:#ffe083;font:800 12px Arial;margin-top:12px';
  card.appendChild(status);

  const cancel = button('BACK TO MENU');
  cancel.style.cssText += ';display:block;width:100%;margin-top:8px';
  cancel.onclick = () => closePanel();
  card.appendChild(cancel);

  const validName = () => {
    const value = name.value.trim().slice(0, 24);
    if (!value) throw new Error('Enter your name first.');
    try { localStorage.setItem('meow-wars-player-name', value); } catch {}
    return value;
  };

  create.onclick = async () => {
    try {
      create.disabled = join.disabled = true;
      setStatus('Creating room…');
      const playerName = validName();
      const data = await postJson('/api/meow/create', { name: playerName, ...menuSelections() });
      stats.creates += 1;
      acceptJoin(data, playerName);
    } catch (e) {
      setStatus(e.message);
      create.disabled = join.disabled = false;
    }
  };

  join.onclick = async () => {
    try {
      create.disabled = join.disabled = true;
      const roomCode = code.value.replace(/D/g, '').slice(0, 4);
      if (!/^\d{4}$/.test(roomCode)) throw new Error('Enter all four digits.');
      setStatus('Joining room…');
      const playerName = validName();
      const data = await postJson('/api/meow/join', { code: roomCode, name: playerName });
      stats.joins += 1;
      acceptJoin(data, playerName);
    } catch (e) {
      setStatus(e.message);
      create.disabled = join.disabled = false;
    }
  };

  document.body.appendChild(overlay);
  if (code.value) code.focus(); else name.focus();
}

function acceptJoin(data, name) {
  const session = {
    code: String(data.room.code),
    token: String(data.token),
    id: Number(data.id),
    name
  };
  writeSession(session);
  online.room = data.room;
  online.manualClose = false;
  closePanel();
  connectSocket(true);
  renderLobby();
}

function roomPlayer(id) {
  return online.room?.players?.find((player) => player.id === id) || null;
}

function renderLobby() {
  if (!online.session || !online.room || online.room.phase !== 'lobby') return;
  closePanel();
  closeLobby();

  const { overlay, card } = cardShell('MEOW-' + online.session.code);
  online.lobby = overlay;

  const role = document.createElement('div');
  role.textContent = online.session.id === 0 ? 'YOU ARE BLUE' : 'YOU ARE RED';
  role.style.cssText = 'text-align:center;font:900 12px Arial;color:' + (online.session.id === 0 ? '#72c8ff' : '#ff829c') + ';margin-bottom:8px';
  card.appendChild(role);

  const room = online.room;
  const arena = ARENAS.find((entry) => entry.id === room.settings.arenaId);
  const blue = SQUADS.find((entry) => entry.id === room.settings.blueSquadId);
  const red = SQUADS.find((entry) => entry.id === room.settings.redSquadId);
  card.appendChild(muted((arena?.name || room.settings.arenaId) + ' · ' + (blue?.name || room.settings.blueSquadId) + ' vs ' + (red?.name || room.settings.redSquadId)));

  const players = document.createElement('div');
  players.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0';
  for (const team of [0, 1]) {
    const p = roomPlayer(team);
    const box = document.createElement('div');
    box.style.cssText = [
      'border:2px solid ' + (team === 0 ? '#58b9ff' : '#ff6f8d'),
      'border-radius:12px','padding:12px','text-align:center','background:#081c31'
    ].join(';');
    const name = document.createElement('div');
    name.textContent = p ? p.name : 'Waiting…';
    name.style.cssText = 'font:900 14px Arial;color:white;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
    const state = document.createElement('div');
    state.textContent = !p ? 'EMPTY' : p.connected ? (p.ready ? 'READY' : 'NOT READY') : 'RECONNECTING';
    state.style.cssText = 'font:800 10px Arial;color:' + (!p ? '#718da0' : p.ready ? '#7de39b' : '#ffd16a') + ';margin-top:5px';
    box.append(name, state);
    players.appendChild(box);
  }
  card.appendChild(players);

  const status = document.createElement('div');
  status.id = 'mw12-status';
  status.textContent = online.connected ? 'Connected' : 'Connecting…';
  status.style.cssText = 'text-align:center;color:#a9d9f4;font:800 11px Arial;margin:5px 0 10px';
  card.appendChild(status);

  const me = roomPlayer(online.session.id);
  const host = online.session.id === room.hostId;
  if (!host) {
    const ready = button(me?.ready ? 'READY ✓' : 'I’M READY', true);
    ready.style.cssText += ';width:100%;margin-bottom:8px';
    ready.disabled = Boolean(me?.ready);
    ready.onclick = () => send({ type: 'ready', ready: true });
    card.appendChild(ready);
  } else {
    const connected = room.players.length === 2 && room.players.every((p) => p.connected);
    const allReady = connected && room.players.every((p) => p.ready);
    const start = button(allReady ? 'START BATTLE' : 'WAITING FOR PLAYER…', true);
    start.style.cssText += ';width:100%;margin-bottom:8px';
    start.disabled = !allReady;
    start.onclick = () => {
      setStatus('Starting battle…');
      send({ type: 'start' });
    };
    card.appendChild(start);
  }

  const share = button('SHARE INVITE / COPY LINK');
  share.style.cssText += ';width:100%;margin-bottom:8px';
  share.onclick = () => shareRoom(online.session.code);
  card.appendChild(share);

  const leave = button('LEAVE ROOM');
  leave.style.cssText += ';width:100%';
  leave.onclick = () => leaveOnlineRoom();
  card.appendChild(leave);

  card.appendChild(muted('If a phone sleeps or changes network, the reconnect token restores this room automatically.'));
  document.body.appendChild(overlay);
}

function scheduleReconnect() {
  if (online.manualClose || !online.session || online.reconnectTimer) return;
  if (online.reconnectAttempt >= 8) {
    clearOnlineSession('Room could not be restored. Join again.');
    return;
  }
  const delay = Math.min(10000, 800 * Math.pow(1.65, online.reconnectAttempt++));
  setStatus('Connection lost — reconnecting…');
  online.reconnectTimer = setTimeout(() => {
    online.reconnectTimer = null;
    stats.reconnects += 1;
    connectSocket(false);
  }, delay);
}

function connectSocket(immediate = false) {
  if (!online.session) return;
  if (online.socket && (online.socket.readyState === WebSocket.OPEN || online.socket.readyState === WebSocket.CONNECTING)) return;

  online.manualClose = false;
  const socket = new WebSocket(wsUrl(online.session.code, online.session.token));
  online.socket = socket;
  if (!immediate) setStatus('Reconnecting…');

  socket.onopen = () => {
    if (online.socket !== socket) return;
    online.connected = true;
    online.reconnectAttempt = 0;
    stats.socketOpens += 1;
    setStatus('Connected');
  };

  socket.onmessage = (event) => {
    if (online.socket !== socket) return;
    if (event.data === 'pong') return;
    let message;
    try { message = JSON.parse(event.data); } catch { return; }
    handleMessage(message);
  };

  socket.onerror = () => {
    if (online.socket === socket) setStatus('Network interruption…');
  };

  socket.onclose = (event) => {
    if (online.socket !== socket) return;
    online.connected = false;
    online.socket = null;
    updateConnectionBadge();
    if (event.code === 4000 || event.code === 4010) {
      clearOnlineSession('Room expired.');
      return;
    }
    scheduleReconnect();
  };
}

function ensureMenuForLobby() {
  const game = online.activeScene;
  if (game?.sys?.isActive?.()) {
    game.scene.start('MenuScene');
  }
  setTimeout(() => renderLobby(), 80);
}

function launchBattle(room, checkpoint = null, pendingAction = null) {
  if (!room || room.phase !== 'battle') return;
  closePanel();
  closeLobby();
  online.room = room;
  online.checkpoint = checkpoint || online.checkpoint;
  online.pendingAction = pendingAction || online.pendingAction;
  online.lastAppliedActionSeq = 0;

  const active = globalThis.__MEOW_WARS_GAME_SCENE;
  if (active?.sys?.isActive?.() && active.__mw12MatchId === room.matchId) {
    if (checkpoint) applyCheckpoint(active, checkpoint);
    if (pendingAction) setTimeout(() => applyAction(pendingAction), 20);
    return;
  }

  const menu = globalThis.__MEOW_WARS_MENU_SCENE;
  if (!menu?.sys?.isActive?.()) {
    setTimeout(() => launchBattle(room, checkpoint, pendingAction), 80);
    return;
  }

  stats.starts += 1;
  menu.scene.start('GameScene', {
    mode: 'local',
    arenaId: room.settings.arenaId,
    blueSquadId: room.settings.blueSquadId,
    redSquadId: room.settings.redSquadId
  });
}

function handleMessage(message) {
  if (!message || typeof message !== 'object') return;

  if (message.type === 'welcome') {
    online.room = message.room;
    online.checkpoint = message.checkpoint || null;
    online.pendingAction = message.pendingAction || null;
    online.connected = true;
    if (online.session && online.session.id !== Number(message.id)) {
      writeSession({ ...online.session, id: Number(message.id) });
    }
    if (message.room.phase === 'battle') launchBattle(message.room, message.checkpoint, message.pendingAction);
    else if (message.room.phase === 'lobby') renderLobby();
    return;
  }

  if (message.type === 'room') {
    online.room = message.room;
    stats.roomUpdates += 1;
    if (message.room.phase === 'lobby') ensureMenuForLobby();
    else if (message.room.phase === 'battle') launchBattle(message.room, online.checkpoint, online.pendingAction);
    else updateConnectionBadge();
    return;
  }

  if (message.type === 'start') {
    online.room = message.room;
    online.checkpoint = message.checkpoint || null;
    online.pendingAction = null;
    launchBattle(message.room, null, null);
    return;
  }

  if (message.type === 'pose') {
    applyRemotePose(message);
    return;
  }

  if (message.type === 'action') {
    if (message.action?.seq > online.lastAppliedActionSeq) {
      online.pendingAction = message.action;
      applyAction(message.action);
    }
    return;
  }

  if (message.type === 'checkpoint') {
    online.checkpoint = message.checkpoint;
    const scene = online.activeScene;
    if (scene?.sys?.isActive?.()) applyCheckpoint(scene, message.checkpoint);
    return;
  }

  if (message.type === 'result') {
    online.room = message.room || online.room;
    updateConnectionBadge();
    return;
  }

  if (message.type === 'error') {
    setStatus(message.message || 'Online room error.');
    const scene = online.activeScene;
    if (scene) {
      scene.__mw12FirePending = false;
      scene.__mw12PassPending = false;
    }
  }
}

function clearOnlineSession(message = '') {
  online.manualClose = true;
  if (online.reconnectTimer) clearTimeout(online.reconnectTimer);
  online.reconnectTimer = null;
  try { online.socket?.close(1000, 'Leaving'); } catch {}
  online.socket = null;
  online.connected = false;
  online.room = null;
  online.checkpoint = null;
  online.pendingAction = null;
  online.activeScene = null;
  writeSession(null);
  closePanel();
  closeLobby();
  setStatus(message);
  updateConnectionBadge();
}

function leaveOnlineRoom() {
  online.manualClose = true;
  send({ type: 'leave' });
  clearOnlineSession();
  const scene = globalThis.__MEOW_WARS_GAME_SCENE;
  if (scene?.sys?.isActive?.()) scene.scene.start('MenuScene');
}

function deterministicWind(room, turnNumber, multiplier) {
  let x = ((room.matchSeed >>> 0) ^ Math.imul(turnNumber + 1, 0x9e3779b1)) >>> 0;
  x ^= x << 13; x >>>= 0;
  x ^= x >>> 17; x >>>= 0;
  x ^= x << 5; x >>>= 0;
  const unit = (x >>> 0) / 4294967295;
  return Math.round((unit * 2 - 1) * 20 * multiplier);
}
function onlineBattle(scene) {
  return Boolean(
    online.session &&
    online.room?.phase === 'battle' &&
    scene &&
    scene.__mw12MatchId === online.room.matchId
  );
}
function localTeam() {
  return online.session ? Number(online.session.id) : -1;
}
function encodeTerrain(data) {
  const bytes = new Uint8Array(Math.ceil(data.length / 8));
  for (let i = 0; i < data.length; i += 1) if (data[i]) bytes[i >> 3] |= 1 << (i & 7);
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
function decodeTerrain(encoded, target) {
  const binary = atob(encoded);
  let bit = 0;
  for (let i = 0; i < binary.length && bit < target.length; i += 1) {
    const byte = binary.charCodeAt(i);
    for (let j = 0; j < 8 && bit < target.length; j += 1, bit += 1) target[bit] = (byte >> j) & 1;
  }
}
function encodeAmmo(scene) {
  return scene.teamAmmo.map((map) => Object.fromEntries([...map].map(([key, value]) => [key, value === Infinity ? 'I' : value])));
}
function decodeAmmo(record) {
  return new Map(Object.entries(record || {}).map(([key, value]) => [key, value === 'I' ? Infinity : Number(value)]));
}
function serializeCheckpoint(scene) {
  const props = (scene.__mw11Props || []).map((prop) => ({
    type: prop.type,
    x: Math.round(prop.x * 10) / 10,
    hp: Math.round(prop.hp * 10) / 10,
    destroyed: Boolean(prop.destroyed),
    angle: Math.round((prop.image?.angle || 0) * 10) / 10
  }));
  return {
    matchId: online.room.matchId,
    checkpointSeq: ++online.checkpointSeq,
    turnNumber: scene.turnNumber,
    turnIndex: scene.turns.index,
    selectedWeaponId: WEAPONS[scene.selectedWeaponIndex]?.id || 'bazooka',
    aimAngleDeg: scene.aimAngleDeg,
    facing: scene.facing,
    terrain: encodeTerrain(scene.terrain.data),
    cats: scene.cats.map((cat) => ({
      id: cat.id,
      x: Math.round(cat.x * 100) / 100,
      y: Math.round(cat.y * 100) / 100,
      vx: Math.round(cat.vx * 100) / 100,
      vy: Math.round(cat.vy * 100) / 100,
      health: Math.round(cat.health * 100) / 100,
      alive: Boolean(cat.alive)
    })),
    ammo: encodeAmmo(scene),
    props
  };
}
function applyCheckpoint(scene, checkpoint) {
  if (!checkpoint || !online.room || checkpoint.matchId !== online.room.matchId || !scene?.terrain) return;
  try {
    decodeTerrain(checkpoint.terrain, scene.terrain.data);
    scene.paintTerrainTexture();

    for (const saved of checkpoint.cats || []) {
      const cat = scene.catById(saved.id);
      if (!cat) continue;
      cat.x = Number(saved.x);
      cat.y = Number(saved.y);
      cat.vx = Number(saved.vx || 0);
      cat.vy = Number(saved.vy || 0);
      cat.health = Math.max(0, Math.min(100, Number(saved.health)));
      cat.alive = Boolean(saved.alive) && cat.health > 0;
      cat.sprite?.setAlpha?.(cat.alive ? 1 : .42);
      if (!cat.alive) cat.sprite?.setAngle?.(18);
    }

    scene.turnNumber = Number(checkpoint.turnNumber) || 1;
    scene.turns.index = Math.max(0, Math.min(scene.turns.order.length - 1, Number(checkpoint.turnIndex) || 0));
    const weaponIndex = WEAPONS.findIndex((weapon) => weapon.id === checkpoint.selectedWeaponId);
    if (weaponIndex >= 0) scene.selectedWeaponIndex = weaponIndex;
    scene.aimAngleDeg = Number(checkpoint.aimAngleDeg) || 42;
    scene.facing = checkpoint.facing === -1 ? -1 : 1;
    if (Array.isArray(checkpoint.ammo) && checkpoint.ammo.length === 2) {
      scene.teamAmmo = [decodeAmmo(checkpoint.ammo[0]), decodeAmmo(checkpoint.ammo[1])];
    }

    for (const saved of checkpoint.props || []) {
      const prop = (scene.__mw11Props || []).find((item) => item.type === saved.type && Math.abs(item.x - saved.x) < 3);
      if (!prop) continue;
      prop.hp = Number(saved.hp);
      prop.destroyed = Boolean(saved.destroyed);
      if (prop.destroyed) prop.image?.destroy?.();
      else if (prop.image?.active) {
        prop.image.angle = Number(saved.angle || 0);
        prop.image.setAlpha(.62 + .38 * Math.max(0, Math.min(1, prop.hp / prop.maxHp)));
      }
    }

    for (const projectile of scene.projectiles || []) projectile.object?.destroy?.();
    for (const item of scene.deployables || []) item.object?.destroy?.();
    for (const runner of scene.runners || []) runner.object?.destroy?.();
    scene.projectiles = [];
    scene.deployables = [];
    scene.runners = [];
    scene.actionLocked = false;
    scene.gameOver = false;
    scene.turnRemainingMs = TURN_MS;
    scene.wind = deterministicWind(online.room, scene.turnNumber, scene.arena.windMultiplier);
    scene.syncSprites();
    stats.checkpointsApplied += 1;
  } catch (e) {
    console.warn('Meow Wars online checkpoint could not be applied', e);
  }
}
function sendCheckpoint(scene) {
  if (!onlineBattle(scene) || !online.connected) return;
  try {
    const checkpoint = serializeCheckpoint(scene);
    online.checkpoint = checkpoint;
    if (send({ type: 'checkpoint', checkpoint })) stats.checkpointsSent += 1;
  } catch (e) {
    console.warn('Meow Wars checkpoint failed', e);
  }
}
function sendPose(scene) {
  if (!onlineBattle(scene) || !online.connected) return;
  const cat = scene.activeCat();
  if (!cat || cat.team !== localTeam() || online.room.activePlayer !== localTeam()) return;
  const now = scene.time.now;
  if (now - (scene.__mw12LastPoseAt || 0) < 75) return;

  const pose = {
    type: 'pose',
    seq: ++online.inputSeq,
    x: cat.x,
    aimAngleDeg: scene.aimAngleDeg,
    chargePower: scene.chargePower,
    facing: scene.facing,
    weaponId: WEAPONS[scene.selectedWeaponIndex]?.id || 'bazooka'
  };
  const sig = [Math.round(pose.x), Math.round(pose.aimAngleDeg), Math.round(pose.chargePower * 20), pose.facing, pose.weaponId].join(':');
  if (sig === scene.__mw12LastPoseSig) return;
  scene.__mw12LastPoseSig = sig;
  scene.__mw12LastPoseAt = now;
  if (send(pose)) stats.posesSent += 1;
}
function applyRemotePose(message) {
  const scene = online.activeScene;
  if (!onlineBattle(scene) || !message.pose || message.matchId !== online.room.matchId) return;
  if (message.playerId === localTeam() || scene.actionLocked) return;
  const cat = scene.activeCat();
  if (!cat || cat.team !== message.playerId) return;
  cat.x = Math.max(12, Math.min(WIDTH - 12, Number(message.pose.x)));
  const ground = surfaceY(scene.terrain, cat.x);
  if (ground < HEIGHT && cat.vy === 0) cat.y = ground - CAT_FOOT;
  scene.aimAngleDeg = Number(message.pose.aimAngleDeg);
  scene.chargePower = Number(message.pose.chargePower);
  scene.facing = message.pose.facing === -1 ? -1 : 1;
  const weaponIndex = WEAPONS.findIndex((weapon) => weapon.id === message.pose.weaponId);
  if (weaponIndex >= 0) scene.selectedWeaponIndex = weaponIndex;
  scene.syncSprites();
  stats.posesReceived += 1;
}
function applyAction(action) {
  const scene = online.activeScene;
  if (!onlineBattle(scene) || !action || action.matchId !== online.room.matchId) {
    online.pendingAction = action;
    return;
  }
  if (action.seq <= online.lastAppliedActionSeq) return;
  online.lastAppliedActionSeq = action.seq;
  online.pendingAction = null;
  scene.__mw12LastActionActor = action.playerId;

  if (action.type === 'pass') {
    scene.__mw12ApplyingPass = true;
    scene.__mw12PassPending = false;
    try { v11EndTurn.call(scene, action.reason || 'timeout'); }
    finally { scene.__mw12ApplyingPass = false; }
    if (action.playerId === localTeam()) setTimeout(() => sendCheckpoint(scene), 30);
    stats.actionsApplied += 1;
    return;
  }

  if (action.type !== 'fire') return;
  const cat = scene.activeCat();
  if (!cat || cat.team !== action.playerId) {
    console.warn('Meow Wars online turn mismatch', { current: cat?.team, action: action.playerId });
    return;
  }

  cat.x = Math.max(12, Math.min(WIDTH - 12, Number(action.x)));
  const ground = surfaceY(scene.terrain, cat.x);
  if (ground < HEIGHT && cat.vy === 0) cat.y = ground - CAT_FOOT;
  scene.aimAngleDeg = Number(action.aimAngleDeg);
  scene.chargePower = Number(action.chargePower);
  scene.facing = action.facing === -1 ? -1 : 1;
  scene.turnNumber = Number(action.turnNumber) || scene.turnNumber;
  const index = WEAPONS.findIndex((weapon) => weapon.id === action.weaponId);
  if (index >= 0) scene.selectedWeaponIndex = index;

  scene.__mw12ApplyingAction = true;
  scene.__mw12FirePending = false;
  scene.actionLocked = false;
  try { v11FireCurrentWeapon.call(scene); }
  finally { scene.__mw12ApplyingAction = false; }
  stats.actionsApplied += 1;
}
function updateConnectionBadge() {
  const scene = online.activeScene;
  if (!scene?.sys?.isActive?.()) return;
  if (!scene.__mw12Badge?.active) {
    scene.__mw12Badge = scene.add.text(1260, 86, '', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '11px',
      color: '#ffffff',
      backgroundColor: 'rgba(8,26,48,.86)',
      padding: { x: 8, y: 5 }
    }).setOrigin(1, 0).setDepth(160);
  }
  const role = localTeam() === 0 ? 'BLUE' : 'RED';
  scene.__mw12Badge.setText((online.connected ? '● ONLINE' : '○ RECONNECTING') + ' · ' + role + ' · MEOW-' + (online.session?.code || '----'));
  scene.__mw12Badge.setColor(online.connected ? '#8ff0ad' : '#ffd26c');
}

const v11MenuCreate = MenuScene.prototype.create;
MenuScene.prototype.create = function() {
  v11MenuCreate.call(this);

  for (const child of this.children.list) {
    if (typeof child.text === 'string') {
      if (child.text.includes('MEOW WARS v1.1.0')) child.setText(child.text.replace('MEOW WARS v1.1.0', 'MEOW WARS v' + MW12_VERSION));
      if (child.text.includes('mw-v11-living-battlefields-20260918a')) child.setText(child.text.replace('mw-v11-living-battlefields-20260918a', MW12_BUILD));
    }
  }

  const onlineButton = this.add.rectangle(940, 195, 175, 42, 0x214d68, .99)
    .setStrokeStyle(2, 0x7de7bb, .95)
    .setInteractive({ useHandCursor: true })
    .setDepth(70);
  this.add.text(940, 195, '🌐  ONLINE', {
    fontFamily: 'Arial Black, Arial',
    fontSize: '14px',
    color: '#ffffff'
  }).setOrigin(.5).setDepth(71);
  onlineButton.on('pointerdown', () => {
    const roomCode = new URLSearchParams(location.search).get('meowRoom') || '';
    openOnlinePanel(roomCode);
  });

  globalThis.__MEOW_WARS_MENU_SCENE = this;

  if (online.session && !online.socket) {
    setTimeout(() => connectSocket(true), 60);
  } else {
    const invite = new URLSearchParams(location.search).get('meowRoom');
    if (invite && /^\d{4}$/.test(invite) && !online.session) setTimeout(() => openOnlinePanel(invite), 100);
  }
};

const v11StartTurn = GameScene.prototype.startTurn;
GameScene.prototype.startTurn = function(initial) {
  const result = v11StartTurn.call(this, initial);
  if (online.room?.phase === 'battle') {
    this.wind = deterministicWind(online.room, this.turnNumber, this.arena.windMultiplier);
  }
  return result;
};

const v11GameCreate = GameScene.prototype.create;
GameScene.prototype.create = function() {
  v11GameCreate.call(this);
  if (online.room?.phase === 'battle' && online.session) {
    online.activeScene = this;
    this.__mw12MatchId = online.room.matchId;
    this.__mw12OnlineTeam = localTeam();
    this.__mw12FirePending = false;
    this.__mw12PassPending = false;
    this.wind = deterministicWind(online.room, this.turnNumber, this.arena.windMultiplier);
    updateConnectionBadge();

    const checkpoint = online.checkpoint;
    const pending = online.pendingAction;
    this.time.delayedCall(40, () => {
      if (checkpoint) applyCheckpoint(this, checkpoint);
      if (pending) this.time.delayedCall(30, () => applyAction(pending));
    });
  }
  const marker = this.children.getByName('mw-build-marker');
  if (marker?.setText) marker.setText('v' + MW12_VERSION + ' · ' + MW12_BUILD);
};

const v11UpdateHumanInput = GameScene.prototype.updateHumanInput;
GameScene.prototype.updateHumanInput = function(dtMs) {
  if (!onlineBattle(this)) return v11UpdateHumanInput.call(this, dtMs);
  const cat = this.activeCat();
  if (!cat || cat.team !== localTeam() || online.room.activePlayer !== localTeam() || this.__mw12FirePending || this.__mw12PassPending) return;
  const result = v11UpdateHumanInput.call(this, dtMs);
  sendPose(this);
  return result;
};

const v11FireCurrentWeapon = GameScene.prototype.fireCurrentWeapon;
GameScene.prototype.fireCurrentWeapon = function() {
  if (!onlineBattle(this) || this.__mw12ApplyingAction) return v11FireCurrentWeapon.call(this);
  const cat = this.activeCat();
  if (!cat || cat.team !== localTeam() || online.room.activePlayer !== localTeam() || this.__mw12FirePending) return;

  const weapon = WEAPONS[this.selectedWeaponIndex];
  const message = {
    type: 'fire',
    turnNumber: this.turnNumber,
    x: cat.x,
    aimAngleDeg: this.aimAngleDeg,
    chargePower: this.chargePower,
    facing: this.facing,
    weaponId: weapon.id
  };
  if (send(message)) {
    this.__mw12FirePending = true;
    this.actionLocked = true;
    stats.actionsSent += 1;
  } else {
    setStatus('Not connected — trying to reconnect.');
    scheduleReconnect();
  }
};

const v11EndTurn = GameScene.prototype.endTurn;
GameScene.prototype.endTurn = function(reason = 'fired') {
  if (!onlineBattle(this)) return v11EndTurn.call(this, reason);

  if (reason === 'timeout' && !this.__mw12ApplyingPass) {
    const cat = this.activeCat();
    if (cat?.team === localTeam() && online.room.activePlayer === localTeam() && !this.__mw12PassPending) {
      if (send({ type: 'pass', turnNumber: this.turnNumber, reason: 'timeout' })) {
        this.__mw12PassPending = true;
        this.actionLocked = true;
        stats.actionsSent += 1;
      }
    }
    this.turnRemainingMs = 650;
    return;
  }

  const actor = this.__mw12LastActionActor;
  const result = v11EndTurn.call(this, reason);
  this.__mw12FirePending = false;
  this.__mw12PassPending = false;
  if (reason === 'fired' && actor === localTeam()) setTimeout(() => sendCheckpoint(this), 30);
  return result;
};

const v11UpdateHud = GameScene.prototype.updateHud;
GameScene.prototype.updateHud = function() {
  v11UpdateHud.call(this);
  if (!onlineBattle(this)) return;
  const cat = this.activeCat();
  const mine = cat?.team === localTeam() && online.room.activePlayer === localTeam();
  this.hud.helpText?.setText?.(mine
    ? 'YOUR TURN · A/D move · W/S aim\nSPACE fire · Q/E weapons'
    : (online.connected ? 'OPPONENT TURN · waiting…' : 'RECONNECTING…'));
};

const v11CheckWin = GameScene.prototype.checkWin;
GameScene.prototype.checkWin = function() {
  const wasOver = this.gameOver;
  const result = v11CheckWin.call(this);
  if (!wasOver && this.gameOver && onlineBattle(this) && !this.__mw12ResultSent && this.__mw12LastActionActor === localTeam()) {
    this.__mw12ResultSent = true;
    const blueAlive = this.cats.some((cat) => cat.team === 0 && cat.alive);
    const redAlive = this.cats.some((cat) => cat.team === 1 && cat.alive);
    const winnerTeam = blueAlive && !redAlive ? 0 : redAlive && !blueAlive ? 1 : null;
    if (send({ type: 'result', result: { winnerTeam, reason: 'elimination' } })) stats.resultsSent += 1;
  }
  return result;
};

const v11RestartInput = GameScene.prototype.handleRestartInput;
GameScene.prototype.handleRestartInput = function() {
  if (!online.session || !online.room) return v11RestartInput.call(this);
  if (!this.gameOver) return;

  const menuDown = Boolean(this.keys?.menu?.isDown);
  const restartDown = Boolean(this.keys?.restart?.isDown);

  if (menuDown && !this.__mw12MenuHeld) {
    this.__mw12MenuHeld = true;
    leaveOnlineRoom();
    return;
  }
  if (!menuDown) this.__mw12MenuHeld = false;

  if (restartDown && !this.__mw12RestartHeld) {
    this.__mw12RestartHeld = true;
    if (online.session.id === online.room.hostId && online.room.phase === 'results') {
      send({ type: 'rematch' });
    } else {
      this.hud?.helpText?.setText?.('HOST MUST START THE REMATCH');
    }
    return;
  }
  if (!restartDown) this.__mw12RestartHeld = false;
};

const v11GameUpdate = GameScene.prototype.update;
GameScene.prototype.update = function(time, delta) {
  v11GameUpdate.call(this, time, delta);
  if (onlineBattle(this)) updateConnectionBadge();
};

const previousBuildInfo = globalThis.__MEOW_WARS_BUILD_INFO;
document.documentElement.dataset.meowWarsVersion = MW12_VERSION;
document.documentElement.dataset.meowWarsBuild = MW12_BUILD;
const host = document.getElementById('game');
if (host) {
  host.dataset.version = MW12_VERSION;
  host.dataset.build = MW12_BUILD;
}

globalThis.__MEOW_WARS_ONLINE_API = {
  async create(name = 'Blue Commander') {
    const data = await postJson('/api/meow/create', { name, ...menuSelections() });
    stats.creates += 1;
    acceptJoin(data, name);
    return data.room;
  },
  async join(code, name = 'Red Commander') {
    const data = await postJson('/api/meow/join', { code: String(code), name });
    stats.joins += 1;
    acceptJoin(data, name);
    return data.room;
  },
  ready() { return send({ type: 'ready', ready: true }); },
  start() { return send({ type: 'start' }); },
  rematch() { return send({ type: 'rematch' }); },
  leave() { leaveOnlineRoom(); },
  state() {
    return {
      session: online.session ? { code: online.session.code, id: online.session.id, name: online.session.name } : null,
      room: online.room ? structuredClone(online.room) : null,
      connected: online.connected,
      checkpoint: online.checkpoint ? structuredClone(online.checkpoint) : null,
      stats: { ...stats }
    };
  }
};

globalThis.__MEOW_WARS_VERSION = MW12_VERSION;
globalThis.__MEOW_WARS_BUILD = MW12_BUILD;
globalThis.__MEOW_WARS_BUILD_INFO = () => {
  const base = typeof previousBuildInfo === 'function' ? previousBuildInfo() : {};
  return {
    ...base,
    version: MW12_VERSION,
    build: MW12_BUILD,
    online: {
      available: true,
      privateRooms: true,
      maxPlayers: 2,
      reconnect: true,
      session: online.session ? { code: online.session.code, id: online.session.id } : null,
      connected: online.connected
    },
    v12Stats: { ...stats }
  };
};
})();
