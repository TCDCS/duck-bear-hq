/* Meow Wars v0.3 systems bundle. */
// --- core/terrain.js ---
const __mw_core_terrain_js = (() => {
const DEFAULT_TERRAIN_PROFILE = {
    baseRatio: 0.66,
    waveAAmplitudeRatio: 0.075,
    waveAFrequency: 0.018,
    waveBAmplitudeRatio: 0.035,
    waveBFrequency: 0.043,
    moundAmplitudeRatio: 0.045,
    minSurfaceRatio: 0.46,
    maxSurfaceRatio: 0.82
};
function mulberry32(seed) {
    let value = seed >>> 0;
    return () => {
        value += 0x6d2b79f5;
        let t = value;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function generateTerrain(worldWidth, worldHeight, seed = 1, cellSize = 2, profile = DEFAULT_TERRAIN_PROFILE) {
    const cols = Math.ceil(worldWidth / cellSize);
    const rows = Math.ceil(worldHeight / cellSize);
    const data = new Uint8Array(cols * rows);
    const random = mulberry32(seed);
    const phaseA = random() * Math.PI * 2;
    const phaseB = random() * Math.PI * 2;
    const base = worldHeight * profile.baseRatio;
    for (let cx = 0; cx < cols; cx += 1) {
        const wx = cx * cellSize;
        const waveA = Math.sin(wx * profile.waveAFrequency + phaseA) * worldHeight * profile.waveAAmplitudeRatio;
        const waveB = Math.sin(wx * profile.waveBFrequency + phaseB) * worldHeight * profile.waveBAmplitudeRatio;
        const mound = Math.sin((wx / worldWidth) * Math.PI) * worldHeight * profile.moundAmplitudeRatio;
        const surface = Math.max(worldHeight * profile.minSurfaceRatio, Math.min(worldHeight * profile.maxSurfaceRatio, base + waveA + waveB - mound));
        const startRow = Math.max(0, Math.floor(surface / cellSize));
        for (let cy = startRow; cy < rows; cy += 1) {
            data[cy * cols + cx] = 1;
        }
    }
    return { worldWidth, worldHeight, cellSize, cols, rows, data };
}
function cellIndex(terrain, cx, cy) {
    return cy * terrain.cols + cx;
}
function isSolidWorld(terrain, x, y) {
    if (x < 0 || x >= terrain.worldWidth || y < 0)
        return false;
    if (y >= terrain.worldHeight)
        return true;
    const cx = Math.floor(x / terrain.cellSize);
    const cy = Math.floor(y / terrain.cellSize);
    if (cx < 0 || cx >= terrain.cols || cy < 0 || cy >= terrain.rows)
        return false;
    return terrain.data[cellIndex(terrain, cx, cy)] === 1;
}
function surfaceY(terrain, x) {
    const clampedX = Math.max(0, Math.min(terrain.worldWidth - 1, x));
    const cx = Math.floor(clampedX / terrain.cellSize);
    for (let cy = 0; cy < terrain.rows; cy += 1) {
        if (terrain.data[cellIndex(terrain, cx, cy)] === 1)
            return cy * terrain.cellSize;
    }
    return terrain.worldHeight;
}
function carveCircle(terrain, x, y, radius) {
    const minCx = Math.max(0, Math.floor((x - radius) / terrain.cellSize));
    const maxCx = Math.min(terrain.cols - 1, Math.ceil((x + radius) / terrain.cellSize));
    const minCy = Math.max(0, Math.floor((y - radius) / terrain.cellSize));
    const maxCy = Math.min(terrain.rows - 1, Math.ceil((y + radius) / terrain.cellSize));
    const radiusSq = radius * radius;
    let removed = 0;
    for (let cy = minCy; cy <= maxCy; cy += 1) {
        for (let cx = minCx; cx <= maxCx; cx += 1) {
            const wx = (cx + 0.5) * terrain.cellSize;
            const wy = (cy + 0.5) * terrain.cellSize;
            const dx = wx - x;
            const dy = wy - y;
            if (dx * dx + dy * dy <= radiusSq) {
                const index = cellIndex(terrain, cx, cy);
                if (terrain.data[index] === 1) {
                    terrain.data[index] = 0;
                    removed += 1;
                }
            }
        }
    }
    return removed;
}
return { DEFAULT_TERRAIN_PROFILE, generateTerrain, isSolidWorld, surfaceY, carveCircle };
})();

// --- core/roster.js ---
const __mw_core_roster_js = (() => {
const CAT_ROSTER = [
    { id: 'marmalade', name: 'Marmalade', breed: 'Orange Tabby', personality: 'reckless ginger menace', coat: '#e98d32', secondary: '#ffd09a', eyes: '#78d65b', pattern: 'tabby', bodyStyle: 'standard', accessory: 'headband' },
    { id: 'socks', name: 'Socks', breed: 'Tuxedo', personality: 'quiet tactical gremlin', coat: '#313946', secondary: '#f6f3ec', eyes: '#73d5e7', pattern: 'socks', bodyStyle: 'standard', accessory: 'bow' },
    { id: 'biscuit', name: 'Biscuit', breed: 'British Shorthair', personality: 'cheerful demolition expert', coat: '#c79b66', secondary: '#f1d7ad', eyes: '#91c957', pattern: 'solid', bodyStyle: 'chunky', accessory: 'collar' },
    { id: 'pepper', name: 'Pepper', breed: 'Black Cat', personality: 'tiny furious commander', coat: '#26262b', secondary: '#f3f0e9', eyes: '#f3ca52', pattern: 'tuxedo', bodyStyle: 'slender', accessory: 'scarf' },
    { id: 'mochi', name: 'Mochi', breed: 'Siamese', personality: 'soft-looking sniper', coat: '#efe8db', secondary: '#8b756d', eyes: '#6abbd1', pattern: 'point', bodyStyle: 'slender', accessory: 'bandana' },
    { id: 'pickle', name: 'Pickle', breed: 'Brown Tabby', personality: 'chaotic scrapyard engineer', coat: '#8f9c67', secondary: '#d9d6a9', eyes: '#e6c94f', pattern: 'tabby', bodyStyle: 'standard', accessory: 'goggles' },
    { id: 'pixel', name: 'Pixel', breed: 'Fantasy Shorthair', personality: 'neon rooftop troublemaker', coat: '#695ca8', secondary: '#d5c8ff', eyes: '#55f0ca', pattern: 'solid', bodyStyle: 'slender', accessory: 'goggles' },
    { id: 'beans', name: 'Beans', breed: 'Calico', personality: 'calico heavy weapons cat', coat: '#f1e4ce', secondary: '#ce6f3a', eyes: '#6fc677', pattern: 'calico', bodyStyle: 'standard', accessory: 'collar' },
    { id: 'cloud', name: 'Cloud', breed: 'Persian', personality: 'fluffy artillery cloud', coat: '#f4efe4', secondary: '#d8c6b7', eyes: '#73b8df', pattern: 'whiteface', bodyStyle: 'fluffy', accessory: 'bow' },
    { id: 'bramble', name: 'Bramble', breed: 'Maine Coon', personality: 'large cat with larger opinions', coat: '#77675d', secondary: '#c8b6a3', eyes: '#b4d56a', pattern: 'tabby', bodyStyle: 'big', accessory: 'bandana' },
    { id: 'mango', name: 'Mango', breed: 'Bengal', personality: 'spotted speed addict', coat: '#d79845', secondary: '#5b3b2c', eyes: '#85cf66', pattern: 'spotted', bodyStyle: 'slender', accessory: 'headband' },
    { id: 'dumpling', name: 'Dumpling', breed: 'Scottish Fold', personality: 'round face precision bomber', coat: '#cabaa9', secondary: '#f3e5d5', eyes: '#d79c4e', pattern: 'whiteface', bodyStyle: 'chunky', accessory: 'collar' },
    { id: 'noodle', name: 'Noodle', breed: 'Sphynx', personality: 'hairless laser enthusiast', coat: '#d9988d', secondary: '#f1b6a9', eyes: '#55cfd1', pattern: 'solid', bodyStyle: 'slender', accessory: 'goggles' },
    { id: 'snowball', name: 'Snowball', breed: 'White Shorthair', personality: 'angelic face suspicious tactics', coat: '#f7f7f1', secondary: '#dfe9f2', eyes: '#70b8ff', pattern: 'solid', bodyStyle: 'standard', accessory: 'collar' },
    { id: 'truffle', name: 'Truffle', breed: 'Tortoiseshell', personality: 'mottled chaos specialist', coat: '#4b3834', secondary: '#d78443', eyes: '#d4d95d', pattern: 'tortoiseshell', bodyStyle: 'standard', accessory: 'scarf' },
    { id: 'tank', name: 'Tank', breed: 'Grey Shorthair', personality: 'built like a furry bunker', coat: '#777d89', secondary: '#b8bdc6', eyes: '#d9b955', pattern: 'tabby', bodyStyle: 'chunky', accessory: 'bandana' }
];
const SQUADS = [
    { id: 'alley-aces', name: 'Alley Aces', motto: 'Fast paws. Bad decisions.', memberIds: ['marmalade', 'socks', 'biscuit'] },
    { id: 'night-shift', name: 'Night Shift', motto: 'The bins are ours after dark.', memberIds: ['pepper', 'mochi', 'pixel'] },
    { id: 'scrap-cats', name: 'Scrap Cats', motto: 'If it rolls, arm it.', memberIds: ['pickle', 'beans', 'tank'] },
    { id: 'velvet-claws', name: 'Velvet Claws', motto: 'Polite until the airstrike.', memberIds: ['cloud', 'snowball', 'dumpling'] },
    { id: 'big-paws', name: 'Big Paws', motto: 'More cat. More crater.', memberIds: ['bramble', 'mango', 'truffle'] },
    { id: 'odd-squad', name: 'Odd Squad', motto: 'No fur? No fear.', memberIds: ['noodle', 'pixel', 'beans'] }
];
const CAT_BY_ID = new Map(CAT_ROSTER.map((cat) => [cat.id, cat]));
const SQUAD_BY_ID = new Map(SQUADS.map((squad) => [squad.id, squad]));
function getCatPreset(id) {
    const cat = CAT_BY_ID.get(id);
    if (!cat)
        throw new Error(`Unknown cat preset: ${id}`);
    return cat;
}
function getSquad(id) {
    const squad = SQUAD_BY_ID.get(id);
    if (!squad)
        throw new Error(`Unknown squad: ${id}`);
    return squad;
}
function getSquadMenuCards(squadId) {
    const squad = getSquad(squadId);
    return squad.memberIds.map((id) => {
        const cat = getCatPreset(id);
        return { id: cat.id, name: cat.name, breed: cat.breed, personality: cat.personality };
    });
}
return { CAT_ROSTER, SQUADS, getCatPreset, getSquad, getSquadMenuCards };
})();

// --- core/turns.js ---
const __mw_core_turns_js = (() => {
class TurnManager {
    constructor(order) {
        this.index = 0;
        if (order.length === 0)
            throw new Error('Turn order cannot be empty');
        this.order = [...order];
    }
    get current() {
        return this.order[this.index];
    }
    resetTo(id) {
        const index = this.order.indexOf(id);
        if (index < 0)
            throw new Error(`Unknown combatant: ${id}`);
        this.index = index;
    }
    advance(isAlive) {
        for (let checked = 0; checked < this.order.length; checked += 1) {
            this.index = (this.index + 1) % this.order.length;
            const id = this.order[this.index];
            if (isAlive(id))
                return id;
        }
        return null;
    }
}
return { TurnManager };
})();

