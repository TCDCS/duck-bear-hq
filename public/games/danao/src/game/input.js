export const neutralInput = () => ({
  moveX: 0,
  moveZ: 0,
  jump: false,
  light: false,
  heavy: false,
  dodge: false,
  grab: false,
});

export function createInputEdges(previous = neutralInput(), current = neutralInput()) {
  return {
    moveX: Number(current.moveX) || 0,
    moveZ: Number(current.moveZ) || 0,
    jumpPressed: Boolean(current.jump && !previous.jump),
    lightPressed: Boolean(current.light && !previous.light),
    heavyPressed: Boolean(current.heavy && !previous.heavy),
    dodgePressed: Boolean(current.dodge && !previous.dodge),
    grabPressed: Boolean(current.grab && !previous.grab),
  };
}
