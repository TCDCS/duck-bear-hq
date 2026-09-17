const fourSpawns = (r = 4.8, y = 1.15) => [
  { x: -r, y, z: -r },
  { x: r, y, z: -r },
  { x: -r, y, z: r },
  { x: r, y, z: r },
];

export const ARENAS = Object.freeze([
  Object.freeze({
    id: 'courtyard',
    name: 'Lantern Courtyard',
    chineseName: '灯笼院',
    description: 'Wide stone courtyard with drums, lanterns and a central gong.',
    size: { x: 17, z: 17 },
    floorY: 0,
    spawns: fourSpawns(4.7),
    palette: { floor: '#d8b06a', trim: '#8b2f2f', accent: '#f4ce46', sky: '#8ed2e6' },
    props: Object.freeze([
      { itemId: 'chair', x: -5.5, z: 4.8, yaw: 0.4 },
      { itemId: 'pan', x: 4.7, z: -4.4, yaw: -0.2 },
      { itemId: 'crate', x: 5.6, z: 4.7, yaw: 0.1 },
      { itemId: 'baguette', x: -3.7, z: -4.8, yaw: 0.5 },
    ]),
    hazards: [{ type: 'spinner', x: 0, y: 0.85, z: 0, radius: 3.3, speed: 0.9 }],
  }),
  Object.freeze({
    id: 'rooftop',
    name: 'Teahouse Rooftop',
    chineseName: '茶楼屋顶',
    description: 'A bright tiled roof with narrow edges and wobbling signboards.',
    size: { x: 14, z: 14 },
    floorY: 0,
    spawns: fourSpawns(3.8),
    palette: { floor: '#4b6f73', trim: '#bc382f', accent: '#f3d94c', sky: '#f0b86b' },
    props: Object.freeze([
      { itemId: 'chair', x: -4.6, z: 4.2, yaw: 0.2 },
      { itemId: 'cone', x: 4.8, z: -4.3, yaw: 0 },
      { itemId: 'mallet', x: -4.4, z: -4.4, yaw: -0.3 },
      { itemId: 'bin', x: 4.1, z: 4.4, yaw: 0.4 },
    ]),
    hazards: [{ type: 'sweeper', x: 0, y: 0.65, z: 0, radius: 4.7, speed: -0.65 }],
  }),
  Object.freeze({
    id: 'ring',
    name: 'Dragon Wrestling Hall',
    chineseName: '龙擂台',
    description: 'A packed wrestling hall with a raised ring, ringside clutter, folding chairs and breakable tables.',
    size: { x: 24, z: 19 },
    floorY: 0,
    ring: Object.freeze({ size: { x: 11.4, z: 8.8 }, topY: 1.05, apronHeight: 1.05 }),
    spawns: [
      { x: -3.2, y: 2.2, z: -2.3 },
      { x: 3.2, y: 2.2, z: -2.3 },
      { x: -3.2, y: 2.2, z: 2.3 },
      { x: 3.2, y: 2.2, z: 2.3 },
    ],
    props: Object.freeze([
      { itemId: 'chair', x: -7.7, z: -5.8, yaw: 0.4 },
      { itemId: 'chair', x: -7.1, z: 5.8, yaw: -0.5 },
      { itemId: 'chair', x: 7.8, z: -5.4, yaw: -0.4 },
      { itemId: 'chair', x: 7.2, z: 5.7, yaw: 0.5 },
      { itemId: 'table', x: -8.6, z: 0.2, yaw: Math.PI / 2 },
      { itemId: 'table', x: 8.6, z: -0.2, yaw: Math.PI / 2 },
      { itemId: 'crate', x: -9.6, z: -6.5, yaw: 0.2 },
      { itemId: 'crate', x: 9.7, z: 6.1, yaw: -0.2 },
      { itemId: 'bin', x: -9.2, z: 5.8, yaw: 0 },
      { itemId: 'cone', x: 9.4, z: -6.2, yaw: 0 },
      { itemId: 'pan', x: -2.4, z: 0.3, yaw: 0.3, onRing: true },
      { itemId: 'baguette', x: 2.7, z: -0.2, yaw: -0.2, onRing: true },
      { itemId: 'mallet', x: 0.2, z: 2.5, yaw: 0.6, onRing: true },
      { itemId: 'chair', x: 0.0, z: -2.8, yaw: 0.1, onRing: true },
    ]),
    palette: { floor: '#3c3134', trim: '#b4222f', accent: '#f2c94c', sky: '#1c1824' },
    hazards: [],
  }),
]);

export function getArena(id) {
  return ARENAS.find((arena) => arena.id === id) ?? ARENAS[0];
}
