/* Meow Wars v0.3 GameScene split bundle. Load after system parts. */
const { ActionLog } = __mw_core_actions_js;
const { chooseCpuShot } = __mw_core_ai_js;
const { ARENAS, getArena } = __mw_core_arenas_js;
const { buildArenaDecor } = __mw_core_decor_js;
const { getDecorStyle } = __mw_core_decorStyles_js;
const { radialDamage, stepProjectile } = __mw_core_ballistics_js;
const { carveCircle, generateTerrain, isSolidWorld, surfaceY } = __mw_core_terrain_js;
const { getCatPreset, getSquad, SQUADS } = __mw_core_roster_js;
const { TurnManager } = __mw_core_turns_js;
const { WEAPONS, getWeapon } = __mw_core_weapons_js;
const { CAT_TEXTURE_DISPLAY_SCALE, catTextureKey, createGeneratedArt } = __mw_game_art_js;
const { Sfx } = __mw_game_audio_js;
const { Hud } = __mw_game_Hud_js;
const { supportsBehaviour } = __mw_game_WeaponRuntime_js;
class GameScene extends Phaser.Scene {
constructor() {
        super('GameScene');
        this.mode = 'cpu';
        this.arena = ARENAS[0];
        this.blueSquad = SQUADS[0];
        this.redSquad = SQUADS[1];
        this.actionLog = new ActionLog();
        this.turnNumber = 1;
        this.lastLoggedMoveX = Number.NaN;
        this.lastLoggedAim = Number.NaN;
        this.cats = [];
        this.selectedWeaponIndex = WEAPONS.findIndex((weapon) => weapon.id === 'bazooka');
        this.teamAmmo = [new Map(), new Map()];
        this.wind = 0;
        this.turnRemainingMs = TURN_MS;
        this.chargePower = 0.36;
        this.aimAngleDeg = 42;
        this.facing = 1;
        this.actionLocked = false;
        this.gameOver = false;
        this.paused = false;
        this.resolutionEarliest = 0;
        this.resolutionDeadline = 0;
        this.projectiles = [];
        this.deployables = [];
        this.runners = [];
        this.keys = {};
        this.lastFire = false;
        this.lastPrev = false;
        this.lastNext = false;
        this.lastPause = false;
        this.sfx = new Sfx();
        this.cpuToken = 0;
    }
}

/* GameScene methods init…createSky */
GameScene.prototype.init = function(data) {
        this.mode = data?.mode === 'local' ? 'local' : 'cpu';
        this.arena = safeArena(data?.arenaId);
        this.blueSquad = safeSquad(data?.blueSquadId, SQUADS[0]);
        this.redSquad = safeSquad(data?.redSquadId, SQUADS[1]);
    };

GameScene.prototype.create = function() {
        this.cats = [];
        this.projectiles = [];
        this.deployables = [];
        this.runners = [];
        this.gameOver = false;
        this.paused = false;
        this.actionLocked = false;
        this.actionLog = new ActionLog();
        this.turnNumber = 1;
        this.selectedWeaponIndex = WEAPONS.findIndex((weapon) => weapon.id === 'bazooka');
        createGeneratedArt(this);
        this.createSky();
        this.terrain = generateTerrain(WIDTH, HEIGHT, this.arena.seed, 4, this.arena.terrainProfile);
        this.createTerrainTexture();
        this.spawnCats();
        this.turns = new TurnManager(['blue-1', 'red-1', 'blue-2', 'red-2', 'blue-3', 'red-3']);
        this.resetAmmo();
        globalThis.__meowWarsActionLog = () => this.actionLog.export();
        this.aimGraphics = this.add.graphics().setDepth(30);
        this.healthGraphics = this.add.graphics().setDepth(31);
        this.hud = new Hud(this);
        this.hud.onWeaponSelect((weaponId) => {
            if (this.gameOver || this.actionLocked || this.isCpuTurn())
                return;
            this.selectWeaponById(weaponId);
        });
        this.registerInput();
        this.startTurn(true);
        this.input.on('pointerdown', () => this.sfx.unlock());
        this.input.keyboard?.on('keydown', () => this.sfx.unlock());
    };

