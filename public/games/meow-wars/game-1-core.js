/* Meow Wars v0.3 bundle part. Load in numeric order after Phaser 4.2.1. */
// --- core/display.js ---
const __mw_core_display_js = (() => {
function preferredRenderResolution(devicePixelRatio) {
    if (!Number.isFinite(devicePixelRatio) || !devicePixelRatio || devicePixelRatio <= 0)
        return 1;
    return Math.min(2, Math.max(1, devicePixelRatio));
}
return { preferredRenderResolution };
})();

// --- core/actions.js ---
const __mw_core_actions_js = (() => {
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function validActor(value) {
    return typeof value === 'string' && value.length > 0 && value.length <= 64;
}
function finite(value) {
    return typeof value === 'number' && Number.isFinite(value);
}
function facing(value) {
    return value === -1 || value === 1;
}
function isMatchAction(value) {
    if (!isRecord(value) || !validActor(value.actorId) || typeof value.type !== 'string')
        return false;
    switch (value.type) {
        case 'move':
            return finite(value.x) && facing(value.facing);
        case 'aim':
            return finite(value.angleDeg) && value.angleDeg >= -180 && value.angleDeg <= 180 && facing(value.facing);
        case 'select-weapon':
            return typeof value.weaponId === 'string' && value.weaponId.length > 0 && value.weaponId.length <= 64;
        case 'fire':
            return typeof value.weaponId === 'string' && value.weaponId.length > 0 &&
                finite(value.angleDeg) && value.angleDeg >= -180 && value.angleDeg <= 180 &&
                finite(value.power) && value.power >= 0 && value.power <= 1 && facing(value.facing);
        case 'end-turn':
            return value.reason === 'fired' || value.reason === 'timeout' || value.reason === 'skip';
        default:
            return false;
    }
}
function cloneAction(action) {
    return { ...action };
}
function cloneEntry(entry) {
    return { seq: entry.seq, turn: entry.turn, action: cloneAction(entry.action) };
}
class ActionLog {
    constructor(entries = []) {
        this.entries = entries.map(cloneEntry);
        this.nextSeq = this.entries.length === 0 ? 1 : Math.max(...this.entries.map((entry) => entry.seq)) + 1;
    }
    append(turn, action) {
        if (!Number.isInteger(turn) || turn < 1 || !isMatchAction(action))
            throw new Error('Invalid match action');
        const entry = { seq: this.nextSeq, turn, action: cloneAction(action) };
        this.nextSeq += 1;
        this.entries.push(entry);
        return cloneEntry(entry);
    }
    export() {
        return this.entries.map(cloneEntry);
    }
    static from(value) {
        if (!Array.isArray(value))
            throw new Error('Invalid action log');
        const entries = [];
        let expectedSeq = 1;
        for (const item of value) {
            if (!isRecord(item) || item.seq !== expectedSeq || !Number.isInteger(item.turn) || item.turn < 1 || !isMatchAction(item.action)) {
                throw new Error('Invalid action log');
            }
            entries.push({ seq: item.seq, turn: item.turn, action: cloneAction(item.action) });
            expectedSeq += 1;
        }
        return new ActionLog(entries);
    }
}
return { isMatchAction, ActionLog };
})();

// --- core/ai.js ---
const __mw_core_ai_js = (() => {
function chooseWeapon(distance, clustered, roll) {
    let pool;
    if (distance < 170) {
        pool = clustered
            ? ['shotgun', 'exploding-mouse', 'roomba-ride']
            : ['shotgun', 'assault-rifle', 'exploding-mouse'];
    }
    else if (distance > 650) {
        pool = clustered
            ? ['bazooka', 'fish-launcher', 'hairball-mortar']
            : ['sniper', 'bazooka', 'fish-launcher'];
    }
    else {
        pool = clustered
            ? ['bazooka', 'fish-launcher', 'hairball-mortar']
            : ['assault-rifle', 'bazooka', 'fish-launcher'];
    }
    const index = Math.min(pool.length - 1, Math.floor(Math.max(0, Math.min(0.999999, roll)) * pool.length));
    return pool[index];
}
function chooseCpuShot(attacker, combatants, wind, random = Math.random) {
    const enemies = combatants.filter((candidate) => candidate.alive && candidate.team !== attacker.team);
    if (enemies.length === 0)
        throw new Error('No living enemy available');
    const target = enemies.reduce((best, candidate) => {
        const bestDistance = Math.hypot(best.x - attacker.x, best.y - attacker.y);
        const candidateDistance = Math.hypot(candidate.x - attacker.x, candidate.y - attacker.y);
        return candidateDistance < bestDistance ? candidate : best;
    });
    const dx = target.x - attacker.x;
    const dy = target.y - attacker.y;
    const distance = Math.hypot(dx, dy);
    const direction = dx < 0 ? -1 : 1;
    const clustered = enemies.some((candidate) => candidate.id !== target.id && Math.hypot(candidate.x - target.x, candidate.y - target.y) <= 135);
    const weaponId = chooseWeapon(distance, clustered, random());
    const heightBias = Math.max(-10, Math.min(10, -dy * 0.035));
    const windBias = Math.max(-7, Math.min(7, -wind * direction * 0.16));
    const inaccuracy = (random() - 0.5) * 8;
    const angleDeg = Math.max(18, Math.min(76, 43 + heightBias + windBias + inaccuracy));
    const power = Math.max(0.48, Math.min(1, 0.48 + distance / 1100 + (random() - 0.5) * 0.08));
    return { targetId: target.id, weaponId, angleDeg, power, direction };
}
return { chooseCpuShot };
})();

