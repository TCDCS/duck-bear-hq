export function createRoundState(ids = []) {
  const active = {};
  const kos = {};
  for (const id of ids) {
    active[id] = true;
    kos[id] = 0;
  }
  return { active, kos };
}

export function recordKo(state, scorerId, victimId, cause = 'ko') {
  if (!state?.active || !Object.prototype.hasOwnProperty.call(state.active, victimId) || state.active[victimId] === false) return state;
  const active = { ...state.active, [victimId]: false };
  const kos = { ...state.kos };
  if (cause === 'ko' && scorerId && scorerId !== victimId && Object.prototype.hasOwnProperty.call(kos, scorerId)) {
    kos[scorerId] += 1;
  }
  return { ...state, active, kos };
}

export function roundWinner(state) {
  const survivors = Object.entries(state?.active || {}).filter(([, active]) => active).map(([id]) => id);
  return survivors.length === 1 ? survivors[0] : null;
}

export function knockdownDuration(force = 0, health = 100) {
  const boundedForce = Math.max(0, Math.min(24, Number(force) || 0));
  const boundedHealth = Math.max(0, Math.min(100, Number(health) || 0));
  const healthFactor = (100 - boundedHealth) * 2.2;
  return Math.round(Math.max(220, Math.min(1100, 190 + boundedForce * 30 + healthFactor)));
}

export function impactDamage(speed = 0, mass = 1) {
  const v = Math.max(0, Math.min(50, Number(speed) || 0));
  const m = Math.max(0.2, Math.min(12, Number(mass) || 1));
  if (v < 4) return 0;
  return Math.min(30, Math.max(1, Math.round((v - 3.5) * Math.sqrt(m) * 0.72)));
}

export function hitStopDuration(force = 0, heavy = false) {
  const bounded = Math.max(0, Math.min(30, Number(force) || 0));
  if (bounded <= 0) return 0;
  const duration = 18 + bounded * 2.3 + (heavy ? 28 : 0);
  return Math.round(Math.max(24, Math.min(92, duration)));
}
