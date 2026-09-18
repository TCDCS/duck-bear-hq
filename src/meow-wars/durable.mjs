/* Cloudflare Durable Objects for Meow Wars private online rooms. */
import * as R from './room-state.mjs';

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  }
});

const internal = (path, body) => new Request('https://internal' + path, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

function fail(error) {
  return json({
    error: error?.status ? error.message : 'The Meow Wars room could not be updated.'
  }, error?.status || 503);
}

export class MeowWarsDirectory {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.ready = ctx.blockConcurrencyWhile(async () => {
      this.data = await ctx.storage.get('directory') || { codes: {}, rates: {} };
    });
  }

  async fetch(request) {
    await this.ready;
    if (new URL(request.url).pathname !== '/request' || request.method !== 'POST')
      return json({ error: 'Not found.' }, 404);

    return this.ctx.blockConcurrencyWhile(async () => {
      try {
        const query = await request.json();
        const now = Date.now();
        if (!/^[a-f\d]{64}$/.test(query.client || '')) return json({ error: 'Invalid request.' }, 400);
        if (!['create', 'join'].includes(query.action)) return json({ error: 'Not found.' }, 404);

        for (const [code, entry] of Object.entries(this.data.codes))
          if (entry.expiresAt <= now) delete this.data.codes[code];
        for (const [key, rate] of Object.entries(this.data.rates))
          if (now - rate.at >= 3600000) delete this.data.rates[key];

        let rate = this.data.rates[query.client];
        if (!rate || now - rate.at >= 3600000) rate = { at: now, create: 0, join: 0 };
        rate[query.action] += 1;
        this.data.rates[query.client] = rate;
        if (Object.keys(this.data.rates).length > 5000) delete this.data.rates[Object.keys(this.data.rates)[0]];

        if (rate.create > 12 || rate.join > 90) {
          await this.ctx.storage.put('directory', this.data);
          return json({ error: 'Too many room attempts. Please wait before trying again.' }, 429);
        }

        if (query.action === 'join') {
          if (!/^\d{4}$/.test(query.code || '') || !this.data.codes[query.code]) {
            await this.ctx.storage.put('directory', this.data);
            return json({ error: 'Room not found or expired. Check the four-digit code.' }, 404);
          }
          await this.ctx.storage.put('directory', this.data);
          const stub = this.env.MEOW_ROOMS.get(this.env.MEOW_ROOMS.idFromName('meow-v1:' + query.code));
          return await stub.fetch(internal('/join', query));
        }

        if (Object.keys(this.data.codes).length >= 1000)
          return json({ error: 'All room slots are busy. Try again shortly.' }, 503);

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
        const response = await stub.fetch(internal('/create', { ...query, code }));
        if (!response.ok) {
          delete this.data.codes[code];
          await this.ctx.storage.put('directory', this.data);
        }
        await this.ctx.storage.setAlarm(now + R.ROOM_TTL_MS);
        return response;
      } catch (error) {
        return fail(error);
      }
    });
  }

  async alarm() {
    await this.ready;
    const now = Date.now();
    for (const [code, entry] of Object.entries(this.data.codes))
      if (entry.expiresAt <= now) delete this.data.codes[code];
    for (const [key, rate] of Object.entries(this.data.rates))
      if (now - rate.at >= 3600000) delete this.data.rates[key];

    await this.ctx.storage.put('directory', this.data);
    if (Object.keys(this.data.codes).length || Object.keys(this.data.rates).length)
      await this.ctx.storage.setAlarm(now + 3600000);
  }
}

