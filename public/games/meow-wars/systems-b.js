/* Meow Wars v0.3 systems bundle. */
// --- core/weapons.js ---
const __mw_core_weapons_js = (() => {
const WEAPONS = [
    { id: 'pistol', name: 'Pistol', shortName: 'Pistol', family: 'conventional', behaviour: 'hitscan', damage: 24, blastRadius: 0, ammo: Infinity, projectileSpeed: 0, windFactor: 0, description: 'Reliable single shot.' },
    { id: 'shotgun', name: 'Shotgun', shortName: 'Shotgun', family: 'conventional', behaviour: 'spread', damage: 11, blastRadius: 0, ammo: 5, projectileSpeed: 0, windFactor: 0, pellets: 6, description: 'Six-pellet close-range blast.' },
    { id: 'assault-rifle', name: 'Assault Rifle', shortName: 'Rifle', family: 'conventional', behaviour: 'spread', damage: 9, blastRadius: 0, ammo: 6, projectileSpeed: 0, windFactor: 0, pellets: 3, description: 'Three-round burst with light spread.' },
    { id: 'sniper', name: 'Sniper Rifle', shortName: 'Sniper', family: 'conventional', behaviour: 'hitscan', damage: 58, blastRadius: 0, ammo: 2, projectileSpeed: 0, windFactor: 0, description: 'High damage, tiny margin for error.' },
    { id: 'bazooka', name: 'Bazooka', shortName: 'Bazooka', family: 'conventional', behaviour: 'projectile', damage: 62, blastRadius: 54, ammo: Infinity, projectileSpeed: 440, windFactor: 0.9, description: 'Classic wind-affected rocket.' },
    { id: 'grenade', name: 'Grenade', shortName: 'Grenade', family: 'conventional', behaviour: 'lobbed', damage: 66, blastRadius: 58, ammo: 4, projectileSpeed: 380, windFactor: 0.25, fuseMs: 2800, description: 'Bouncy timed explosive.' },
    { id: 'mine', name: 'Mine', shortName: 'Mine', family: 'conventional', behaviour: 'deploy', damage: 72, blastRadius: 62, ammo: 2, projectileSpeed: 0, windFactor: 0, description: 'Arms on the ground and detonates near enemies.' },
    { id: 'dynamite', name: 'Dynamite', shortName: 'Dynamite', family: 'conventional', behaviour: 'deploy', damage: 90, blastRadius: 72, ammo: 2, projectileSpeed: 0, windFactor: 0, fuseMs: 3000, craterScale: 1.2, description: 'Short fuse, huge crater.' },
    { id: 'airstrike', name: 'Airstrike', shortName: 'Airstrike', family: 'conventional', behaviour: 'airstrike', damage: 34, blastRadius: 38, ammo: 1, projectileSpeed: 0, windFactor: 0, description: 'Five bombs across the marked area.' },
    { id: 'fish-launcher', name: 'Fish Launcher', shortName: 'Fish', family: 'cat', behaviour: 'projectile', damage: 76, blastRadius: 66, ammo: 3, projectileSpeed: 400, windFactor: 0.7, craterScale: 1.15, description: 'Launches a massive explosive tuna.' },
    { id: 'yarn-bomb', name: 'Yarn Bomb', shortName: 'Yarn', family: 'cat', behaviour: 'lobbed', damage: 52, blastRadius: 50, ammo: 3, projectileSpeed: 360, windFactor: 0.2, fuseMs: 2400, description: 'Bounces, tangles, then bursts.' },
    { id: 'hairball-mortar', name: 'Hairball Mortar', shortName: 'Hairball', family: 'cat', behaviour: 'lobbed', damage: 70, blastRadius: 60, ammo: 3, projectileSpeed: 330, windFactor: 0.35, fuseMs: 2200, description: 'A disgusting high-arc mortar shell.' },
    { id: 'catnip-grenade', name: 'Catnip Grenade', shortName: 'Catnip', family: 'cat', behaviour: 'lobbed', damage: 44, blastRadius: 56, ammo: 2, projectileSpeed: 370, windFactor: 0.25, fuseMs: 2300, description: 'Explodes in a suspicious green cloud.' },
    { id: 'exploding-mouse', name: 'Exploding Mouse', shortName: 'Mouse', family: 'cat', behaviour: 'ground-runner', damage: 68, blastRadius: 56, ammo: 2, projectileSpeed: 150, windFactor: 0, description: 'Scampers across the ground looking for trouble.' },
    { id: 'roomba-ride', name: 'Roomba Ride', shortName: 'Roomba', family: 'cat', behaviour: 'ground-runner', damage: 82, blastRadius: 68, ammo: 1, projectileSpeed: 210, windFactor: 0, craterScale: 1.1, description: 'Weaponised household cleaning.' },
    { id: 'laser-pointer', name: 'Laser Pointer Strike', shortName: 'Laser', family: 'cat', behaviour: 'laser', damage: 64, blastRadius: 42, ammo: 2, projectileSpeed: 0, windFactor: 0, description: 'Mark a point and let the red dot do the rest.' }
];
const WEAPON_BY_ID = new Map(WEAPONS.map((weapon) => [weapon.id, weapon]));
function getWeapon(id) {
    const weapon = WEAPON_BY_ID.get(id);
    if (!weapon)
        throw new Error(`Unknown weapon: ${id}`);
    return weapon;
}
return { WEAPONS, getWeapon };
})();

