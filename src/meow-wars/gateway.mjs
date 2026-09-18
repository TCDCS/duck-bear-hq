/* Public same-origin gateway for Meow Wars two-player rooms. */
import { LIMITS } from './room-state.mjs';

export const netHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer'
};

export const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), { status, headers: { ...netHeaders, ...extra } });

const error = (status, message) => Object.assign(new Error(message), { status });

async function smallBody(request, limit = 3500) {
  const declared = Number(request.headers.get('Content-Length') || 0);
  if (declared > limit) throw error(413, 'Request is too large.');
  if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json'))
    throw error(415, 'Send a JSON request.');

  const reader = request.body?.getReader();
  if (!reader) throw error(400, 'A JSON object is required.');

  let total = 0;
  const parts = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        throw error(413, 'Request is too large.');
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }

  let body;
  try { body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw error(400, 'Invalid JSON.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw error(400, 'A JSON object is required.');
  return body;
}

function cleanName(value) {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name || name.length > 28) throw error(400, 'Enter a player name (1–28 characters).');
  return name;
}

function cleanId(value, fallback = '') {
  const id = typeof value === 'string' ? value.trim() : fallback;
  if (!/^[a-z0-9-]{2,50}$/.test(id)) throw error(400, 'Invalid room setup.');
  return id;
}

async function clientHash(request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'development';
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode('meow-wars-rate-v1:' + ip)
  );
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function requestPayload(body, includeCode = false) {
  const allowed = new Set(includeCode
    ? ['code', 'name']
    : ['name', 'arenaId', 'blueSquadId', 'redSquadId']);

  for (const key of Object.keys(body))
    if (!allowed.has(key)) throw error(400, 'Unknown room field.');

  const payload = { name: cleanName(body.name) };
  if (includeCode) payload.code = String(body.code || '');
  else {
    payload.arenaId = cleanId(body.arenaId, 'garden-siege');
    payload.blueSquadId = cleanId(body.blueSquadId, 'alley-aces');
    payload.redSquadId = cleanId(body.redSquadId, 'night-shift');
  }
  return payload;
}

export async function routeMeowWarsMultiplayer(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/meow-wars/version' && request.method === 'GET') {
    return json({
      version: 1,
      maxPlayers: LIMITS.maxPlayers,
      roomTtlMs: LIMITS.roomTtlMs,
      multiplayer: Boolean(env.MEOW_ROOMS && env.MEOW_DIRECTORY)
    });
  }

  const action =
    path === '/api/meow-wars/create' ? 'create' :
    path === '/api/meow-wars/join' ? 'join' :
    null;
  const socket = path.match(/^\/api\/meow-wars\/(\d{4})\/socket$/);

  if (!action && !socket) return json({ error: 'Meow Wars endpoint not found.' }, 404);

  const origin = request.headers.get('Origin');
  if (origin && origin !== url.origin) return json({ error: 'Cross-site connection blocked.' }, 403);

  try {
    if (socket) {
      if (request.method !== 'GET' || request.headers.get('Upgrade')?.toLowerCase() !== 'websocket')
        return json({ error: 'A WebSocket connection is required.' }, 426);

      const token = url.searchParams.get('token');
      if (!/^[a-f\d-]{36}$/i.test(token || '')) return json({ error: 'Join the room first.' }, 401);
      if (!env.MEOW_ROOMS) return json({ error: 'Meow Wars online rooms are unavailable. Local play still works.' }, 503);

      return env.MEOW_ROOMS
        .get(env.MEOW_ROOMS.idFromName('meow-v1:' + socket[1]))
        .fetch(request);
    }

    if (request.method !== 'POST')
      return json({ error: 'Use POST.' }, 405, { Allow: 'POST' });

    const body = await smallBody(request);
    if (action === 'join' && !/^\d{4}$/.test(body.code || ''))
      return json({ error: 'Enter exactly four digits, including any leading zero.' }, 400);

    if (!env.MEOW_DIRECTORY || !env.MEOW_ROOMS)
      return json({ error: 'Meow Wars online rooms are unavailable. Local play still works.' }, 503);

    const data = requestPayload(body, action === 'join');
    const payload = {
      action,
      client: await clientHash(request),
      ...data
    };

    const stub = env.MEOW_DIRECTORY.get(env.MEOW_DIRECTORY.idFromName('meow-v1-directory'));
    return await stub.fetch(new Request('https://internal/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }));
  } catch (err) {
    return json({
      error: err?.status ? err.message : 'The Meow Wars room service is unavailable. Try again or play locally.'
    }, err?.status || 503);
  }
}
