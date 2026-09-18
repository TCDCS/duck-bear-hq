const FEEDBACK_TYPES = new Set([
  'light-hit',
  'heavy-hit',
  'pickup',
  'grab',
  'prop-throw',
  'fighter-throw',
  'prop-break',
  'fall-reset',
  'ko',
]);
const MAX_RELAY_FEEDBACK = 10;

function finiteCoordinate(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(-100, Math.min(100, number));
}

function normaliseFeedbackEvent(event, seq) {
  const type = typeof event?.type === 'string' ? event.type : '';
  if (!FEEDBACK_TYPES.has(type) || !Number.isInteger(seq) || seq <= 0) return null;
  return {
    seq,
    type,
    x: finiteCoordinate(event.x),
    y: finiteCoordinate(event.y),
    z: finiteCoordinate(event.z),
  };
}

export function createOnlineMatchBridge({
  client,
  runtime,
  onResult = () => {},
  onError = () => {},
  onFeedback = () => {},
} = {}) {
  if (!client || !runtime) throw new Error('Danao online bridge needs a room client and runtime.');

  let active = false;
  let localPlayerId = -1;
  let currentRoom = null;
  let simulationHost = false;
  let feedbackSequence = 0;
  let lastFeedbackSequence = 0;
  let relayFeedback = [];
  const unsubs = [];

  const resetFeedbackRelay = () => {
    feedbackSequence = 0;
    lastFeedbackSequence = 0;
    relayFeedback = [];
  };

  const consumeFeedback = (state, { adopt = false } = {}) => {
    const clean = (Array.isArray(state?.feedback) ? state.feedback : [])
      .slice(-MAX_RELAY_FEEDBACK)
      .map((event) => normaliseFeedbackEvent(event, Number(event?.seq)))
      .filter(Boolean)
      .sort((a, b) => a.seq - b.seq);

    for (const event of clean) {
      feedbackSequence = Math.max(feedbackSequence, event.seq);
      if (event.seq <= lastFeedbackSequence) continue;
      lastFeedbackSequence = event.seq;
      onFeedback(event);
    }
    if (adopt) relayFeedback = clean.slice(-MAX_RELAY_FEEDBACK);
  };

  const role = (isHost = client.isHost) => ({
    enabled: active,
    isHost: Boolean(isHost),
    localSlot: localPlayerId,
    players: currentRoom?.players || [],
    matchId: currentRoom?.matchId || 0,
  });

  const applyRole = (isHost = simulationHost) => {
    if (!active) return;
    simulationHost = Boolean(isHost);
    runtime.setNetworkAuthority?.(role(simulationHost));
  };

  unsubs.push(client.on('input', ({ id, frame } = {}) => {
    if (!active || !simulationHost || !Number.isInteger(id) || !frame) return;
    runtime.setRemoteInput?.(id, frame);
  }));

  unsubs.push(client.on('snapshot', (state) => {
    if (!active || simulationHost || !state) return;
    runtime.applyNetworkSnapshot?.(state, false);
    consumeFeedback(state);
  }));

  unsubs.push(client.on('host', ({ hostId, state } = {}) => {
    if (!active || !Number.isInteger(hostId)) return;
    if (currentRoom) currentRoom = { ...currentRoom, hostId };
    const becomingHost = hostId === localPlayerId;
    if (becomingHost && state) {
      runtime.applyNetworkSnapshot?.(state, true);
      consumeFeedback(state, { adopt: true });
    }
    applyRole(becomingHost);
  }));

  unsubs.push(client.on('room', (room) => {
    if (!room) return;
    const wasSimulationHost = simulationHost;
    currentRoom = room;
    if (!active) return;
    const roomSaysLocalHost = room.hostId === localPlayerId;
    if (!roomSaysLocalHost && wasSimulationHost) applyRole(false);
    else if (roomSaysLocalHost && wasSimulationHost) applyRole(true);
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
      resetFeedbackRelay();
      active = true;
      simulationHost = room.hostId === localPlayerId;
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
      applyRole(simulationHost);
      return true;
    },
    tick(at = globalThis.performance?.now?.() ?? Date.now()) {
      if (!active) return false;
      if (simulationHost) {
        const snapshot = runtime.captureNetworkSnapshot?.();
        const state = snapshot ? {
          ...snapshot,
          feedback: relayFeedback.map((event) => ({ ...event })),
        } : null;
        return state ? client.sendState(state, at) : false;
      }
      const input = runtime.readNetworkInput?.();
      return input ? client.sendInput(input, at) : false;
    },
    recordFeedback(event = {}) {
      if (!active || !simulationHost) return false;
      const next = normaliseFeedbackEvent(event, feedbackSequence + 1);
      if (!next) return false;
      feedbackSequence = next.seq;
      relayFeedback.push(next);
      if (relayFeedback.length > MAX_RELAY_FEEDBACK) {
        relayFeedback.splice(0, relayFeedback.length - MAX_RELAY_FEEDBACK);
      }
      return true;
    },
    reportResult(result = {}) {
      if (!active || !simulationHost) return false;
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
      simulationHost = false;
      resetFeedbackRelay();
      runtime.setNetworkAuthority?.({ enabled: false, isHost: false, localSlot: -1, players: [], matchId: 0 });
      runtime.stopMatch?.();
    },
    get active() { return active; },
    get room() { return currentRoom; },
    dispose() {
      active = false;
      simulationHost = false;
      resetFeedbackRelay();
      for (const unsub of unsubs) unsub?.();
    },
  };
}
