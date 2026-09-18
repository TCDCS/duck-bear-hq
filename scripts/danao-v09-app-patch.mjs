const replaceRequired = (source, before, after, label) => {
  if (!source.includes(before)) throw new Error(`Danao v0.9 app patch marker missing: ${label}`);
  return source.replace(before, after);
};

export function patchDanaoV09App(source) {
  return replaceRequired(
    String(source),
    `  return {
    getState: () => structuredClone(state),`,
    `  return {
    beginMatch: () => {
      state = reduceUiState(state, { type: 'START_MATCH' });
      render();
    },
    getState: () => structuredClone(state),`,
    'external beginMatch',
  );
}