GameScene.prototype.update = function(_time, delta) {
        const dtMs = Math.min(delta, 40);
        if (this.gameOver) {
            this.handleRestartInput();
            return;
        }
        this.handlePauseInput();
        if (this.paused)
            return;
        this.updateCatPhysics(dtMs / 1000);
        this.updateProjectiles(dtMs);
        this.updateDeployables(dtMs);
        this.updateRunners(dtMs);
        if (!this.actionLocked) {
            this.turnRemainingMs -= dtMs;
            if (this.turnRemainingMs <= 0) {
                this.endTurn('timeout');
            }
            else if (!this.isCpuTurn()) {
                this.updateHumanInput(dtMs);
            }
        }
        else {
            this.updateActionResolution();
        }
        this.syncSprites();
        this.drawAim();
        this.drawHealthBars();
        this.updateHud();
        this.checkWin();
    };

GameScene.prototype.createSky = function() {
        const p = this.arena.palette;
        const skyTop = hexNumber(p.skyTop);
        const skyBottom = hexNumber(p.skyBottom);
        this.cameras.main.setBackgroundColor(p.skyTop);
        this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, skyTop, 1).setDepth(-30);
        this.add.rectangle(WIDTH / 2, 425, WIDTH, 510, skyBottom, 0.54).setDepth(-29);
        this.add.circle(1090, 105, this.arena.id === 'rooftop-rumble' ? 52 : 61, hexNumber(p.sun), 0.95).setDepth(-28);
        for (const item of buildArenaDecor(this.arena.id))
            this.renderDecorItem(item);
        const labelBack = this.add.rectangle(112, 88, 184, 42, 0x10223e, 0.82).setDepth(90);
        labelBack.setStrokeStyle?.(2, hexNumber(p.accent), 0.85);
        this.add.text(112, 88, this.arena.name.toUpperCase(), {
            fontFamily: 'Arial Black, Arial', fontSize: '14px', color: '#ffffff'
        }).setOrigin(0.5).setDepth(91);
    };

