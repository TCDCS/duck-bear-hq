export function createOnlineMatchBridge({
  client,
  runtime,
  onResult = () => {},
  onError = () => {},
} = {}) {
  if (!client || !runtime) throw new Error('Danao online bridge needs a room client and runtime.');

  let active = false;
  let localPlayerId = -1;
  let currentRoom = null;
  const unsubs = [];

  const role = (isHost = client.isHost) => ({
    enabled: active,
    isHost: Boolean(isHost),
    localSlot: localPlayerId,
    players: currentRoom?.players || [],
    matchId: currentRoom?.matchId || 0,
  });

  const applyRole = (isHost = client.isHost) => {
    if (!active) return;
    runtime.setNetworkAuthority?.(role(isHost));
  };

  unsubs.push(client.on('input', ({ id, frame } = {}) => {
    if (!active || !client.isHost || !Number.isInteger(id) || !frame) return;
    runtime.setRemoteInput?.(id, frame);
  }));

  unsubs.push(client.on('snapshot', (state) => {
    if (!active || client.isHost || !state) return;
    runtime.applyNetworkSnapshot?.(state, false);
  }));

  unsubs.push(client.on('host', ({ hostId, state } = {}) => {
    if (!active || !Number.isInteger(hostId)) return;
    if (currentRoom) currentRoom = { ...currentRoom, hostId };
    const becomingHost = hostId === localPlayerId;
    if (becomingHost && state) runtime.applyNetworkSnapshot?.(state, true);
    applyRole(becomingHost);
  }));

  unsubs.push(client.on('room', (room) => {
    if (!room) return;
    currentRoom = room;
    if (active) applyRole(room.hostId === localPlayerId);
  }));

  unsubs.push(client.on('result', (result) => {
    if (!active) return;
    onResult(result);
  }));

  unsubs.push(client.on('error', (message) => onError(message)));

  return {
    async start({ room, localPlayerId: slot = client.playerId, arenaId = 'ring', settings = {} } = {}) {
      if (!room || !Array.isArray(room.players)) throw new Error('Danao online room is not ready.');
      currentRoom = room;
      localPlayerId = Number.isInteger(slot) ? slot : client.playerId;
      active = true;
      await runtime.startMatch({
        arenaId,
        settings,
        online: {
          players: room.players.map((player) => ({ ...player })),
          localPlayerId,
          isHost: room.hostId === localPlayerId,
          matchId: room.matchId || 0,
        },
      });
      applyRole(room.hostId === localPlayerId);
      return true;
    },
    tick(at = globalThis.performance?.now?.() ?? Date.now()) {
      if (!active) return false;
      if (client.isHost) {
        const snapshot = runtime.captureNetworkSnapshot?.();
        return snapshot ? client.sendState(snapshot, at) : false;
      }
      const input = runtime.readNetworkInput?.();
      return input ? client.sendInput(input, at) : false;
    },
    reportResult(result = {}) {
      if (!active || !client.isHost) return false;
      const snapshot = runtime.captureNetworkSnapshot?.();
      const winner = snapshot?.fighters?.find?.((fighter) => fighter?.active && Number(fighter.hp) > 0) || null;
      return client.sendResult?.({
        winner: Number.isInteger(winner?.slot) ? winner.slot : -1,
        winnerTeam: -1,
        interrupted: false,
        reason: '',
      }) || false;
    },
    stop() {
      active = false;
      runtime.setNetworkAuthority?.({ enabled: false, isHost: false, localSlot: -1, players: [], matchId: 0 });
      runtime.stopMatch?.();
    },
    get active() { return active; },
    get room() { return currentRoom; },
    dispose() {
      active = false;
      for (const unsub of unsubs) unsub?.();
    },
  };
}
