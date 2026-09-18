/* Meow Wars online room state — two-player private turn-based rooms. */
const MAX_PLAYERS = 2;
export const ROOM_TTL_MS = 2 * 60 * 60 * 1000;
export const MAX_SNAPSHOT_BYTES = 64 * 1024;
export const MAX_EVENT_BYTES = 8 * 1024;
const MAX_NAME = 28;
const MAX_INTENT_SEQ = 2147483647;

const ARENAS = new Set([
  'garden-siege',
  'rooftop-rumble',
  'junkyard-jamboree',
  'taj-mahal',
  'oconnell-bridge-spire',
  'westminster-bridge-big-ben',
  'donabate-beach'
]);

export class RoomError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'RoomError';
    this.status = status;
  }
}

const fail = (status, message) => { throw new RoomError(status, message); };
const uuid = () => globalThis.crypto?.randomUUID?.() ||
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

function cleanName(value) {
  if (typeof value !== 'string') fail(400, 'Enter a player name.');
  const name = value.trim().replace(/[\u0000-\u001f\u007f]/g, '');
  if (!name || name.length > MAX_NAME) fail(400, 'Player name must be 1–28 characters.');
  return name;
}

function safeSquad(value, fallback) {
  const id = typeof value === 'string' ? value.trim() : '';
  if (!id) return fallback;
  if (!/^[a-z0-9-]{2,40}$/.test(id)) fail(400, 'Invalid squad.');
  return id;
}

function safeArena(value) {
  const id = typeof value === 'string' ? value.trim() : '';
  if (!ARENAS.has(id)) fail(400, 'Unknown battlefield.');
  return id;
}

function ensureRoom(room, now = Date.now()) {
  if (!room || typeof room !== 'object') fail(404, 'Room not found.');
  if (now > room.expiresAt) fail(410, 'Room expired.');
  if (room.phase === 'closed') fail(410, 'Room is closed.');
}

function getPlayer(room, id) {
  const player = room.players.find((p) => p.id === id);
  if (!player) fail(404, 'Player not found.');
  return player;
}

function requireHost(room, id) {
  if (room.hostId !== id) fail(403, 'Only the host can do that.');
  return getPlayer(room, id);
}

function playerData(data, id, team, now) {
  return {
    id,
    team,
    token: uuid(),
    name: cleanName(data?.name || (id === 0 ? 'Host' : 'Guest')),
    ready: id === 0,
    connected: false,
    joinedAt: now,
    lastSeen: now,
    disconnectedAt: null,
    intentSeq: -1,
    lastIntentAt: 0
  };
}

function byteLength(value) {
  let json;
  try { json = JSON.stringify(value); }
  catch { fail(400, 'State must be JSON serialisable.'); }
  return new TextEncoder().encode(json).byteLength;
}

function finite(value, min, max, name) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
    fail(400, `Invalid ${name}.`);
  return value;
}

function integer(value, min, max, name) {
  if (!Number.isInteger(value) || value < min || value > max)
    fail(400, `Invalid ${name}.`);
  return value;
}

function validateIntent(data, player, room, now) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) fail(400, 'Intent is required.');
  if (room.phase !== 'battle') fail(409, 'Battle has not started.');
  if (!player.connected) fail(409, 'Player is not connected.');
  if (player.team !== room.turnTeam) fail(409, 'Wait for your turn.');

  const seq = integer(data.seq, 0, MAX_INTENT_SEQ, 'intent sequence');
  if (seq <= player.intentSeq) return null;

  const kind = String(data.kind || '');
  if (!['state', 'fire', 'weapon'].includes(kind)) fail(400, 'Unknown control intent.');

  const intent = { seq, kind };
  if (kind === 'state') {
    intent.x = finite(Number(data.x), 12, 1268, 'x');
    intent.angle = finite(Number(data.angle), 8, 82, 'aim angle');
    intent.facing = integer(Number(data.facing), -1, 1, 'facing');
    if (intent.facing === 0) fail(400, 'Invalid facing.');
    if (data.weaponId !== undefined) {
      const weaponId = String(data.weaponId);
      if (!/^[a-z0-9-]{2,40}$/.test(weaponId)) fail(400, 'Invalid weapon.');
      intent.weaponId = weaponId;
    }
  } else if (kind === 'fire') {
    intent.angle = finite(Number(data.angle), 8, 82, 'aim angle');
    intent.power = finite(Number(data.power), 0.36, 1, 'fire power');
    intent.facing = integer(Number(data.facing), -1, 1, 'facing');
    if (intent.facing === 0) fail(400, 'Invalid facing.');
    const weaponId = String(data.weaponId || '');
    if (!/^[a-z0-9-]{2,40}$/.test(weaponId)) fail(400, 'Invalid weapon.');
    intent.weaponId = weaponId;
  } else {
    const weaponId = String(data.weaponId || '');
    if (!/^[a-z0-9-]{2,40}$/.test(weaponId)) fail(400, 'Invalid weapon.');
    intent.weaponId = weaponId;
  }

  player.intentSeq = seq;
  player.lastIntentAt = now;
  player.lastSeen = now;
  room.updatedAt = now;
  return intent;
}

