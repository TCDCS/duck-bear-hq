export function connectedPadIndices(gamepads = []) {
  const seen = new Set();
  const indexes = [];
  for (let arrayIndex = 0; arrayIndex < gamepads.length; arrayIndex++) {
    const pad = gamepads[arrayIndex];
    if (!pad || pad.connected === false) continue;
    const index = Number.isInteger(pad.index) && pad.index >= 0 ? pad.index : arrayIndex;
    if (seen.has(index)) continue;
    seen.add(index);
    indexes.push(index);
  }
  return indexes;
}

export function localControlPlan(gamepads = [], totalSlots = 4) {
  const slots = Math.max(1, Math.min(4, Math.trunc(Number(totalSlots) || 4)));
  const padIndexes = connectedPadIndices(gamepads);
  const plan = [];
  plan.push({ type: 'hybrid', index: padIndexes.length ? padIndexes[0] : null });
  for (let slot = 1; slot < slots; slot++) {
    const padIndex = padIndexes[slot];
    plan.push(padIndex === undefined ? { type: 'bot' } : { type: 'gamepad', index: padIndex });
  }
  return plan;
}