// --- core/arenas.js ---
const __mw_core_arenas_js = (() => {
const ARENAS = [
    {
        id: 'garden-siege',
        name: 'Garden Siege',
        tagline: 'Flowerbeds, fences and absolutely no mercy.',
        seed: 2718,
        windMultiplier: 0.8,
        terrainProfile: {
            baseRatio: 0.69,
            waveAAmplitudeRatio: 0.052,
            waveAFrequency: 0.014,
            waveBAmplitudeRatio: 0.022,
            waveBFrequency: 0.036,
            moundAmplitudeRatio: 0.055,
            minSurfaceRatio: 0.5,
            maxSurfaceRatio: 0.84
        },
        spawnFractions: [0.10, 0.23, 0.36, 0.64, 0.78, 0.91],
        palette: {
            skyTop: '#79d7ff', skyBottom: '#c8f3ff', sun: '#fff0a0',
            terrainTop: '#79533b', terrainDeep: '#553629', grass: '#69bf4b', accent: '#ff77a8'
        }
    },
    {
        id: 'rooftop-rumble',
        name: 'Rooftop Rumble',
        tagline: 'Chimneys, neon and nine lives over the edge.',
        seed: 31415,
        windMultiplier: 1.35,
        terrainProfile: {
            baseRatio: 0.64,
            waveAAmplitudeRatio: 0.032,
            waveAFrequency: 0.009,
            waveBAmplitudeRatio: 0.018,
            waveBFrequency: 0.022,
            moundAmplitudeRatio: -0.015,
            minSurfaceRatio: 0.48,
            maxSurfaceRatio: 0.77
        },
        spawnFractions: [0.08, 0.25, 0.41, 0.60, 0.76, 0.93],
        palette: {
            skyTop: '#201b48', skyBottom: '#6a3f79', sun: '#ffe1a3',
            terrainTop: '#5b5c6d', terrainDeep: '#373746', grass: '#8c90a0', accent: '#4ef0d0'
        }
    },
    {
        id: 'junkyard-jamboree',
        name: 'Junkyard Jamboree',
        tagline: 'Rust, scrap and a suspicious number of Roombas.',
        seed: 9001,
        windMultiplier: 1.05,
        terrainProfile: {
            baseRatio: 0.65,
            waveAAmplitudeRatio: 0.095,
            waveAFrequency: 0.029,
            waveBAmplitudeRatio: 0.046,
            waveBFrequency: 0.063,
            moundAmplitudeRatio: 0.01,
            minSurfaceRatio: 0.42,
            maxSurfaceRatio: 0.83
        },
        spawnFractions: [0.07, 0.20, 0.39, 0.61, 0.80, 0.94],
        palette: {
            skyTop: '#f3a95d', skyBottom: '#ffd18a', sun: '#fff1b8',
            terrainTop: '#735a49', terrainDeep: '#49392f', grass: '#9a8d55', accent: '#ffcf38'
        }
    }
];
const BY_ID = new Map(ARENAS.map((arena) => [arena.id, arena]));
function getArena(id) {
    const arena = BY_ID.get(id);
    if (!arena)
        throw new Error(`Unknown arena: ${id}`);
    return arena;
}
return { ARENAS, getArena };
})();

