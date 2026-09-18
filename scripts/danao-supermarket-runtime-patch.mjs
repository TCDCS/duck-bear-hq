const FIXTURES = `for (const fixture of arena.fixtures || []) {
  const size = fixture.size || [1, 1, 1];
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(size[0] / 2, size[1] / 2, size[2] / 2)
      .setTranslation(Number(fixture.x) || 0, Number(fixture.y) || size[1] / 2, Number(fixture.z) || 0)
      .setFriction(0.96)
      .setRestitution(0.02),
  );
}
props = [];
spawnArenaProps(arena);`;

export function patchDanaoSupermarketRuntime(source) {
  const text = String(source);
  const pattern = /props\s*=\s*\[\];\s*spawnArenaProps\(arena\);/;
  if (!pattern.test(text)) throw new Error('Danao supermarket runtime patch marker missing: arena props');
  return text.replace(pattern, FIXTURES);
}