// --- core/weaponVisuals.js ---
const __mw_core_weaponVisuals_js = (() => {
const WEAPON_VISUALS = [
    { weaponId: 'pistol', icon: 'handgun', primary: '#bac8dc', accent: '#704628', hudLabel: 'Pistol' },
    { weaponId: 'shotgun', icon: 'shotgun', primary: '#87552f', accent: '#c7d1dd', hudLabel: 'Shotgun' },
    { weaponId: 'assault-rifle', icon: 'rifle', primary: '#3d4857', accent: '#d18a48', hudLabel: 'Rifle' },
    { weaponId: 'sniper', icon: 'sniper', primary: '#39475b', accent: '#7dc0e6', hudLabel: 'Sniper' },
    { weaponId: 'bazooka', icon: 'launcher', primary: '#72a943', accent: '#d4de9a', hudLabel: 'Bazooka' },
    { weaponId: 'grenade', icon: 'grenade', primary: '#68a542', accent: '#d7dfd1', hudLabel: 'Grenade' },
    { weaponId: 'mine', icon: 'mine', primary: '#aab0be', accent: '#e15454', hudLabel: 'Mine' },
    { weaponId: 'dynamite', icon: 'dynamite', primary: '#df4d43', accent: '#ffd35b', hudLabel: 'Dynamite' },
    { weaponId: 'airstrike', icon: 'airstrike', primary: '#55b6ff', accent: '#e6f7ff', hudLabel: 'Airstrike' },
    { weaponId: 'fish-launcher', icon: 'fish', primary: '#55b9ed', accent: '#d8f5ff', hudLabel: 'Fish Bomb' },
    { weaponId: 'yarn-bomb', icon: 'yarn', primary: '#ef5cb7', accent: '#ffd0ec', hudLabel: 'Yarn Ball' },
    { weaponId: 'hairball-mortar', icon: 'hairball', primary: '#b6a18c', accent: '#eee0d0', hudLabel: 'Hairball' },
    { weaponId: 'catnip-grenade', icon: 'leaf', primary: '#50c454', accent: '#c7f0ad', hudLabel: 'Catnip' },
    { weaponId: 'exploding-mouse', icon: 'mouse', primary: '#a9a7b0', accent: '#ff6d5e', hudLabel: 'Mouse Rocket' },
    { weaponId: 'roomba-ride', icon: 'roomba', primary: '#555d70', accent: '#7de5ea', hudLabel: 'Roomba' },
    { weaponId: 'laser-pointer', icon: 'laser', primary: '#ed58c7', accent: '#ffe0f8', hudLabel: 'Laser' }
];
const BY_ID = new Map(WEAPON_VISUALS.map((visual) => [visual.weaponId, visual]));
function getWeaponVisual(weaponId) {
    const visual = BY_ID.get(weaponId);
    if (!visual)
        throw new Error(`Unknown weapon visual: ${weaponId}`);
    return visual;
}
function weaponTextureKey(weaponId) {
    return `weapon-${weaponId}`;
}
function buildWeaponHudCards(selectedWeaponId, ammoById) {
    return WEAPON_VISUALS.map((visual) => {
        const ammo = ammoById[visual.weaponId] ?? 0;
        return {
            weaponId: visual.weaponId,
            label: visual.hudLabel,
            ammoLabel: ammo === Infinity ? '∞' : `${ammo}`,
            selected: visual.weaponId === selectedWeaponId,
            disabled: ammo === 0,
            icon: visual.icon,
            primary: visual.primary,
            accent: visual.accent
        };
    });
}
return { WEAPON_VISUALS, getWeaponVisual, weaponTextureKey, buildWeaponHudCards };
})();

