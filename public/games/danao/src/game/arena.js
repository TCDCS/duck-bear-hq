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
    hazards: [{ type: 'sweeper', x: 0, y: 0.65, z: 0, radius: 4.7, speed: -0.65 }],
  }),
  Object.freeze({
    id: 'ring',
    name: 'Dragon Wrestling Ring',
    chineseName: '龙擂台',
    description: 'An over-the-top kung-fu wrestling ring built for ridiculous knockouts.',
    size: { x: 13.5, z: 13.5 },
    floorY: 0,
    spawns: fourSpawns(3.4),
    palette: { floor: '#d5d0bb', trim: '#9f1f2e', accent: '#e9b93d', sky: '#52627a' },
    hazards: [],
  }),
]);

export function getArena(id) {
  return ARENAS.find((arena) => arena.id === id) ?? ARENAS[0];
}
