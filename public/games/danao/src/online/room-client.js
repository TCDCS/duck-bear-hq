const CODE_KEY = 'danao.reconnect.code';
const TOKEN_KEY = 'danao.reconnect.token';
const INPUT_INTERVAL_MS = 1000 / 30;
const SNAPSHOT_INTERVAL_MS = 1000 / 15;

const validCode = (value) => /^\d{4}$/.test(String(value || ''));
const validToken = (value) => typeof value === 'string' && value.length >= 16 && value.length <= 128;
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, min, max) => Math.max(min, Math.min(max, finite(value)));

function defaultBaseUrl() {
  const origin = globalThis.location?.origin;
  return origin && /^https?:/i.test(origin) ? origin : 'https://duck-bear-hq.zachary-chambers2.workers.dev';
}

function normaliseBase(value) {
  const url = new URL(value || defaultBaseUrl());
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Danao online requires HTTP or HTTPS.');
  return url.origin;
}

function defaultStorage() {
  try { return globalThis.sessionStorage || null; }
  catch { return null; }
}

function attach(socket, type, handler) {
  if (typeof socket?.addEventListener === 'function') socket.addEventListener(type, handler);
  else if (socket) socket['on' + type] = handler;
}

async function readJson(response) {
  let body = null;
  try { body = await response.json(); } catch {}
  if (!response.ok) throw new Error(body?.error || `Danao room request failed (${response.status}).`);
  return body;
}

