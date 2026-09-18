import * as R from './room-state.mjs';
import { json } from './gateway.mjs';

const internal = (path, body) => new Request('https://internal' + path, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});
const fail = (e) => json({ error: e?.status ? e.message : 'The Meow Wars room could not be updated.' }, e?.status || 503);

export class MeowDirectory {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.ready = ctx.blockConcurrencyWhile(async () => {
      this.data = await ctx.storage.get('directory') || { codes: {}, rates: {} };
    });
  }

  async fetch(request) {
    await this.ready;
    if (new URL(request.url).pathname !== '/request' || request.method !== 'POST') return json({ error: 'Not found.' }, 404);

    return this.ctx.blockConcurrencyWhile(async () => {
      try {
        const q = await request.json();
        const now = Date.now();
        if (!/^[a-fd]{64}$/.test(q.client || '')) return json({ error: 'Invalid request.' }, 400);
        if (!['create', 'join'].includes(q.action)) return json({ error: 'Not found.' }, 404);

        for (const [code, entry] of Object.entries(this.data.codes)) {
          if (entry.expiresAt <= now) delete this.data.codes[code];
        }
        for (const [key, rate] of Object.entries(this.data.rates)) {
          if (now - rate.at >= 60 * 60 * 1000) delete this.data.rates[key];
        }

        let rate = this.data.rates[q.client];
        if (!rate || now - rate.at >= 60 * 60 * 1000) rate = { at: now, create: 0, join: 0 };
        rate[q.action] += 1;
        this.data.rates[q.client] = rate;

        if (Object.keys(this.data.rates).length > 5000) delete this.data.rates[Object.keys(this.data.rates)[0]];
        if (rate.create > 12 || rate.join > 80) {
          await this.ctx.storage.put('directory', this.data);
          return json({ error: 'Too many room attempts. Please wait before trying again.' }, 429);
        }

        if (q.action === 'join') {
          if (!/^d{4}$/.test(q.code || '') || !this.data.codes[q.code]) {
            await this.ctx.storage.put('directory', this.data);
            return json({ error: 'Room not found or expired. Check the four-digit code.' }, 404);
          }
          await this.ctx.storage.put('directory', this.data);
          const stub = this.env.MEOW_ROOMS.get(this.env.MEOW_ROOMS.idFromName('meow-v1:' + q.code));
          return stub.fetch(internal('/join', q));
        }

        if (Object.keys(this.data.codes).length >= 1000) return json({ error: 'All Meow Wars room slots are busy. Try again shortly.' }, 503);

        let code;
        for (let i = 0; i < 100; i += 1) {
          const n = crypto.getRandomValues(new Uint32Array(1))[0];
          if (n >= 4294960000) continue;
          const candidate = String(n % 10000).padStart(4, '0');
          if (!this.data.codes[candidate]) {
            code = candidate;
            break;
          }
        }
        if (code === undefined) return json({ error: 'Could not reserve a room. Try again.' }, 503);

        this.data.codes[code] = { expiresAt: now + R.ROOM_TTL_MS };
        await this.ctx.storage.put('directory', this.data);

        const stub = this.env.MEOW_ROOMS.get(this.env.MEOW_ROOMS.idFromName('meow-v1:' + code));
        const response = await stub.fetch(internal('/create', { ...q, code }));
        if (!response.ok) {
          delete this.data.codes[code];
          await this.ctx.storage.put('directory', this.data);
        }
        await this.ctx.storage.setAlarm(now + R.ROOM_TTL_MS);
        return response;
      } catch (e) {
        return fail(e);
      }
    });
  }

  async alarm() {
    await this.ready;
    const now = Date.now();
    for (const [code, entry] of Object.entries(this.data.codes)) if (entry.expiresAt <= now) delete this.data.codes[code];
    for (const [key, rate] of Object.entries(this.data.rates)) if (now - rate.at >= 60 * 60 * 1000) delete this.data.rates[key];
    await this.ctx.storage.put('directory', this.data);
    if (Object.keys(this.data.codes).length || Object.keys(this.data.rates).length) {
      await this.ctx.storage.setAlarm(now + 60 * 60 * 1000);
    }
  }
}

