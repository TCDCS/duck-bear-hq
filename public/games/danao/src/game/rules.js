export function applyHit(target, hit) {
  const currentHealth = Number.isFinite(target.health) ? target.health : 0;
  const damage = Math.max(0, Number(hit.damage) || 0);
  const knockback = Math.max(0, Number(hit.knockback) || 0);
  return {
    ...target,
    health: Math.max(0, currentHealth - damage),
    knockback,
  };
}

export function recordKnockout(state, scorerId) {
  if (!Object.prototype.hasOwnProperty.call(state.scores, scorerId)) return state;
  return {
    ...state,
    scores: {
      ...state.scores,
      [scorerId]: state.scores[scorerId] + 1,
    },
  };
}

export function shouldEndMatch(state) {
  const targetScore = state.targetScore ?? 3;
  return Object.values(state.scores).some((score) => score >= targetScore);
}