export function createDanaoRoomClient(options = {}) {
  const baseUrl = normaliseBase(options.baseUrl);
  const fetchImpl = options.fetchImpl || globalThis.fetch?.bind(globalThis);
  const WebSocketCtor = options.WebSocketCtor || globalThis.WebSocket;
  const storage = options.storage === undefined ? defaultStorage() : options.storage;
  const events = new Map();

  let room = null;
  let playerId = -1;
  let token = null;
  let socket = null;
  let lastSnapshotSeq = -1;
  let inputSeq = 0;
  let stateSeq = 0;
  let lastInputAt = -Infinity;
  let lastStateAt = -Infinity;

  const emit = (type, value) => {
    for (const fn of events.get(type) || []) {
      try { fn(value); } catch {}
    }
  };

  const persist = () => {
    if (!storage) return;
    if (validCode(room?.code) && validToken(token)) {
      storage.setItem?.(CODE_KEY, room.code);
      storage.setItem?.(TOKEN_KEY, token);
    }
  };

  const clearPersisted = () => {
    storage?.removeItem?.(CODE_KEY);
    storage?.removeItem?.(TOKEN_KEY);
  };

  const acceptSnapshot = (state) => {
    const seq = Number(state?.seq);
    if (!Number.isInteger(seq) || seq < 0 || seq <= lastSnapshotSeq) return false;
    lastSnapshotSeq = seq;
    emit('snapshot', state);
    return true;
  };

  const handleMessage = (event) => {
    const raw = event?.data;
    if (typeof raw !== 'string' || raw.length > 30000) return;
    let message;
    try { message = JSON.parse(raw); } catch { return; }
    if (!message || typeof message !== 'object' || Array.isArray(message) || typeof message.type !== 'string') return;

    switch (message.type) {
      case 'welcome':
        if (Number.isInteger(message.id) && message.id >= 0 && message.id <= 3) playerId = message.id;
        if (message.room && typeof message.room === 'object') {
          room = message.room;
          emit('room', room);
        }
        if (message.state) acceptSnapshot(message.state);
        emit('connected', true);
        break;
      case 'room':
        if (message.room && typeof message.room === 'object') {
          room = message.room;
          emit('room', room);
        }
        break;
      case 'snapshot':
        if (message.state) acceptSnapshot(message.state);
        break;
      case 'input':
        if (Number.isInteger(message.id) && message.frame && typeof message.frame === 'object') {
          emit('input', { id: message.id, frame: message.frame });
        }
        break;
      case 'host':
        if (Number.isInteger(message.hostId)) {
          if (room) room = { ...room, hostId: message.hostId };
          emit('host', { hostId: message.hostId, state: message.state || null });
        }
        break;
      case 'result':
        if (message.result && typeof message.result === 'object') emit('result', message.result);
        break;
      case 'error':
        emit('error', message.message || 'The Danao room could not be updated.');
        break;
      default:
        break;
    }
  };

  const connect = () => {
    if (!validCode(room?.code) || !validToken(token) || typeof WebSocketCtor !== 'function') return false;
    try { socket?.close?.(1000, 'Reconnecting'); } catch {}
    const page = new URL(baseUrl);
    const scheme = page.protocol === 'https:' ? 'wss:' : 'ws:';
    const socketUrl = `${scheme}//${page.host}/api/danao/${encodeURIComponent(room.code)}/socket?token=${encodeURIComponent(token)}`;
    socket = new WebSocketCtor(socketUrl);
    attach(socket, 'open', () => emit('connected', true));
    attach(socket, 'message', handleMessage);
    attach(socket, 'close', (event) => {
      emit('connected', false);
      if (event?.code && event.code !== 1000) emit('error', event.reason || 'Danao online connection closed.');
    });
    attach(socket, 'error', () => emit('error', 'Danao online connection error.'));
    return true;
  };

  const send = (value) => {
    if (!socket || socket.readyState !== 1) return false;
    try {
      socket.send(JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  };

  const requestRoom = async (path, payload, requestOptions = {}) => {
    if (typeof fetchImpl !== 'function') throw new Error('Danao room service is unavailable.');
    const response = await fetchImpl(baseUrl + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await readJson(response);
    if (!data?.room || !validCode(data.room.code) || !Number.isInteger(data.id) || !validToken(data.token)) {
      throw new Error('The Danao room service returned an invalid response.');
    }
    room = data.room;
    playerId = data.id;
    token = data.token;
    lastSnapshotSeq = -1;
    inputSeq = 0;
    stateSeq = 0;
    persist();
    emit('room', room);
    if (requestOptions.connect !== false) connect();
    return { room, id: playerId, token };
  };

  const api = {
    on(type, handler) {
      if (typeof handler !== 'function') return () => {};
      if (!events.has(type)) events.set(type, new Set());
      events.get(type).add(handler);
      return () => events.get(type)?.delete(handler);
    },
    off(type, handler) { events.get(type)?.delete(handler); },
    async createRoom(player, requestOptions) {
      return requestRoom('/api/danao/create', {
        name: String(player?.name || '').trim(),
        character: player?.character || 'Hero',
        costume: player?.costume || 'Arcade',
      }, requestOptions);
    },
    async joinRoom(player, requestOptions) {
      const code = String(player?.code || '').trim();
      if (!validCode(code)) throw new Error('Enter exactly four digits, including any leading zero.');
      return requestRoom('/api/danao/join', {
        code,
        name: String(player?.name || '').trim(),
        character: player?.character || 'Hero',
        costume: player?.costume || 'Arcade',
      }, requestOptions);
    },
    connect,
    reconnectLast() {
      const code = storage?.getItem?.(CODE_KEY);
      const savedToken = storage?.getItem?.(TOKEN_KEY);
      if (!validCode(code) || !validToken(savedToken)) return false;
      room = { code, hostId: -1, phase: 'lobby', players: [] };
      playerId = -1;
      token = savedToken;
      lastSnapshotSeq = -1;
      return connect();
    },
    restoreSession(session = {}) {
      if (!validCode(session.code) || !validToken(session.token)) return false;
      room = session.room && typeof session.room === 'object' ? session.room : { code: session.code, hostId: -1, phase: 'lobby', players: [] };
      if (!room.code) room.code = session.code;
      playerId = Number.isInteger(session.id) ? session.id : -1;
      token = session.token;
      lastSnapshotSeq = -1;
      inputSeq = 0;
      stateSeq = 0;
      persist();
      return true;
    },
    sendReady(ready) { return send({ type: 'ready', ready: Boolean(ready) }); },
    sendChoice(character, costume = 'Arcade') { return send({ type: 'choice', character, costume }); },
    sendSetup(settings = {}) { return send({ type: 'setup', ...settings }); },
    sendStart() { return send({ type: 'start' }); },
    sendRematch() { return send({ type: 'rematch' }); },
    sendLocked(locked) { return send({ type: 'lock', locked: Boolean(locked) }); },
    sendResult(result = {}) { return send({ type: 'result', result }); },
    sendInput(input = {}, at = globalThis.performance?.now?.() ?? Date.now()) {
      const time = finite(at, Date.now());
      if (time - lastInputAt < INPUT_INTERVAL_MS) return false;
      const message = {
        type: 'input',
        seq: ++inputSeq,
        moveX: clamp(input.moveX, -1, 1),
        moveY: clamp(input.moveY ?? input.moveZ, -1, 1),
        jump: Boolean(input.jump),
        punch: Boolean(input.punch ?? input.light),
        grab: Boolean(input.grab),
        dodge: Boolean(input.dodge),
        fire: Boolean(input.fire ?? input.heavy),
        block: Boolean(input.block),
      };
      if (!send(message)) {
        inputSeq--;
        return false;
      }
      lastInputAt = time;
      return true;
    },
    sendState(snapshot = {}, at = globalThis.performance?.now?.() ?? Date.now()) {
      const time = finite(at, Date.now());
      if (time - lastStateAt < SNAPSHOT_INTERVAL_MS) return false;
      const state = { ...snapshot, seq: ++stateSeq };
      if (!send({ type: 'state', state })) {
        stateSeq--;
        return false;
      }
      lastStateAt = time;
      return true;
    },
    leave() {
      send({ type: 'leave' });
      try { socket?.close?.(1000, 'Left the room'); } catch {}
      socket = null;
      room = null;
      playerId = -1;
      token = null;
      lastSnapshotSeq = -1;
      clearPersisted();
      emit('room', null);
      emit('connected', false);
    },
    close() {
      try { socket?.close?.(1000, 'Closed'); } catch {}
      socket = null;
      emit('connected', false);
    },
    get room() { return room; },
    get playerId() { return playerId; },
    get token() { return token; },
    get connected() { return Boolean(socket && socket.readyState === 1); },
    get isHost() { return Boolean(room && playerId >= 0 && room.hostId === playerId); },
    get inviteUrl() { return validCode(room?.code) ? `${baseUrl}/games/danao/?room=${room.code}` : ''; },
    get baseUrl() { return baseUrl; },
  };

  return api;
}