function validateSnapshot(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) fail(400, 'Snapshot is required.');
  if (byteLength(data) > MAX_SNAPSHOT_BYTES) fail(413, 'Snapshot is too large.');

  const out = {
    seq: integer(data.seq, 0, MAX_INTENT_SEQ, 'snapshot sequence'),
    turnTeam: integer(data.turnTeam, 0, 1, 'turn team'),
    turnNumber: integer(data.turnNumber, 1, 9999, 'turn number'),
    activeId: String(data.activeId || '').slice(0, 24),
    wind: finite(Number(data.wind), -60, 60, 'wind'),
    timerMs: finite(Number(data.timerMs), 0, 120000, 'timer'),
    selectedWeaponId: String(data.selectedWeaponId || '').slice(0, 40),
    chargePower: finite(Number(data.chargePower), 0.36, 1, 'charge'),
    actionLocked: Boolean(data.actionLocked),
    gameOver: Boolean(data.gameOver),
    winnerTeam: data.winnerTeam == null ? null : integer(data.winnerTeam, -1, 1, 'winner team'),
    cats: [],
    projectiles: [],
    deployables: [],
    runners: [],
    craters: [],
    props: []
  };

  if (!Array.isArray(data.cats) || data.cats.length > 6) fail(400, 'Invalid cat snapshot.');
  out.cats = data.cats.map((cat) => ({
    id: String(cat?.id || '').slice(0, 24),
    team: integer(cat?.team, 0, 1, 'cat team'),
    x: finite(Number(cat?.x), -100, 1380, 'cat x'),
    y: finite(Number(cat?.y), -200, 900, 'cat y'),
    vx: finite(Number(cat?.vx || 0), -3000, 3000, 'cat vx'),
    vy: finite(Number(cat?.vy || 0), -3000, 3000, 'cat vy'),
    health: finite(Number(cat?.health), 0, 100, 'cat health'),
    alive: Boolean(cat?.alive)
  }));

  const list = (value, max, label) => {
    if (!Array.isArray(value) || value.length > max) fail(400, `Invalid ${label} snapshot.`);
    return value;
  };
  out.projectiles = list(data.projectiles || [], 24, 'projectile').map((p) => ({
    id: String(p?.id || '').slice(0, 36),
    weaponId: String(p?.weaponId || '').slice(0, 40),
    x: finite(Number(p?.x), -100, 1380, 'projectile x'),
    y: finite(Number(p?.y), -300, 900, 'projectile y'),
    rotation: finite(Number(p?.rotation || 0), -20, 20, 'projectile rotation')
  }));
  out.deployables = list(data.deployables || [], 16, 'deployable').map((p) => ({
    id: String(p?.id || '').slice(0, 36),
    weaponId: String(p?.weaponId || '').slice(0, 40),
    x: finite(Number(p?.x), -50, 1330, 'deployable x'),
    y: finite(Number(p?.y), -100, 800, 'deployable y')
  }));
  out.runners = list(data.runners || [], 12, 'runner').map((p) => ({
    id: String(p?.id || '').slice(0, 36),
    weaponId: String(p?.weaponId || '').slice(0, 40),
    x: finite(Number(p?.x), -100, 1380, 'runner x'),
    y: finite(Number(p?.y), -100, 800, 'runner y'),
    direction: integer(Number(p?.direction || 1), -1, 1, 'runner direction')
  }));
  out.craters = list(data.craters || [], 96, 'crater').map((c) => ({
    x: finite(Number(c?.x), -50, 1330, 'crater x'),
    y: finite(Number(c?.y), -100, 820, 'crater y'),
    radius: finite(Number(c?.radius), 1, 180, 'crater radius')
  }));
  out.props = list(data.props || [], 32, 'prop').map((p) => ({
    type: String(p?.type || '').slice(0, 40),
    x: finite(Number(p?.x), -50, 1330, 'prop x'),
    y: finite(Number(p?.y), -100, 900, 'prop y'),
    hp: finite(Number(p?.hp || 0), 0, 200, 'prop hp'),
    destroyed: Boolean(p?.destroyed),
    angle: finite(Number(p?.angle || 0), -360, 360, 'prop angle')
  }));
  return out;
}