// --- core/decor.js ---
const __mw_core_decor_js = (() => {
function item(kind, x, y, scale, layer, variant = 0) {
    return { kind, x, y, scale, layer, variant };
}
const GARDEN = [
    item('cloud', 80, 90, 0.9, 'far'), item('cloud', 320, 150, 0.7, 'far', 1), item('cloud', 620, 92, 1.1, 'far', 2),
    item('cloud', 930, 155, 0.75, 'far', 3), item('cloud', 1160, 95, 0.9, 'far', 4),
    item('house', 70, 325, 1.0, 'far'), item('house', 230, 345, 0.82, 'far', 1), item('house', 420, 315, 1.08, 'far', 2),
    item('house', 790, 330, 0.94, 'far', 3), item('house', 1045, 315, 1.08, 'far', 4),
    item('tree', 135, 360, 1.1, 'mid'), item('tree', 520, 365, 0.9, 'mid', 1), item('tree', 1120, 350, 1.15, 'mid', 2),
    item('fence', 50, 470, 1.0, 'mid'), item('fence', 300, 474, 1.0, 'mid', 1), item('fence', 560, 470, 1.0, 'mid', 2),
    item('fence', 820, 474, 1.0, 'mid', 3), item('fence', 1080, 470, 1.0, 'mid', 4),
    item('shrub', 90, 500, 0.8, 'near'), item('shrub', 355, 505, 1.0, 'near', 1), item('shrub', 740, 505, 0.9, 'near', 2), item('shrub', 1110, 500, 1.0, 'near', 3),
    item('flower', 175, 515, 0.8, 'near'), item('flower', 460, 520, 0.9, 'near', 1), item('flower', 900, 516, 0.85, 'near', 2),
    item('birdhouse', 40, 430, 0.75, 'near'), item('watering-can', 1210, 520, 0.8, 'near')
];
const ROOFTOP = [
    item('cloud', 110, 95, 0.75, 'far'), item('cloud', 520, 115, 0.9, 'far', 1), item('cloud', 1010, 90, 0.7, 'far', 2),
    item('building', 40, 365, 1.0, 'far'), item('building', 150, 340, 0.9, 'far', 1), item('building', 275, 375, 1.1, 'far', 2),
    item('building', 410, 330, 0.95, 'far', 3), item('building', 560, 360, 1.05, 'far', 4), item('building', 720, 325, 0.9, 'far', 5),
    item('building', 870, 355, 1.05, 'far', 6), item('building', 1030, 320, 0.95, 'far', 7), item('building', 1180, 350, 1.08, 'far', 8),
    item('water-tower', 650, 250, 1.0, 'mid'), item('chimney', 180, 425, 0.9, 'mid'), item('chimney', 980, 415, 1.0, 'mid', 1),
    item('vent', 360, 450, 0.8, 'mid'), item('vent', 1080, 455, 0.95, 'mid', 1), item('aerial', 1150, 355, 0.8, 'mid'),
    item('string-lights', 520, 470, 1.0, 'mid'), item('string-lights', 810, 455, 0.9, 'mid', 1),
    item('plant-pot', 90, 500, 0.85, 'near'), item('plant-pot', 300, 510, 0.7, 'near', 1), item('plant-pot', 760, 505, 0.9, 'near', 2),
    item('plant-pot', 1200, 505, 0.8, 'near', 3), item('crate', 430, 520, 0.85, 'near'), item('pipe', 890, 510, 0.9, 'near'), item('sign', 1160, 480, 0.8, 'near')
];
const JUNKYARD = [
    item('cloud', 100, 105, 0.8, 'far'), item('cloud', 520, 95, 0.7, 'far', 1), item('cloud', 990, 120, 0.95, 'far', 2),
    item('crane', 180, 325, 1.0, 'far'), item('crane', 1040, 335, 0.9, 'far', 1), item('building', 430, 360, 0.9, 'far'), item('building', 790, 350, 1.0, 'far', 1),
    item('scrap-pile', 95, 460, 0.95, 'mid'), item('scrap-pile', 330, 450, 1.1, 'mid', 1), item('scrap-pile', 610, 470, 0.9, 'mid', 2),
    item('scrap-pile', 880, 455, 1.05, 'mid', 3), item('scrap-pile', 1160, 465, 0.92, 'mid', 4),
    item('car-shell', 210, 485, 0.8, 'mid'), item('car-shell', 750, 490, 0.9, 'mid', 1), item('car-shell', 1080, 485, 0.78, 'mid', 2),
    item('tyre', 70, 520, 0.8, 'near'), item('tyre', 150, 525, 0.65, 'near', 1), item('tyre', 390, 515, 0.9, 'near', 2), item('tyre', 930, 520, 0.75, 'near', 3),
    item('barrel', 275, 510, 0.85, 'near'), item('barrel', 560, 520, 0.8, 'near', 1), item('barrel', 1210, 510, 0.9, 'near', 2),
    item('pipe', 485, 505, 0.9, 'near'), item('pipe', 1010, 510, 0.8, 'near', 1), item('crate', 690, 520, 0.85, 'near'),
    item('sign', 25, 430, 0.8, 'near'), item('sign', 1170, 425, 0.9, 'near', 1)
];
function buildArenaDecor(arenaId) {
    if (arenaId === 'garden-siege')
        return GARDEN.map((entry) => ({ ...entry }));
    if (arenaId === 'rooftop-rumble')
        return ROOFTOP.map((entry) => ({ ...entry }));
    return JUNKYARD.map((entry) => ({ ...entry }));
}
return { buildArenaDecor };
})();