// --- game/art.js ---
const __mw_game_art_js = (() => {
const { CAT_ROSTER } = __mw_core_roster_js;
const { WEAPON_VISUALS, weaponTextureKey } = __mw_core_weaponVisuals_js;
const TEAM_COLORS = [0x2389ed, 0xf04e67];
const CAT_TEXTURE_DISPLAY_SCALE = 0.54;
const CAT_MENU_DISPLAY_SCALE = 0.62;
const WEAPON_ICON_DISPLAY_SCALE = 0.58;
function catTextureKey(team, presetId) {
    return `cat-${team}-${presetId}`;
}
function createGeneratedArt(scene) {
    for (const cat of CAT_ROSTER) {
        for (const team of [0, 1]) {
            const key = catTextureKey(team, cat.id);
            if (!scene.textures.exists(key))
                createCatTexture(scene, key, cat, team);
        }
    }
    for (const visual of WEAPON_VISUALS) {
        const key = weaponTextureKey(visual.weaponId);
        if (!scene.textures.exists(key))
            createWeaponTexture(scene, key, visual.icon, hex(visual.primary), hex(visual.accent));
    }
}
function hex(value) {
    return Number.parseInt(value.slice(1), 16);
}
function addPattern(g, pattern, coat, secondary) {
    if (pattern === 'tuxedo') {
        g.fillStyle(secondary, 1);
        g.fillEllipse(66, 70, 40, 48);
        g.fillTriangle(45, 31, 66, 58, 87, 31);
    }
    else if (pattern === 'socks') {
        g.fillStyle(secondary, 1);
        g.fillRoundedRect(31, 91, 25, 16, 6);
        g.fillRoundedRect(78, 91, 25, 16, 6);
        g.fillEllipse(66, 54, 36, 24);
    }
    else if (pattern === 'mask' || pattern === 'point') {
        g.fillStyle(secondary, pattern === 'point' ? 0.95 : 0.82);
        g.fillEllipse(66, 39, 55, 34);
        g.fillTriangle(29, 27, 41, 4, 55, 28);
        g.fillTriangle(77, 27, 96, 4, 103, 30);
        if (pattern === 'point') {
            g.fillEllipse(35, 91, 24, 14);
            g.fillEllipse(97, 91, 24, 14);
        }
    }
    else if (pattern === 'calico') {
        g.fillStyle(secondary, 1);
        g.fillCircle(47, 38, 18);
        g.fillCircle(86, 70, 22);
        g.fillStyle(0x3b3237, 0.95);
        g.fillCircle(84, 34, 17);
        g.fillEllipse(48, 76, 30, 19);
    }
    else if (pattern === 'tabby') {
        g.lineStyle(6, secondary, 0.95);
        for (const x of [52, 66, 80]) {
            g.beginPath();
            g.moveTo(x, 13);
            g.lineTo(x - 4, 29);
            g.strokePath();
        }
        for (const y of [61, 75]) {
            g.beginPath();
            g.moveTo(28, y);
            g.lineTo(48, y + 7);
            g.strokePath();
            g.beginPath();
            g.moveTo(105, y);
            g.lineTo(86, y + 7);
            g.strokePath();
        }
    }
    else if (pattern === 'spotted') {
        g.fillStyle(secondary, 0.9);
        for (const [x, y, r] of [[38, 57, 7], [61, 72, 6], [91, 59, 8], [47, 88, 5], [85, 88, 5]])
            g.fillCircle(x, y, r);
        g.lineStyle(5, secondary, 0.9);
        for (const x of [56, 70, 84]) {
            g.beginPath();
            g.moveTo(x, 12);
            g.lineTo(x - 3, 27);
            g.strokePath();
        }
    }
    else if (pattern === 'tortoiseshell') {
        g.fillStyle(secondary, 0.88);
        for (const [x, y, r] of [[43, 35, 15], [82, 50, 13], [53, 79, 14], [95, 83, 10]])
            g.fillCircle(x, y, r);
    }
    else if (pattern === 'whiteface') {
        g.fillStyle(secondary, 0.95);
        g.fillEllipse(66, 48, 42, 36);
        g.fillEllipse(66, 80, 34, 31);
    }
    else {
        g.fillStyle(secondary, 0.45);
        g.fillEllipse(66, 79, 45, 23);
    }
}
function drawAccessory(g, accessory, teamColor) {
    if (accessory === 'none')
        return;
    if (accessory === 'goggles') {
        g.lineStyle(5, 0x20263a, 1);
        g.strokeCircle(51, 40, 13);
        g.strokeCircle(81, 40, 13);
        g.lineStyle(4, 0x20263a, 1);
        g.beginPath();
        g.moveTo(64, 40);
        g.lineTo(68, 40);
        g.strokePath();
        g.fillStyle(0x78d9ff, 0.28);
        g.fillCircle(51, 40, 10);
        g.fillCircle(81, 40, 10);
    }
    else if (accessory === 'headband') {
        g.fillStyle(teamColor, 1);
        g.fillRoundedRect(34, 25, 65, 9, 4);
        g.fillTriangle(96, 28, 118, 18, 108, 39);
    }
    else if (accessory === 'bow') {
        g.fillStyle(teamColor, 1);
        g.fillTriangle(55, 84, 38, 72, 40, 94);
        g.fillTriangle(77, 84, 94, 72, 92, 94);
        g.fillCircle(66, 84, 8);
    }
    else if (accessory === 'scarf' || accessory === 'bandana') {
        g.fillStyle(teamColor, 1);
        g.fillRoundedRect(31, 76, 73, 13, 5);
        g.fillTriangle(89, 82, 116, 100, 101, 71);
    }
    else if (accessory === 'collar') {
        g.fillStyle(teamColor, 1);
        g.fillRoundedRect(35, 77, 62, 10, 5);
        g.fillStyle(0xffd85b, 1);
        g.fillCircle(66, 88, 7);
        g.fillCircle(64, 86, 2, 0xffffff);
    }
}
function createCatTexture(scene, key, cat, team) {
    const coat = hex(cat.coat);
    const secondary = hex(cat.secondary);
    const eyes = hex(cat.eyes);
    const teamColor = TEAM_COLORS[team];
    const g = scene.add.graphics();
    const bodyW = cat.bodyStyle === 'chunky' ? 100 : cat.bodyStyle === 'big' ? 96 : cat.bodyStyle === 'slender' ? 76 : cat.bodyStyle === 'fluffy' ? 92 : 86;
    const bodyH = cat.bodyStyle === 'chunky' ? 59 : cat.bodyStyle === 'fluffy' ? 61 : 54;
    const headR = cat.bodyStyle === 'big' ? 39 : cat.bodyStyle === 'fluffy' ? 38 : cat.bodyStyle === 'chunky' ? 37 : 35;
    g.fillStyle(0x07101f, 0.22);
    g.fillEllipse(67, 108, bodyW * 0.88, 14);
    if (cat.bodyStyle === 'fluffy' || cat.bodyStyle === 'big') {
        g.fillStyle(secondary, 0.32);
        for (const [x, y] of [[27, 72], [35, 92], [102, 74], [96, 95], [48, 103], [85, 104]])
            g.fillCircle(x, y, 17);
    }
    g.fillStyle(coat, 1);
    g.fillRoundedRect(66 - bodyW / 2, 50, bodyW, bodyH, Math.min(29, bodyH / 2));
    g.fillCircle(66, 40, headR);
    g.fillTriangle(28, 28, 38, 2, 56, 28);
    g.fillTriangle(78, 27, 99, 2, 106, 31);
    g.lineStyle(cat.bodyStyle === 'big' ? 11 : 9, coat, 1);
    g.beginPath();
    g.moveTo(107, 77);
    g.lineTo(129, 65);
    g.lineTo(125, 40);
    g.strokePath();
    addPattern(g, cat.pattern, coat, secondary);
    g.fillStyle(0xf4b0bd, 1);
    g.fillTriangle(60, 51, 72, 51, 66, 59);
    g.fillStyle(0xffffff, 1);
    g.fillEllipse(51, 39, 17, 20);
    g.fillEllipse(81, 39, 17, 20);
    g.fillStyle(eyes, 1);
    g.fillEllipse(51, 40, 8, 14);
    g.fillEllipse(81, 40, 8, 14);
    g.fillStyle(0x121827, 1);
    g.fillEllipse(51, 40, 3, 10);
    g.fillEllipse(81, 40, 3, 10);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(48, 36, 2);
    g.fillCircle(78, 36, 2);
    g.lineStyle(3, 0x463644, 0.8);
    g.beginPath();
    g.moveTo(61, 62);
    g.lineTo(66, 66);
    g.lineTo(72, 62);
    g.strokePath();
    for (const dy of [-5, 4]) {
        g.beginPath();
        g.moveTo(58, 59 + dy);
        g.lineTo(28, 54 + dy);
        g.strokePath();
        g.beginPath();
        g.moveTo(75, 59 + dy);
        g.lineTo(106, 54 + dy);
        g.strokePath();
    }
    g.fillStyle(coat, 1);
    g.fillRoundedRect(31, 99, 27, 8, 3);
    g.fillRoundedRect(77, 99, 27, 8, 3);
    drawAccessory(g, cat.accessory, teamColor);
    g.fillStyle(teamColor, 1);
    g.fillCircle(111, 99, 8);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(111, 99, 3);
    g.generateTexture(key, 140, 116);
    g.destroy();
}
function createWeaponTexture(scene, key, kind, primary, accent) {
    const g = scene.add.graphics();
    g.fillStyle(0x07101f, 0.18);
    g.fillEllipse(41, 43, 58, 8);
    g.lineStyle(3, 0x182033, 0.95);
    if (kind === 'handgun') {
        g.fillStyle(primary, 1);
        g.fillRoundedRect(18, 17, 42, 13, 4);
        g.fillRect(48, 28, 12, 6);
        g.fillStyle(accent, 1);
        g.fillRoundedRect(25, 28, 14, 20, 3);
    }
    else if (kind === 'shotgun' || kind === 'rifle' || kind === 'sniper') {
        g.fillStyle(primary, 1);
        g.fillRoundedRect(12, 21, 58, kind === 'shotgun' ? 8 : 10, 3);
        g.fillStyle(accent, 1);
        g.fillRoundedRect(16, 29, 26, 7, 2);
        g.fillTriangle(20, 34, 9, 45, 29, 36);
        if (kind === 'sniper') {
            g.fillStyle(0x2b3346, 1);
            g.fillRoundedRect(38, 13, 24, 6, 3);
            g.fillCircle(42, 16, 5);
        }
        if (kind === 'rifle') {
            g.fillStyle(0x2b3346, 1);
            g.fillRoundedRect(43, 29, 10, 16, 2);
        }
    }
    else if (kind === 'launcher') {
        g.fillStyle(primary, 1);
        g.fillRoundedRect(13, 17, 57, 18, 7);
        g.fillStyle(accent, 1);
        g.fillRect(19, 14, 8, 24);
        g.fillRect(57, 14, 8, 24);
        g.fillStyle(0x313849, 1);
        g.fillRoundedRect(35, 34, 10, 13, 2);
    }
    else if (kind === 'grenade') {
        g.fillStyle(primary, 1);
        g.fillCircle(40, 29, 17);
        g.lineStyle(2, accent, 0.75);
        for (const x of [32, 40, 48]) {
            g.beginPath();
            g.moveTo(x, 16);
            g.lineTo(x, 42);
            g.strokePath();
        }
        g.fillStyle(accent, 1);
        g.fillRoundedRect(34, 7, 14, 8, 2);
        g.fillCircle(50, 9, 5);
    }
    else if (kind === 'mine') {
        g.fillStyle(primary, 1);
        g.fillEllipse(40, 33, 48, 17);
        g.fillRoundedRect(20, 25, 40, 11, 5);
        g.fillStyle(accent, 1);
        g.fillCircle(40, 25, 5);
        g.fillRect(38, 9, 4, 13);
    }
    else if (kind === 'dynamite') {
        g.fillStyle(primary, 1);
        for (const y of [20, 29, 38])
            g.fillRoundedRect(18, y, 45, 8, 3);
        g.fillStyle(accent, 1);
        g.fillRect(28, 17, 5, 31);
        g.fillRect(49, 17, 5, 31);
        g.lineStyle(3, 0x392a2b, 1);
        g.beginPath();
        g.moveTo(62, 20);
        g.lineTo(72, 9);
        g.strokePath();
    }
    else if (kind === 'airstrike') {
        g.fillStyle(primary, 1);
        g.fillTriangle(10, 31, 69, 15, 54, 34);
        g.fillTriangle(35, 26, 26, 8, 49, 24);
        g.fillTriangle(43, 27, 54, 45, 58, 28);
        g.fillStyle(accent, 1);
        g.fillCircle(58, 23, 3);
    }
    else if (kind === 'fish') {
        g.fillStyle(primary, 1);
        g.fillEllipse(39, 29, 43, 24);
        g.fillTriangle(60, 29, 76, 17, 76, 41);
        g.fillStyle(accent, 1);
        g.fillCircle(28, 25, 4);
        g.fillTriangle(41, 18, 48, 8, 50, 22);
    }
    else if (kind === 'yarn') {
        g.fillStyle(primary, 1);
        g.fillCircle(40, 29, 20);
        g.lineStyle(3, accent, 0.65);
        for (let i = -12; i <= 12; i += 8) {
            g.beginPath();
            g.moveTo(25, 29 + i / 3);
            g.lineTo(55, 29 - i / 3);
            g.strokePath();
        }
    }
    else if (kind === 'hairball') {
        g.fillStyle(primary, 1);
        for (const [x, y, r] of [[40, 29, 17], [27, 29, 9], [53, 28, 10], [36, 18, 9], [43, 40, 9]])
            g.fillCircle(x, y, r);
        g.lineStyle(2, accent, 0.6);
        g.strokeCircle(40, 29, 15);
    }
    else if (kind === 'leaf') {
        g.fillStyle(primary, 1);
        g.fillEllipse(31, 29, 19, 32);
        g.fillEllipse(49, 24, 19, 32);
        g.lineStyle(3, accent, 0.9);
        g.beginPath();
        g.moveTo(39, 45);
        g.lineTo(40, 13);
        g.strokePath();
    }
    else if (kind === 'mouse') {
        g.fillStyle(primary, 1);
        g.fillEllipse(37, 29, 40, 22);
        g.fillCircle(52, 24, 8);
        g.fillCircle(48, 16, 7);
        g.fillStyle(accent, 1);
        g.fillCircle(58, 27, 4);
        g.lineStyle(3, accent, 1);
        g.beginPath();
        g.moveTo(20, 31);
        g.lineTo(8, 40);
        g.strokePath();
    }
    else if (kind === 'roomba') {
        g.fillStyle(primary, 1);
        g.fillEllipse(40, 31, 52, 22);
        g.fillEllipse(40, 26, 50, 19);
        g.fillStyle(accent, 1);
        g.fillCircle(51, 25, 5);
        g.lineStyle(2, accent, 0.8);
        g.strokeEllipse(40, 26, 31, 9);
    }
    else if (kind === 'laser') {
        g.fillStyle(primary, 1);
        g.fillRoundedRect(17, 17, 45, 15, 5);
        g.fillStyle(accent, 1);
        g.fillRect(59, 20, 10, 8);
        g.fillStyle(0x422d50, 1);
        g.fillRoundedRect(27, 31, 13, 18, 3);
        g.lineStyle(3, 0xff4b65, 0.8);
        g.beginPath();
        g.moveTo(69, 24);
        g.lineTo(80, 19);
        g.strokePath();
    }
    g.generateTexture(key, 82, 52);
    g.destroy();
}
return { CAT_TEXTURE_DISPLAY_SCALE, CAT_MENU_DISPLAY_SCALE, WEAPON_ICON_DISPLAY_SCALE, catTextureKey, createGeneratedArt };
})();