export function makeRoom(code, data, now = Date.now()) {
  if (!/^\d{4}$/.test(String(code))) fail(400, 'Room code must be four digits.');
  const arenaId = safeArena(data?.arenaId || 'garden-siege');
  const host = playerData(data, 0, 0, now);
  return {
    version: 1,
    code: String(code),
    createdAt: now,
    updatedAt: now,
    expiresAt: now + ROOM_TTL_MS,
    phase: 'lobby',
    hostId: 0,
    matchId: 0,
    turnTeam: 0,
    settings: {
      arenaId,
      blueSquadId: safeSquad(data?.blueSquadId, 'alley-aces'),
      redSquadId: safeSquad(data?.redSquadId, 'night-shift')
    },
    players: [host],
    latestSnapshot: null,
    snapshotSeq: -1,
    result: null
  };
}

export function joinRoom(room, data, now = Date.now()) {
  ensureRoom(room, now);
  if (room.phase !== 'lobby') fail(409, 'Battle already started.');
  if (room.players.length >= MAX_PLAYERS) fail(409, 'Room is full.');
  if (room.players.some((p) => p.id === 1)) fail(409, 'Room is full.');
  const guest = playerData(data, 1, 1, now);
  room.players.push(guest);
  room.updatedAt = now;
  return guest;
}

export function authenticate(room, token, now = Date.now()) {
  ensureRoom(room, now);
  if (typeof token !== 'string' || token.length < 16 || token.length > 128) fail(401, 'Invalid room pass.');
  const player = room.players.find((p) => p.token === token);
  if (!player) fail(401, 'Invalid room pass.');
  player.lastSeen = now;
  return player;
}

export function connect(room, id, now = Date.now()) {
  ensureRoom(room, now);
  const player = getPlayer(room, id);
  player.connected = true;
  player.disconnectedAt = null;
  player.lastSeen = now;
  room.updatedAt = now;
  return player;
}

export function disconnect(room, id, now = Date.now()) {
  if (!room || room.phase === 'closed') return null;
  const player = getPlayer(room, id);
  player.connected = false;
  player.disconnectedAt = now;
  player.lastSeen = now;
  if (room.phase === 'lobby' && player.id === 1) player.ready = false;
  room.updatedAt = now;
  return player;
}

export function leaveRoom(room, id, now = Date.now()) {
  ensureRoom(room, now);
  if (id === room.hostId) {
    room.phase = 'closed';
    room.expiresAt = now;
    room.updatedAt = now;
    return room;
  }
  room.players = room.players.filter((p) => p.id !== id);
  room.updatedAt = now;
  return room;
}

export function setReady(room, id, value) {
  ensureRoom(room);
  if (room.phase !== 'lobby') fail(409, 'Ready state is locked during a battle.');
  const player = getPlayer(room, id);
  player.ready = id === room.hostId ? true : Boolean(value);
  room.updatedAt = Date.now();
  return player.ready;
}

export function configureRoom(room, id, data) {
  ensureRoom(room);
  requireHost(room, id);
  if (room.phase !== 'lobby') fail(409, 'Battle setup is locked.');
  if (!data || typeof data !== 'object' || Array.isArray(data)) fail(400, 'Setup is required.');

  const allowed = new Set(['arenaId', 'blueSquadId', 'redSquadId']);
  for (const key of Object.keys(data)) if (!allowed.has(key)) fail(400, 'Unknown setup field.');

  if (data.arenaId !== undefined) room.settings.arenaId = safeArena(data.arenaId);
  if (data.blueSquadId !== undefined) room.settings.blueSquadId = safeSquad(data.blueSquadId, room.settings.blueSquadId);
  if (data.redSquadId !== undefined) room.settings.redSquadId = safeSquad(data.redSquadId, room.settings.redSquadId);
  room.updatedAt = Date.now();
  return room.settings;
}