// --- core/decorStyles.js ---
const __mw_core_decorStyles_js = (() => {
const STYLES = {
    cloud: { primary: '#ffffff', secondary: '#d8f3ff', detail: '#9bd7ed' },
    house: { primary: '#ffd28a', secondary: '#cf6d5d', detail: '#6fa4c7' },
    tree: { primary: '#4da64b', secondary: '#78c85b', detail: '#8b5c35' },
    fence: { primary: '#f6edd5', secondary: '#d8caa9', detail: '#b9aa89' },
    flower: { primary: '#ff6684', secondary: '#ffd657', detail: '#328946' },
    shrub: { primary: '#3f9f49', secondary: '#6bc554', detail: '#27753b' },
    'birdhouse': { primary: '#d66f4d', secondary: '#ffd19a', detail: '#72452d' },
    'watering-can': { primary: '#59b5cf', secondary: '#a8e8f1', detail: '#2e6f89' },
    building: { primary: '#7083a7', secondary: '#53657f', detail: '#f3c55b' },
    'water-tower': { primary: '#8e9aaa', secondary: '#5f6b7a', detail: '#263a56' },
    chimney: { primary: '#a85b48', secondary: '#743d35', detail: '#d98c65' },
    vent: { primary: '#8393a2', secondary: '#556575', detail: '#bfcbd4' },
    aerial: { primary: '#4c5669', secondary: '#6e7d92', detail: '#d1dae4' },
    'plant-pot': { primary: '#c96b43', secondary: '#e69968', detail: '#55a74d' },
    'string-lights': { primary: '#584b42', secondary: '#ffd75a', detail: '#ff8a64' },
    'scrap-pile': { primary: '#8b684d', secondary: '#b2784b', detail: '#587d83' },
    tyre: { primary: '#343943', secondary: '#565f6d', detail: '#171b22' },
    barrel: { primary: '#507a89', secondary: '#d9a243', detail: '#2f4955' },
    'car-shell': { primary: '#cf6650', secondary: '#e9a24f', detail: '#3c4d58' },
    crane: { primary: '#d9a42e', secondary: '#866f3a', detail: '#393f47' },
    sign: { primary: '#bf7b43', secondary: '#8b552f', detail: '#f3d5a8' },
    pipe: { primary: '#6f7b7f', secondary: '#4e5c61', detail: '#aeb8ba' },
    crate: { primary: '#9b633b', secondary: '#c8874d', detail: '#5f3e2a' }
};
function getDecorStyle(kind) {
    const style = STYLES[kind];
    if (!style)
        throw new Error(`Unknown decor style: ${kind}`);
    return style;
}
return { getDecorStyle };
})();

// --- core/ballistics.js ---
const __mw_core_ballistics_js = (() => {
function stepProjectile(state, dtSeconds, gravity, windAcceleration, windFactor = 1) {
    const ax = windAcceleration * windFactor;
    const nextVx = state.vx + ax * dtSeconds;
    const nextVy = state.vy + gravity * dtSeconds;
    return {
        x: state.x + ((state.vx + nextVx) * 0.5) * dtSeconds,
        y: state.y + ((state.vy + nextVy) * 0.5) * dtSeconds,
        vx: nextVx,
        vy: nextVy
    };
}
function radialDamage(maxDamage, radius, distance) {
    if (radius <= 0 || distance >= radius)
        return distance <= 0 ? maxDamage : 0;
    const fraction = 1 - Math.max(0, distance) / radius;
    return Math.max(0, Math.round(maxDamage * fraction));
}
return { stepProjectile, radialDamage };
})();