export class MeowWarsRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.sockets = new Map();
    this.rate = new Map();
    this.lastSnapshotSave = 0;

    this.ready = ctx.blockConcurrencyWhile(async () => {
      const saved = await ctx.storage.get('room');
      this.room = saved ? R.restoreRoom(saved) : null;

      if (this.room) {
        for (const player of this.room.players) player.connected = false;
        for (const socket of ctx.getWebSockets()) {
          const attachment = socket.deserializeAttachment();
          const player = this.room.players.find((p) => p.id === attachment?.id);
          if (player) {
            this.sockets.set(player.id, socket);
            player.connected = true;
          } else {
            try { socket.close(4000, 'Room expired'); } catch {}
          }
        }
      } else {
        for (const socket of ctx.getWebSockets()) {
          try { socket.close(4000, 'Room expired'); } catch {}
        }
      }
    });

    if (typeof WebSocketRequestResponsePair !== 'undefined')
      ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  async save() {
    if (this.room) await this.ctx.storage.put('room', R.persistRoom(this.room));
  }

  send(socket, data) {
    try {
      if ((socket.bufferedAmount || 0) > 400000) {
        socket.close(4002, 'Connection too slow');
        return;
      }
      socket.send(typeof data === 'string' ? data : JSON.stringify(data));
    } catch {}
  }

  broadcast(data, exceptId = null) {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    for (const [id, socket] of this.sockets)
      if (id !== exceptId) this.send(socket, payload);
  }

  lobby() {
    if (this.room) this.broadcast({ type: 'room', room: R.publicRoom(this.room) });
  }

  hostSocket() {
    return this.room ? this.sockets.get(this.room.hostId) : null;
  }

  async fetch(request) {
    await this.ready;
    const url = new URL(request.url);

    try {
      if (url.pathname === '/create' && request.method === 'POST') {
        return await this.ctx.blockConcurrencyWhile(async () => {
          const query = await request.json();
          const now = Date.now();
          if (this.room && this.room.expiresAt > now && this.room.phase !== 'closed')
            return json({ error: 'Room slot is occupied. Create another room.' }, 409);

          for (const socket of this.sockets.values()) {
            try { socket.close(4000, 'Room replaced'); } catch {}
          }
          this.sockets.clear();

          this.room = R.makeRoom(query.code, query, now);
          await this.save();
          await this.ctx.storage.setAlarm(this.room.expiresAt);
          return json({
            room: R.publicRoom(this.room),
            id: 0,
            team: 0,
            token: this.room.players[0].token
          }, 201);
        });
      }

      if (!this.room) return json({ error: 'Room not found or expired.' }, 404);

      if (url.pathname === '/join' && request.method === 'POST') {
        return await this.ctx.blockConcurrencyWhile(async () => {
          try {
            const player = R.joinRoom(this.room, await request.json(), Date.now());
            await this.save();
            this.lobby();
            return json({
              room: R.publicRoom(this.room),
              id: player.id,
              team: player.team,
              token: player.token
            }, 201);
          } catch (error) {
            return fail(error);
          }
        });
      }

      if (request.method !== 'GET' || request.headers.get('Upgrade')?.toLowerCase() !== 'websocket')
        return json({ error: 'WebSocket required.' }, 426);

      const player = R.authenticate(this.room, url.searchParams.get('token'), Date.now());
      const previous = this.sockets.get(player.id);
      if (previous) {
        try { previous.close(4001, 'Connected in another tab'); } catch {}
      }

      const [client, server] = Object.values(new WebSocketPair());
      server.serializeAttachment({ id: player.id });
      this.ctx.acceptWebSocket(server, [String(player.id)]);
      this.sockets.set(player.id, server);
      R.connect(this.room, player.id, Date.now());

      this.send(server, {
        type: 'welcome',
        id: player.id,
        team: player.team,
        room: R.publicRoom(this.room),
        state: this.room.latestSnapshot || null
      });
      this.lobby();
      await this.save();
      return new Response(null, { status: 101, webSocket: client });
    } catch (error) {
      return fail(error);
    }
  }

  async webSocketMessage(socket, message) {
    await this.ready;
    const attachment = socket.deserializeAttachment();
    if (!this.room || !attachment || this.sockets.get(attachment.id) !== socket) {
      try { socket.close(4001, 'Connection replaced'); } catch {}
      return;
    }

    try {
      if (typeof message !== 'string' || message.length > R.MAX_SNAPSHOT_BYTES + 8192) {
        socket.close(1009, 'Message too large');
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
      if (rate.n > 100) {
        socket.close(1008, 'Too many messages');
        return;
      }

      if (message === 'ping') {
        this.send(socket, 'pong');
        return;
      }

      let data;
      try { data = JSON.parse(message); }
      catch { throw new R.RoomError(400, 'Invalid message.'); }
      if (!data || typeof data !== 'object' || Array.isArray(data))
        throw new R.RoomError(400, 'Invalid message.');

      let save = true;
      let broadcastRoom = true;

      if (data.type === 'intent') {
        const intent = R.setIntent(this.room, attachment.id, data, now);
        if (intent) {
          const host = this.hostSocket();
          if (!host) throw new R.RoomError(409, 'Host is reconnecting.');
          this.send(host, { type: 'intent', id: attachment.id, intent });
          this.send(socket, { type: 'intent-ack', seq: intent.seq });
        }
        save = false;
        broadcastRoom = false;
      } else if (data.type === 'snapshot') {
        const accepted = R.setHostSnapshot(this.room, attachment.id, data.state || data, now);
        if (accepted) {
          this.send(socket, {
            type: 'snapshot-ack',
            seq: this.room.snapshotSeq,
            turnTeam: this.room.turnTeam
          });
          this.broadcast({ type: 'snapshot', state: this.room.latestSnapshot }, attachment.id);
          if (now - this.lastSnapshotSave >= 1000) {
            this.lastSnapshotSave = now;
            this.ctx.waitUntil(this.save());
          }
        }
        save = false;
        broadcastRoom = false;
      } else if (data.type === 'event') {
        const event = R.relayHostEvent(this.room, attachment.id, data.event || {}, now);
        this.broadcast({ type: 'event', event }, attachment.id);
        save = false;
        broadcastRoom = false;
      } else if (data.type === 'ready') {
        R.setReady(this.room, attachment.id, data.ready);
      } else if (data.type === 'setup') {
        R.configureRoom(this.room, attachment.id, data);
      } else if (data.type === 'start') {
        R.startRoom(this.room, attachment.id, now);
      } else if (data.type === 'result') {
        R.finishRoom(this.room, attachment.id, data.result || data, now);
      } else if (data.type === 'rematch') {
        R.rematch(this.room, attachment.id, now);
      } else if (data.type === 'leave') {
        R.leaveRoom(this.room, attachment.id, now);
        this.sockets.delete(attachment.id);
        try { socket.close(1000, 'Left the room'); } catch {}
      } else {
        throw new R.RoomError(400, 'Unknown room command.');
      }

      if (save) await this.save();
      if (broadcastRoom) this.lobby();
    } catch (error) {
      this.send(socket, {
        type: 'error',
        message: error?.status ? error.message : 'The room could not be updated.'
      });
    }
  }

  async webSocketClose(socket, code = 1000, reason = 'Connection closed') {
    try { socket.close(code === 1005 ? 1000 : code, reason); } catch {}
    await this.ready;

    const attachment = socket.deserializeAttachment();
    if (!this.room || !attachment || this.sockets.get(attachment.id) !== socket) return;

    this.sockets.delete(attachment.id);
    this.rate.delete(attachment.id);
    R.disconnect(this.room, attachment.id, Date.now());
    this.lobby();
    await this.save();
  }

  async webSocketError(socket) {
    await this.webSocketClose(socket, 1011, 'Connection interrupted');
  }

  async alarm() {
    await this.ready;
    if (!this.room || this.room.expiresAt <= Date.now() || this.room.phase === 'closed') {
      for (const socket of this.sockets.values()) {
        try { socket.close(4000, 'Room expired'); } catch {}
      }
      this.sockets.clear();
      this.room = null;
      await this.ctx.storage.deleteAll();
    } else {
      await this.ctx.storage.setAlarm(this.room.expiresAt);
    }
  }
}
