const ARENA_TO_SERVER = Object.freeze({
  ring: 'WrestlingArena',
  courtyard: 'TempleCourtyard',
  rooftop: 'SichuanTeaHouse',
});
const SERVER_TO_ARENA = Object.freeze(Object.fromEntries(Object.entries(ARENA_TO_SERVER).map(([local, server]) => [server, local])));
const FIGHTER_TO_CHARACTER = Object.freeze({
  hero: 'Hero',
  stephen: 'Stephen',
  zachary: 'Zachary',
  mulan: 'Mulan',
  gaby: 'Gaby',
  sara: 'Sara',
  mum: 'Mum',
  dad: 'Dad',
});

export const localArenaToServer = (id) => ARENA_TO_SERVER[id] || 'WrestlingArena';
export const serverArenaToLocal = (id) => SERVER_TO_ARENA[id] || 'ring';
export const fighterIdToCharacter = (id) => FIGHTER_TO_CHARACTER[id] || 'Hero';

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);

function roomPlayer(room, id) {
  return room?.players?.find?.((player) => player.id === id) || null;
}

export function mountOnlineLobby(root, {
  client,
  getLocalState = () => ({}),
  onStartOnline = async () => {},
  onReturnLocal = () => {},
} = {}) {
  if (!root || !client) return { dispose() {} };

  const queryCode = (() => {
    try {
      const value = new URLSearchParams(globalThis.location?.search || '').get('room') || '';
      return /^\d{4}$/.test(value) ? value : '';
    } catch { return ''; }
  })();

  let open = Boolean(queryCode);
  let busy = false;
  let error = '';
  let name = '';
  let code = queryCode;
  let startedMatchId = null;
  const unsubs = [];

  const selectedCharacter = () => fighterIdToCharacter(getLocalState()?.fighterId);
  const selectedArena = () => localArenaToServer(getLocalState()?.arenaId);

  const maybeStart = async (room) => {
    if (!room || room.phase !== 'fight') return;
    const matchId = Number(room.matchId) || 0;
    if (startedMatchId === matchId) return;
    startedMatchId = matchId;
    try {
      await onStartOnline({
        client,
        room,
        localPlayerId: client.playerId,
        character: selectedCharacter(),
        arenaId: serverArenaToLocal(room.settings?.arena),
      });
      open = false;
      render();
    } catch (cause) {
      error = cause?.message || 'Could not start the online match.';
      render();
    }
  };

  const roomMarkup = (room) => {
    const me = roomPlayer(room, client.playerId);
    const connected = (room.players || []).filter((player) => player.connected);
    const canStart = client.isHost && connected.length >= 2 && connected.every((player) => player.ready);
    const players = (room.players || []).map((player) => `
      <div class="online-player ${player.connected ? 'connected' : 'offline'}">
        <span class="online-slot">P${player.id + 1}</span>
        <b>${escapeHtml(player.name)}</b>
        <small>${escapeHtml(player.character)} · ${player.connected ? (player.ready ? 'READY' : 'NOT READY') : 'CONNECTING'}</small>
        ${player.id === room.hostId ? '<em>HOST</em>' : ''}
      </div>`).join('');

    return `
      <div class="online-room-head">
        <div><span>ROOM CODE</span><strong>${escapeHtml(room.code)}</strong></div>
        <button data-online-action="copy" class="online-small">COPY INVITE</button>
      </div>
      <div class="online-player-grid">${players || '<p>Waiting for players…</p>'}</div>
      <div class="online-room-actions">
        ${!client.isHost ? `<button data-online-action="ready" class="online-primary">${me?.ready ? 'NOT READY' : 'READY UP'}</button>` : ''}
        ${client.isHost ? `<button data-online-action="start" class="online-primary" ${canStart ? '' : 'disabled'}>START ONLINE BRAWL</button>` : '<span class="online-wait">Host starts when everyone is ready.</span>'}
        <button data-online-action="leave" class="online-secondary">LEAVE ROOM</button>
      </div>`;
  };

  const render = () => {
    if (!open) {
      root.innerHTML = '<button class="online-launch" data-online-action="open"><span>联网</span><b>ONLINE PLAY</b><small>Create or join a 4-player room</small></button>';
      return;
    }
    const room = client.room;
    root.innerHTML = `
      <div class="online-backdrop">
        <section class="online-panel" aria-label="Danao online play">
          <div class="online-title"><span>联网乱斗</span><h2>ONLINE PLAY</h2><button data-online-action="local" aria-label="Back to local play">×</button></div>
          ${room ? roomMarkup(room) : `
            <label class="online-field"><span>PLAYER NAME</span><input data-online-field="name" maxlength="32" value="${escapeHtml(name)}" placeholder="${escapeHtml(selectedCharacter())}"></label>
            <button class="online-primary" data-online-action="create" ${busy ? 'disabled' : ''}>CREATE ROOM</button>
            <div class="online-divider"><span>OR</span></div>
            <label class="online-field"><span>ROOM CODE</span><input data-online-field="code" inputmode="numeric" maxlength="4" value="${escapeHtml(code)}" placeholder="0000"></label>
            <button class="online-secondary strong" data-online-action="join" ${busy ? 'disabled' : ''}>JOIN ROOM</button>
            <button class="online-text" data-online-action="reconnect">RECONNECT LAST ROOM</button>
          `}
          ${error ? `<p class="online-error">${escapeHtml(error)}</p>` : ''}
          <button class="online-local" data-online-action="local">LOCAL PLAY</button>
        </section>
      </div>`;
  };

  const localPlayerPayload = () => {
    const state = getLocalState() || {};
    const fallbackName = fighterIdToCharacter(state.fighterId);
    return {
      name: name.trim() || fallbackName,
      character: fighterIdToCharacter(state.fighterId),
      costume: 'Arcade',
    };
  };

  async function run(action) {
    if (busy) return;
    error = '';
    busy = true;
    render();
    try { await action(); }
    catch (cause) { error = cause?.message || 'Danao online is unavailable. Local play still works.'; }
    busy = false;
    render();
  }

  root.addEventListener('input', (event) => {
    const field = event.target?.dataset?.onlineField;
    if (field === 'name') name = event.target.value;
    if (field === 'code') code = String(event.target.value || '').replace(/\D/g, '').slice(0, 4);
  });

  root.addEventListener('click', (event) => {
    const button = event.target?.closest?.('[data-online-action]');
    if (!button) return;
    const action = button.dataset.onlineAction;
    if (action === 'open') { open = true; render(); return; }
    if (action === 'local') { open = false; error = ''; onReturnLocal(); render(); return; }
    if (action === 'create') {
      run(async () => { await client.createRoom(localPlayerPayload()); });
      return;
    }
    if (action === 'join') {
      run(async () => { await client.joinRoom({ ...localPlayerPayload(), code }); });
      return;
    }
    if (action === 'reconnect') {
      error = client.reconnectLast() ? '' : 'No reconnectable Danao room is stored in this tab.';
      render();
      return;
    }
    if (action === 'ready') {
      const me = roomPlayer(client.room, client.playerId);
      client.sendReady(!me?.ready);
      return;
    }
    if (action === 'start') {
      const state = getLocalState() || {};
      client.sendSetup({
        mode: 'FreeForAll',
        arena: localArenaToServer(state.arenaId),
        healthDamage: true,
        visibleBruising: true,
        arenaHazards: true,
        friendlyFire: false,
      });
      client.sendStart();
      return;
    }
    if (action === 'leave') {
      client.leave();
      startedMatchId = null;
      render();
      return;
    }
    if (action === 'copy') {
      globalThis.navigator?.clipboard?.writeText?.(client.inviteUrl).catch?.(() => {});
    }
  });

  unsubs.push(client.on('room', (room) => { render(); maybeStart(room); }));
  unsubs.push(client.on('error', (message) => { error = String(message || 'Online error.'); render(); }));
  unsubs.push(client.on('connected', () => render()));

  render();
  return {
    open() { open = true; render(); },
    close() { open = false; render(); },
    dispose() { for (const unsub of unsubs) unsub?.(); root.innerHTML = ''; },
  };
}