/* GameScene methods renderDecorItem…renderDecorItem */
GameScene.prototype.renderDecorItem = function(item) {
        const style = getDecorStyle(item.kind);
        const primary = hexNumber(style.primary);
        const secondary = hexNumber(style.secondary);
        const detail = hexNumber(style.detail);
        const depth = item.layer === 'far' ? -27 : item.layer === 'mid' ? -21 : -4;
        const x = item.x;
        const y = item.y;
        const s = item.scale;
        const g = this.add.graphics().setDepth(depth);
        if (item.kind === 'cloud') {
            g.fillStyle(primary, 0.68);
            g.fillEllipse(x, y, 112 * s, 31 * s);
            g.fillCircle(x - 28 * s, y - 12 * s, 24 * s);
            g.fillCircle(x + 7 * s, y - 17 * s, 31 * s);
            g.fillCircle(x + 37 * s, y - 7 * s, 21 * s);
            return;
        }
        if (item.kind === 'house') {
            g.fillStyle(primary, 0.88);
            g.fillRect(x - 40 * s, y - 68 * s, 80 * s, 78 * s);
            g.fillStyle(secondary, 0.95);
            g.fillTriangle(x - 52 * s, y - 68 * s, x, y - 108 * s, x + 52 * s, y - 68 * s);
            g.fillStyle(detail, 0.75);
            g.fillRect(x - 25 * s, y - 45 * s, 14 * s, 19 * s);
            g.fillRect(x + 11 * s, y - 45 * s, 14 * s, 19 * s);
            return;
        }
        if (item.kind === 'tree') {
            g.fillStyle(detail, 1);
            g.fillRoundedRect(x - 9 * s, y - 58 * s, 18 * s, 70 * s, 5 * s);
            g.fillStyle(primary, 1);
            g.fillCircle(x - 24 * s, y - 69 * s, 28 * s);
            g.fillCircle(x + 22 * s, y - 72 * s, 31 * s);
            g.fillStyle(secondary, 1);
            g.fillCircle(x, y - 91 * s, 35 * s);
            return;
        }
        if (item.kind === 'fence') {
            g.fillStyle(primary, 0.9);
            for (let i = 0; i < 5; i += 1) {
                const px = x - 45 * s + i * 22 * s;
                g.fillRoundedRect(px, y - 38 * s, 7 * s, 45 * s, 2 * s);
                g.fillTriangle(px, y - 38 * s, px + 3.5 * s, y - 46 * s, px + 7 * s, y - 38 * s);
            }
            g.fillStyle(secondary, 0.92);
            g.fillRect(x - 48 * s, y - 27 * s, 98 * s, 6 * s);
            g.fillRect(x - 48 * s, y - 6 * s, 98 * s, 6 * s);
            return;
        }
        if (item.kind === 'flower') {
            g.lineStyle(2.5 * s, detail, 1);
            g.beginPath();
            g.moveTo(x, y + 7 * s);
            g.lineTo(x, y - 13 * s);
            g.strokePath();
            g.fillStyle(primary, 1);
            for (const [dx, dy] of [[-6, 0], [6, 0], [0, -6], [0, 6]])
                g.fillCircle(x + dx * s, y - 14 * s + dy * s, 6 * s);
            g.fillStyle(secondary, 1);
            g.fillCircle(x, y - 14 * s, 4 * s);
            return;
        }
        if (item.kind === 'shrub') {
            g.fillStyle(primary, 1);
            g.fillCircle(x - 22 * s, y - 17 * s, 22 * s);
            g.fillCircle(x + 18 * s, y - 18 * s, 25 * s);
            g.fillStyle(secondary, 1);
            g.fillCircle(x, y - 31 * s, 24 * s);
            return;
        }
        if (item.kind === 'birdhouse') {
            g.fillStyle(detail, 1);
            g.fillRect(x - 3 * s, y - 5 * s, 6 * s, 55 * s);
            g.fillStyle(primary, 1);
            g.fillRoundedRect(x - 22 * s, y - 39 * s, 44 * s, 37 * s, 4 * s);
            g.fillStyle(secondary, 1);
            g.fillTriangle(x - 28 * s, y - 39 * s, x, y - 62 * s, x + 28 * s, y - 39 * s);
            g.fillStyle(0x2b3340, 1);
            g.fillCircle(x, y - 23 * s, 7 * s);
            return;
        }
        if (item.kind === 'watering-can') {
            g.fillStyle(primary, 1);
            g.fillRoundedRect(x - 24 * s, y - 26 * s, 43 * s, 27 * s, 6 * s);
            g.lineStyle(6 * s, secondary, 1);
            g.strokeCircle(x - 3 * s, y - 27 * s, 17 * s);
            g.fillStyle(primary, 1);
            g.fillTriangle(x + 15 * s, y - 21 * s, x + 46 * s, y - 34 * s, x + 20 * s, y - 7 * s);
            return;
        }
        if (item.kind === 'building') {
            const h = (95 + (item.variant ?? 0) % 4 * 22) * s;
            g.fillStyle(primary, 0.82);
            g.fillRect(x - 43 * s, y - h, 86 * s, h);
            g.fillStyle(secondary, 0.95);
            g.fillRect(x - 43 * s, y - h, 86 * s, 9 * s);
            g.fillStyle(detail, 0.6);
            for (let row = 0; row < 3; row += 1)
                for (let col = 0; col < 3; col += 1)
                    g.fillRect(x - 28 * s + col * 26 * s, y - h + 24 * s + row * 26 * s, 9 * s, 12 * s);
            return;
        }
        if (item.kind === 'water-tower') {
            g.fillStyle(primary, 0.9);
            g.fillEllipse(x, y - 70 * s, 88 * s, 52 * s);
            g.fillRect(x - 44 * s, y - 70 * s, 88 * s, 28 * s);
            g.lineStyle(6 * s, secondary, 1);
            g.beginPath();
            g.moveTo(x - 30 * s, y - 42 * s);
            g.lineTo(x - 43 * s, y + 8 * s);
            g.moveTo(x + 30 * s, y - 42 * s);
            g.lineTo(x + 43 * s, y + 8 * s);
            g.strokePath();
            g.lineStyle(3 * s, detail, 0.8);
            g.beginPath();
            g.moveTo(x - 39 * s, y - 10 * s);
            g.lineTo(x + 39 * s, y - 10 * s);
            g.strokePath();
            return;
        }
        if (item.kind === 'chimney') {
            g.fillStyle(primary, 1);
            g.fillRect(x - 18 * s, y - 62 * s, 36 * s, 62 * s);
            g.fillStyle(secondary, 1);
            g.fillRect(x - 24 * s, y - 68 * s, 48 * s, 11 * s);
            g.lineStyle(2 * s, detail, 0.55);
            for (let yy = y - 51 * s; yy < y - 5 * s; yy += 15 * s) {
                g.beginPath();
                g.moveTo(x - 17 * s, yy);
                g.lineTo(x + 17 * s, yy);
                g.strokePath();
            }
            return;
        }
        if (item.kind === 'vent') {
            g.fillStyle(primary, 1);
            g.fillRect(x - 16 * s, y - 47 * s, 32 * s, 47 * s);
            g.fillStyle(secondary, 1);
            g.fillEllipse(x, y - 48 * s, 45 * s, 20 * s);
            g.fillStyle(detail, 0.8);
            g.fillEllipse(x, y - 51 * s, 27 * s, 9 * s);
            return;
        }
        if (item.kind === 'aerial') {
            g.lineStyle(4 * s, primary, 1);
            g.beginPath();
            g.moveTo(x, y);
            g.lineTo(x, y - 82 * s);
            g.moveTo(x - 35 * s, y - 64 * s);
            g.lineTo(x + 35 * s, y - 76 * s);
            g.strokePath();
            g.lineStyle(2 * s, secondary, 1);
            for (const off of [-24, -8, 8, 24]) {
                g.beginPath();
                g.moveTo(x + off * s, y - 62 * s + off * .17 * s);
                g.lineTo(x + off * s, y - 83 * s + off * .17 * s);
                g.strokePath();
            }
            return;
        }
        if (item.kind === 'plant-pot') {
            g.fillStyle(primary, 1);
            g.fillTrapezoid?.(x - 18 * s, y - 25 * s, 36 * s, 25 * s, 7 * s);
            if (!g.fillTrapezoid)
                g.fillRect(x - 16 * s, y - 22 * s, 32 * s, 22 * s);
            g.fillStyle(detail, 1);
            for (const dx of [-10, 0, 10])
                g.fillEllipse(x + dx * s, y - 38 * s, 16 * s, 27 * s);
            return;
        }
        if (item.kind === 'string-lights') {
            g.lineStyle(2 * s, primary, 0.9);
            g.beginPath();
            g.moveTo(x - 90 * s, y - 18 * s);
            g.lineTo(x + 90 * s, y - 8 * s);
            g.strokePath();
            for (let i = 0; i < 7; i += 1) {
                const lx = x - 78 * s + i * 26 * s;
                const ly = y - 16 * s + i * 1.4 * s;
                g.fillStyle(i % 2 ? secondary : detail, 1);
                g.fillCircle(lx, ly + 7 * s, 4 * s);
            }
            return;
        }
        if (item.kind === 'scrap-pile') {
            g.fillStyle(primary, 1);
            g.fillTriangle(x - 55 * s, y, x - 20 * s, y - 50 * s, x + 5 * s, y);
            g.fillStyle(secondary, 1);
            g.fillTriangle(x - 10 * s, y, x + 28 * s, y - 60 * s, x + 58 * s, y);
            g.fillStyle(detail, 1);
            g.fillRect(x - 38 * s, y - 24 * s, 55 * s, 10 * s);
            g.fillCircle(x + 34 * s, y - 18 * s, 14 * s);
            return;
        }
        if (item.kind === 'tyre') {
            g.fillStyle(primary, 1);
            g.fillCircle(x, y - 20 * s, 23 * s);
            g.fillStyle(detail, 1);
            g.fillCircle(x, y - 20 * s, 11 * s);
            g.lineStyle(3 * s, secondary, 0.8);
            g.strokeCircle(x, y - 20 * s, 17 * s);
            return;
        }
        if (item.kind === 'barrel') {
            g.fillStyle(primary, 1);
            g.fillRoundedRect(x - 20 * s, y - 48 * s, 40 * s, 48 * s, 5 * s);
            g.fillStyle(secondary, 1);
            g.fillRect(x - 21 * s, y - 38 * s, 42 * s, 5 * s);
            g.fillRect(x - 21 * s, y - 13 * s, 42 * s, 5 * s);
            g.fillStyle(detail, 0.65);
            g.fillCircle(x, y - 25 * s, 7 * s);
            return;
        }
        if (item.kind === 'car-shell') {
            g.fillStyle(primary, 1);
            g.fillRoundedRect(x - 48 * s, y - 31 * s, 96 * s, 25 * s, 10 * s);
            g.fillStyle(secondary, 1);
            g.fillTrapezoid?.(x - 28 * s, y - 54 * s, 58 * s, 24 * s, 10 * s);
            if (!g.fillTrapezoid)
                g.fillRect(x - 25 * s, y - 49 * s, 50 * s, 20 * s);
            g.fillStyle(detail, 1);
            g.fillCircle(x - 30 * s, y - 5 * s, 14 * s);
            g.fillCircle(x + 30 * s, y - 5 * s, 14 * s);
            return;
        }
        if (item.kind === 'crane') {
            g.lineStyle(7 * s, primary, 1);
            g.beginPath();
            g.moveTo(x - 35 * s, y);
            g.lineTo(x - 35 * s, y - 115 * s);
            g.lineTo(x + 62 * s, y - 115 * s);
            g.strokePath();
            g.lineStyle(3 * s, secondary, 1);
            g.beginPath();
            g.moveTo(x - 33 * s, y - 111 * s);
            g.lineTo(x + 5 * s, y - 69 * s);
            g.lineTo(x + 45 * s, y - 111 * s);
            g.strokePath();
            g.lineStyle(2 * s, detail, 1);
            g.beginPath();
            g.moveTo(x + 47 * s, y - 112 * s);
            g.lineTo(x + 47 * s, y - 56 * s);
            g.strokePath();
            return;
        }
        if (item.kind === 'sign') {
            g.fillStyle(secondary, 1);
            g.fillRect(x - 3 * s, y - 12 * s, 6 * s, 55 * s);
            g.fillStyle(primary, 1);
            g.fillRoundedRect(x - 42 * s, y - 50 * s, 84 * s, 38 * s, 5 * s);
            g.lineStyle(2 * s, detail, 0.8);
            g.strokeRoundedRect(x - 42 * s, y - 50 * s, 84 * s, 38 * s, 5 * s);
            return;
        }
        if (item.kind === 'pipe') {
            g.lineStyle(13 * s, primary, 1);
            g.beginPath();
            g.moveTo(x - 34 * s, y);
            g.lineTo(x - 34 * s, y - 36 * s);
            g.lineTo(x + 20 * s, y - 36 * s);
            g.lineTo(x + 20 * s, y - 58 * s);
            g.strokePath();
            g.lineStyle(3 * s, secondary, 1);
            g.strokeCircle(x + 20 * s, y - 58 * s, 9 * s);
            return;
        }
        if (item.kind === 'crate') {
            g.fillStyle(primary, 1);
            g.fillRect(x - 28 * s, y - 48 * s, 56 * s, 48 * s);
            g.lineStyle(5 * s, secondary, 1);
            g.strokeRect(x - 28 * s, y - 48 * s, 56 * s, 48 * s);
            g.beginPath();
            g.moveTo(x - 24 * s, y - 44 * s);
            g.lineTo(x + 24 * s, y - 4 * s);
            g.moveTo(x + 24 * s, y - 44 * s);
            g.lineTo(x - 24 * s, y - 4 * s);
            g.strokePath();
        }
    };