export function startRoom(room, id, now = Date.now()) {
  ensureRoom(room, now);
  requireHost(room, id);
  if (room.phase !== 'lobby') fail(409, 'Battle already started.');
  if (room.players.length !== 2 || room.players.some((p) => !p.connected))
    fail(409, 'Both players must be connected.');
  if (room.players.some((p) => !p.ready)) fail(409, 'Both players must be ready.');

  room.phase = 'battle';
  room.matchId += 1;
  room.turnTeam = 0;
  room.latestSnapshot = null;
  room.snapshotSeq = -1;
  room.result = null;
  for (const player of room.players) {
    player.intentSeq = -1;
    player.lastIntentAt = 0;
  }
  room.updatedAt = now;
  return room;
}

export function setIntent(room, id, data, now = Date.now()) {
  ensureRoom(room, now);
  const player = getPlayer(room, id);
  return validateIntent(data, player, room, now);
}

export function setHostSnapshot(room, id, data, now = Date.now()) {
  ensureRoom(room, now);
  requireHost(room, id);
  if (room.phase !== 'battle') fail(409, 'Battle is not running.');
  const snapshot = validateSnapshot(data);
  if (snapshot.seq <= room.snapshotSeq) return false;
  room.snapshotSeq = snapshot.seq;
  room.latestSnapshot = structuredClone(snapshot);
  room.turnTeam = snapshot.turnTeam;
  room.updatedAt = now;
  return true;
}

export function relayHostEvent(room, id, data, now = Date.now()) {
  ensureRoom(room, now);
  requireHost(room, id);
  if (room.phase !== 'battle') fail(409, 'Battle is not running.');
  if (!data || typeof data !== 'object' || Array.isArray(data)) fail(400, 'Event is required.');
  if (byteLength(data) > MAX_EVENT_BYTES) fail(413, 'Event is too large.');
  room.updatedAt = now;
  return structuredClone(data);
}

export function finishRoom(room, id, data, now = Date.now()) {
  ensureRoom(room, now);
  requireHost(room, id);
  if (room.phase !== 'battle') fail(409, 'Battle is not running.');
  if (!data || typeof data !== 'object' || Array.isArray(data) || byteLength(data) > 4096)
    fail(400, 'Invalid battle result.');
  const winnerTeam = data.winnerTeam == null ? null : integer(data.winnerTeam, -1, 1, 'winner team');
  room.result = { winnerTeam, reason: String(data.reason || 'complete').slice(0, 80) };
  room.phase = 'results';
  room.updatedAt = now;
  return room.result;
}

export function rematch(room, id, now = Date.now()) {
  ensureRoom(room, now);
  requireHost(room, id);
  if (!['results', 'lobby'].includes(room.phase)) fail(409, 'Rematch is not available.');
  room.phase = 'lobby';
  room.turnTeam = 0;
  room.latestSnapshot = null;
  room.snapshotSeq = -1;
  room.result = null;
  for (const player of room.players) {
    player.ready = player.id === room.hostId;
    player.intentSeq = -1;
  }
  room.updatedAt = now;
  return room;
}

function publicPlayer(player) {
  return {
    id: player.id,
    team: player.team,
    name: player.name,
    ready: Boolean(player.ready),
    connected: Boolean(player.connected)
  };
}

export function publicRoom(room) {
  return {
    version: room.version,
    code: room.code,
    phase: room.phase,
    hostId: room.hostId,
    matchId: room.matchId,
    turnTeam: room.turnTeam,
    settings: { ...room.settings },
    players: room.players.map(publicPlayer),
    result: room.result ? structuredClone(room.result) : null,
    expiresAt: room.expiresAt
  };
}

export function persistRoom(room) {
  return structuredClone(room);
}

export function restoreRoom(saved) {
  if (!saved || typeof saved !== 'object' || !/^\d{4}$/.test(String(saved.code)) || !Array.isArray(saved.players))
    fail(400, 'Invalid saved room.');
  return structuredClone(saved);
}

export const LIMITS = Object.freeze({
  maxPlayers: MAX_PLAYERS,
  roomTtlMs: ROOM_TTL_MS,
  maxSnapshotBytes: MAX_SNAPSHOT_BYTES,
  maxEventBytes: MAX_EVENT_BYTES
});