export class MeowRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.sockets = new Map();
    this.rate = new Map();

    this.ready = ctx.blockConcurrencyWhile(async () => {
      const saved = await ctx.storage.get('room');
      this.room = saved ? R.restoreRoom(saved) : null;
      if (this.room) {
        for (const player of this.room.players) player.connected = false;
        for (const ws of ctx.getWebSockets()) {
          const attachment = ws.deserializeAttachment();
          const player = this.room.players.find((entry) => entry.id === attachment?.id);
          if (player) {
            this.sockets.set(player.id, ws);
            player.connected = true;
          } else {
            try { ws.close(4000, 'Room expired'); } catch {}
          }
        }
        if (!this.room.players.some((player) => player.id === this.room.hostId && player.connected)) {
          const next = [...this.sockets.keys()].sort((a, b) => a - b)[0];
          if (next !== undefined) this.room.hostId = next;
        }
      } else {
        for (const ws of ctx.getWebSockets()) {
          try { ws.close(4000, 'Room expired'); } catch {}
        }
      }
    });

    if (typeof WebSocketRequestResponsePair !== 'undefined') {
      ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    }
  }

  async save() {
    if (this.room) await this.ctx.storage.put('room', R.persistRoom(this.room));
  }

  send(ws, data) {
    try {
      if ((ws.bufferedAmount || 0) > 300000) {
        ws.close(4002, 'Connection too slow');
        return;
      }
      ws.send(typeof data === 'string' ? data : JSON.stringify(data));
    } catch {}
  }

  broadcast(data, except = null) {
    const message = typeof data === 'string' ? data : JSON.stringify(data);
    for (const [id, ws] of this.sockets) if (id !== except) this.send(ws, message);
  }

  roomUpdate() {
    if (this.room) this.broadcast({ type: 'room', room: R.publicRoom(this.room) });
  }

  async fetch(request) {
    await this.ready;
    const url = new URL(request.url);

    try {
      if (url.pathname === '/create' && request.method === 'POST') {
        return this.ctx.blockConcurrencyWhile(async () => {
          const q = await request.json();
          const now = Date.now();
          if (this.room && this.room.expiresAt > now) return json({ error: 'Room slot is occupied. Create another room.' }, 409);
          for (const ws of this.sockets.values()) {
            try { ws.close(4000, 'Room replaced'); } catch {}
          }
          this.sockets.clear();
          this.room = R.makeRoom(q.code, q, now);
          await this.save();
          await this.ctx.storage.setAlarm(this.room.expiresAt);
          return json({ room: R.publicRoom(this.room), id: 0, token: this.room.players[0].token }, 201);
        });
      }

      if (!this.room) return json({ error: 'Room not found or expired.' }, 404);

      if (url.pathname === '/join' && request.method === 'POST') {
        return this.ctx.blockConcurrencyWhile(async () => {
          try {
            const player = R.joinRoom(this.room, await request.json(), Date.now());
            await this.save();
            this.roomUpdate();
            return json({ room: R.publicRoom(this.room), id: player.id, token: player.token }, 201);
          } catch (e) {
            return fail(e);
          }
        });
      }

      if (request.method !== 'GET' || request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
        return json({ error: 'WebSocket required.' }, 426);
      }

      const player = R.authenticate(this.room, url.searchParams.get('token'), Date.now());
      const previous = this.sockets.get(player.id);
      if (previous) {
        try { previous.close(4001, 'Connected somewhere else'); } catch {}
      }

      const [client, server] = Object.values(new WebSocketPair());
      server.serializeAttachment({ id: player.id });
      this.ctx.acceptWebSocket(server, [String(player.id)]);
      this.sockets.set(player.id, server);
      R.connect(this.room, player.id, Date.now());
      this.send(server, { type: 'welcome', id: player.id, ...R.publicSnapshot(this.room) });
      this.roomUpdate();
      await this.save();
      return new Response(null, { status: 101, webSocket: client });
    } catch (e) {
      return fail(e);
    }
  }

  async webSocketMessage(ws, message) {
    await this.ready;
    const attachment = ws.deserializeAttachment();
    if (!this.room || !attachment || this.sockets.get(attachment.id) !== ws) {
      try { ws.close(4001, 'Connection replaced'); } catch {}
      return;
    }

    try {
      if (typeof message !== 'string' || message.length > R.MAX_CHECKPOINT_BYTES + 4096) {
        ws.close(1009, 'Message too large');
        return;
      }

      const now = Date.now();
      const rate = this.rate.get(attachment.id) || { at: now, n: 0 };
      if (now - rate.at >= 1000) {
        rate.at = now;
        rate.n = 0;
      }
      rate.n += 1;
      this.rate.set(attachment.id, rate);
      if (rate.n > 70) {
        ws.close(1008, 'Too many messages');
        return;
      }

      if (message === 'ping') {
        this.send(ws, 'pong');
        return;
      }

      let msg;
      try { msg = JSON.parse(message); }
      catch { throw new R.RoomError(400, 'Invalid message.'); }
      if (!msg || typeof msg !== 'object' || Array.isArray(msg)) throw new R.RoomError(400, 'Invalid message.');

      let save = true;
      let broadcastRoom = true;

      if (msg.type === 'pose') {
        const event = R.setPose(this.room, attachment.id, msg, now);
        if (event) this.broadcast(event, attachment.id);
        save = false;
        broadcastRoom = false;
      } else if (msg.type === 'fire') {
        const action = R.fire(this.room, attachment.id, msg, now);
        this.broadcast({ type: 'action', action });
      } else if (msg.type === 'checkpoint') {
        const accepted = R.setCheckpoint(this.room, attachment.id, msg.checkpoint, now);
        if (accepted) this.broadcast({ type: 'checkpoint', checkpoint: this.room.checkpoint }, attachment.id);
      } else if (msg.type === 'ready') {
        R.setReady(this.room, attachment.id, msg.ready, now);
      } else if (msg.type === 'setup') {
        R.configureRoom(this.room, attachment.id, msg, now);
      } else if (msg.type === 'start') {
        R.startRoom(this.room, attachment.id, now);
        this.broadcast({ type: 'start', room: R.publicRoom(this.room), checkpoint: null });
      } else if (msg.type === 'result') {
        R.finishRoom(this.room, attachment.id, msg.result || msg, now);
        this.broadcast({ type: 'result', room: R.publicRoom(this.room), result: this.room.result });
      } else if (msg.type === 'rematch') {
        R.rematch(this.room, attachment.id, now);
      } else if (msg.type === 'leave') {
        R.leaveRoom(this.room, attachment.id, now);
        this.sockets.delete(attachment.id);
        try { ws.close(1000, 'Left the room'); } catch {}
        if (!this.room.players.length) this.room.expiresAt = now;
      } else {
        throw new R.RoomError(400, 'Unknown room command.');
      }

      if (save) await this.save();
      if (broadcastRoom) this.roomUpdate();
    } catch (e) {
      this.send(ws, { type: 'error', message: e?.status ? e.message : 'The room could not be updated.' });
    }
  }

  async webSocketClose(ws, code = 1000, reason = 'Connection closed') {
    try { ws.close(code === 1005 ? 1000 : code, reason); } catch {}
    await this.ready;
    const attachment = ws.deserializeAttachment();
    if (!this.room || !attachment || this.sockets.get(attachment.id) !== ws) return;
    this.sockets.delete(attachment.id);
    this.rate.delete(attachment.id);
    R.disconnect(this.room, attachment.id, Date.now());
    this.roomUpdate();
    await this.save();
  }

  async webSocketError(ws) {
    await this.webSocketClose(ws, 1011, 'Connection interrupted');
  }

  async alarm() {
    await this.ready;
    if (!this.room || this.room.expiresAt <= Date.now()) {
      for (const ws of this.sockets.values()) {
        try { ws.close(4000, 'Room expired'); } catch {}
      }
      this.sockets.clear();
      this.room = null;
      await this.ctx.storage.deleteAll();
    } else {
      await this.ctx.storage.setAlarm(this.room.expiresAt);
    }
  }
}
