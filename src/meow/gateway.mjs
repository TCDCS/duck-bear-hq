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

export async function smallBody(request, limit = 3500) {
  const declared = Number(request.headers.get('Content-Length') || 0);
  if (declared > limit) throw error(413, 'Request is too large.');
  if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) throw error(415, 'Send a JSON request.');

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
  try {
    body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw error(400, 'Invalid JSON.');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw error(400, 'A JSON object is required.');
  return body;
}

function cleanName(value) {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name || name.length > 24) throw error(400, 'Enter a player name (1–24 characters).');
  return name;
}
function cleanId(value, fallback) {
  const text = typeof value === 'string' ? value.trim() : '';
  return /^[a-z0-9-]{1,48}$/.test(text) ? text : fallback;
}
function createPayload(body) {
  const allowed = new Set(['name', 'arenaId', 'blueSquadId', 'redSquadId']);
  for (const key of Object.keys(body)) if (!allowed.has(key)) throw error(400, 'Unknown room field.');
  return {
    name: cleanName(body.name),
    arenaId: cleanId(body.arenaId, 'garden-siege'),
    blueSquadId: cleanId(body.blueSquadId, 'alley-aces'),
    redSquadId: cleanId(body.redSquadId, 'night-shift')
  };
}
function joinPayload(body) {
  const allowed = new Set(['code', 'name']);
  for (const key of Object.keys(body)) if (!allowed.has(key)) throw error(400, 'Unknown room field.');
  if (!/^d{4}$/.test(String(body.code || ''))) throw error(400, 'Enter exactly four digits, including any leading zero.');
  return { code: String(body.code), name: cleanName(body.name) };
}
async function clientHash(request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'development';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('meow-rate-v1:' + ip));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function routeMeowMultiplayer(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/meow/version' && request.method === 'GET') {
    return json({
      version: 1,
      maxPlayers: LIMITS.maxPlayers,
      checkpointBytes: LIMITS.checkpointBytes,
      multiplayer: Boolean(env.MEOW_ROOMS && env.MEOW_DIRECTORY)
    });
  }

  const action = path === '/api/meow/create' ? 'create' : path === '/api/meow/join' ? 'join' : null;
  const socket = path.match(/^/api/meow/(d{4})/socket$/);
  if (!action && !socket) return json({ error: 'Meow Wars endpoint not found.' }, 404);

  const origin = request.headers.get('Origin');
  if (origin && origin !== url.origin) return json({ error: 'Cross-site connection blocked.' }, 403);

  try {
    if (socket) {
      if (request.method !== 'GET' || request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
        return json({ error: 'A WebSocket connection is required.' }, 426);
      }
      const token = url.searchParams.get('token');
      if (!/^[a-fd-]{36}$/i.test(token || '')) return json({ error: 'Join the room first.' }, 401);
      if (!env.MEOW_ROOMS) return json({ error: 'Meow Wars online rooms are unavailable. Local play still works.' }, 503);
      const stub = env.MEOW_ROOMS.get(env.MEOW_ROOMS.idFromName('meow-v1:' + socket[1]));
      return stub.fetch(request);
    }

    if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405, { Allow: 'POST' });
    const body = await smallBody(request);
    const data = action === 'create' ? createPayload(body) : joinPayload(body);

    if (!env.MEOW_DIRECTORY || !env.MEOW_ROOMS) {
      return json({ error: 'Meow Wars online rooms are unavailable. Local play still works.' }, 503);
    }

    const payload = { action, client: await clientHash(request), ...data };
    const directory = env.MEOW_DIRECTORY.get(env.MEOW_DIRECTORY.idFromName('meow-v1-directory'));
    return directory.fetch(new Request('https://internal/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }));
  } catch (e) {
    return json({
      error: e?.status ? e.message : 'The Meow Wars room service is unavailable. Try again or play locally.'
    }, e?.status || 503);
  }
}
