/* Meow Wars v0.6 menu. Load after v06-hd.js. */
// --- game/MenuScene.js ---
const __mw_game_MenuScene_js = (() => {
const { ARENAS } = __mw_core_arenas_js;
const { CAT_ROSTER, SQUADS, getSquad, getSquadMenuCards } = __mw_core_roster_js;
const { CAT_MENU_DISPLAY_SCALE, catTextureKey, createGeneratedArt } = __mw_game_art_js;
const { Sfx } = __mw_game_audio_js;
class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
        this.sfx = new Sfx();
        this.mode = 'cpu';
        this.arenaIndex = 0;
        this.blueSquadIndex = 0;
        this.redSquadIndex = 1;
        this.bluePreview = [];
        this.redPreview = [];
    }
    create() {
        createGeneratedArt(this);
        this.mode = 'cpu';
        this.arenaIndex = 0;
        this.blueSquadIndex = 0;
        this.redSquadIndex = 1;
        this.drawGardenBackdrop();
        this.drawLogo();
        this.add.text(1252, 12, 'v' + (globalThis.MEOW_WARS_VERSION || '0.6.0') + '  •  BUILD ' + (globalThis.MEOW_WARS_BUILD || 'DEV'), { fontFamily: 'Arial Black, Arial', fontSize: '10px', color: '#e8f7ff', backgroundColor: '#102e52cc', padding: { x: 8, y: 4 } }).setOrigin(1, 0).setDepth(30);
        const settingsButton = this.add.rectangle(82, 29, 132, 34, 0x183457, 0.96).setStrokeStyle(2, 0xbfe8ff, 0.6).setInteractive({ useHandCursor: true }).setDepth(30);
        this.add.text(82, 29, '⚙  SETTINGS', { fontFamily: 'Arial Black, Arial', fontSize: '11px', color: '#ffffff' }).setOrigin(0.5).setDepth(31);
        settingsButton.on('pointerdown', () => { this.sfx.click(); this.showSettings(); });
        this.cpuButton = this.makeToggle(500, 167, '🐾  PLAYER vs CPU', () => { this.mode = 'cpu'; this.refresh(); });
        this.localButton = this.makeToggle(780, 167, '🐾🐾  LOCAL 2 PLAYER', () => { this.mode = 'local'; this.refresh(); });
        this.add.text(640, 211, 'BATTLEFIELD', {
            fontFamily: 'Arial Black, Arial', fontSize: '13px', color: '#dff5ff',
            backgroundColor: '#125b8f', padding: { x: 12, y: 4 }
        }).setOrigin(0.5).setDepth(20);
        this.add.rectangle(640, 257, 560, 84, 0x102e52, 0.96).setStrokeStyle(3, 0x66d4ff, 0.9).setDepth(10);
        this.arenaBadge = this.add.rectangle(640, 257, 530, 62, 0x5cc85b, 0.2).setDepth(11);
        this.makeArrow(325, 257, '◀', () => { this.arenaIndex = wrap(this.arenaIndex - 1, ARENAS.length); this.refresh(); });
        this.makeArrow(955, 257, '▶', () => { this.arenaIndex = wrap(this.arenaIndex + 1, ARENAS.length); this.refresh(); });
        this.arenaText = this.add.text(640, 244, '', {
            fontFamily: 'Arial Black, Arial', fontSize: '26px', color: '#fff2a1', stroke: '#163150', strokeThickness: 5
        }).setOrigin(0.5).setDepth(12);
        this.arenaTagline = this.add.text(640, 277, '', { fontFamily: 'Arial', fontSize: '14px', color: '#ffffff' }).setOrigin(0.5).setDepth(12);
        this.createSquadCard(330, 430, 0);
        this.createSquadCard(950, 430, 1);
        this.makeButton(640, 603, 'START BATTLE', 0xf05a4f, () => this.start());
        this.add.text(640, 651, `${CAT_ROSTER.length} CAT TYPES  •  ${SQUADS.length} SQUADS  •  7 BATTLEFIELDS  •  16 WEAPONS`, {
            fontFamily: 'Arial Black, Arial', fontSize: '12px', color: '#153555', backgroundColor: '#ffffffcc', padding: { x: 12, y: 5 }
        }).setOrigin(0.5).setDepth(20);
        this.add.text(640, 686, 'A/D move  •  W/S aim  •  hold SPACE to charge, release to fire  •  Q/E weapons', {
            fontFamily: 'Arial', fontSize: '14px', color: '#f6fbff', stroke: '#153555', strokeThickness: 3
        }).setOrigin(0.5).setDepth(20);
        this.refresh();
        this.input.once('pointerdown', () => this.sfx.unlock());
        this.input.keyboard?.once('keydown', () => this.sfx.unlock());
    }
    drawLogo() {
        this.add.text(644, 78, 'MEOW WARS', {
            fontFamily: 'Arial Black, Impact, Arial', fontSize: '67px', color: '#142542', stroke: '#142542', strokeThickness: 14
        }).setOrigin(0.5).setDepth(13);
        this.add.text(640, 72, 'MEOW WARS', {
            fontFamily: 'Arial Black, Impact, Arial', fontSize: '67px', color: '#ffd253', stroke: '#fff5ce', strokeThickness: 3
        }).setOrigin(0.5).setDepth(14);
        this.add.text(640, 121, 'CATS. CANNONS. TERRIBLE DECISIONS.', {
            fontFamily: 'Arial Black, Arial', fontSize: '16px', color: '#ffffff', stroke: '#713c28', strokeThickness: 5, letterSpacing: 1
        }).setOrigin(0.5).setDepth(15);
    }
    drawGardenBackdrop() {
        this.cameras.main.setBackgroundColor('#62c9f4');
        const g = this.add.graphics().setDepth(-20);
        g.fillStyle(0x64caf4, 1);
        g.fillRect(0, 0, 1280, 720);
        g.fillStyle(0xa8e8ff, 1);
        g.fillRect(0, 310, 1280, 410);
        g.fillStyle(0xffe58b, 1);
        g.fillCircle(1110, 82, 64);
        this.drawCloud(95, 82, 0.9);
        this.drawCloud(300, 120, 0.65);
        this.drawCloud(965, 105, 0.7);
        this.drawCloud(1200, 150, 0.55);
        const houseColors = [0xffd78d, 0xf7ad9d, 0xc7d6ff, 0xf2d3a5, 0xdac2ef];
        for (let i = 0; i < 8; i += 1) {
            const x = 40 + i * 175;
            const y = 315 + (i % 2) * 24;
            g.fillStyle(houseColors[i % houseColors.length], 0.92);
            g.fillRect(x, y, 118, 125);
            g.fillStyle(i % 2 ? 0x38597d : 0xc85c4f, 1);
            g.fillTriangle(x - 12, y, x + 59, y - 58, x + 130, y);
            g.fillStyle(0x72a4c9, 0.78);
            g.fillRect(x + 20, y + 30, 22, 31);
            g.fillRect(x + 75, y + 30, 22, 31);
            g.fillStyle(0xd66e69, 0.8);
            g.fillRoundedRect(x + 49, y + 77, 28, 48, 5);
        }
        for (const [x, s] of [[60, 1.1], [220, .8], [470, 1.0], [805, .95], [1130, 1.15]])
            this.drawTree(x, 370, s);
        g.fillStyle(0xf8f0d8, 1);
        for (let x = 0; x < 1280; x += 42) {
            g.fillRoundedRect(x, 442, 9, 82, 3);
            g.fillTriangle(x, 442, x + 4.5, 432, x + 9, 442);
        }
        g.fillRect(0, 463, 1280, 8);
        g.fillRect(0, 500, 1280, 8);
        g.fillStyle(0x4fae48, 1);
        g.fillRect(0, 500, 1280, 220);
        g.fillStyle(0x2f8b3d, 1);
        g.fillRect(0, 532, 1280, 188);
        for (let i = 0; i < 64; i += 1) {
            const x = 10 + ((i * 97) % 1270);
            const y = 505 + ((i * 53) % 112);
            this.drawFlower(x, y, [0xff6f80, 0xffcf4f, 0xffffff, 0x7dcbff][i % 4], 0.65 + (i % 3) * 0.15);
        }
        this.drawWoodSign(78, 238, ['SAME CATS', 'BIGGER BOOMS']);
        this.drawWoodSign(1196, 252, ['PLAN', 'AIM', 'YEET']);
    }
    drawCloud(x, y, scale) {
        const g = this.add.graphics().setDepth(-18);
        g.fillStyle(0xffffff, 0.78);
        g.fillEllipse(x, y, 105 * scale, 30 * scale);
        g.fillCircle(x - 28 * scale, y - 12 * scale, 24 * scale);
        g.fillCircle(x + 7 * scale, y - 17 * scale, 32 * scale);
        g.fillCircle(x + 37 * scale, y - 8 * scale, 22 * scale);
    }
    drawTree(x, y, scale) {
        const g = this.add.graphics().setDepth(-15);
        g.fillStyle(0x8a5b37, 1);
        g.fillRoundedRect(x - 13 * scale, y - 25 * scale, 26 * scale, 116 * scale, 9 * scale);
        g.fillStyle(0x3f9d4b, 1);
        g.fillCircle(x - 40 * scale, y - 45 * scale, 44 * scale);
        g.fillCircle(x + 34 * scale, y - 50 * scale, 50 * scale);
        g.fillCircle(x, y - 78 * scale, 55 * scale);
        g.fillStyle(0x69bf4d, 0.95);
        g.fillCircle(x - 15 * scale, y - 88 * scale, 31 * scale);
        g.fillCircle(x + 48 * scale, y - 75 * scale, 25 * scale);
    }
    drawFlower(x, y, color, scale) {
        const g = this.add.graphics().setDepth(-10);
        g.lineStyle(2, 0x257a35, 1);
        g.beginPath();
        g.moveTo(x, y + 12 * scale);
        g.lineTo(x, y - 1 * scale);
        g.strokePath();
        g.fillStyle(color, 1);
        g.fillCircle(x - 5 * scale, y, 5 * scale);
        g.fillCircle(x + 5 * scale, y, 5 * scale);
        g.fillCircle(x, y - 5 * scale, 5 * scale);
        g.fillCircle(x, y + 5 * scale, 5 * scale);
        g.fillStyle(0xffdb55, 1);
        g.fillCircle(x, y, 3.5 * scale);
    }
    drawWoodSign(x, y, lines) {
        const g = this.add.graphics().setDepth(2);
        g.fillStyle(0x724527, 1);
        g.fillRoundedRect(x - 5, y - 5, 10, 118, 3);
        lines.forEach((line, i) => {
            g.fillStyle(0xc98343, 1);
            g.fillRoundedRect(x - 68, y + i * 34, 136, 29, 4);
            g.lineStyle(2, 0x5c3825, 1);
            g.strokeRoundedRect(x - 68, y + i * 34, 136, 29, 4);
            this.add.text(x, y + 14 + i * 34, line, { fontFamily: 'Arial Black, Arial', fontSize: '12px', color: '#2d2430' }).setOrigin(0.5).setDepth(3);
        });
    }
    showSettings() {
        if (this.settingsLayer)
            return;
        const layer = this.add.container(0, 0).setDepth(220);
        const shade = this.add.rectangle(640, 360, 1280, 720, 0x08101f, 0.76).setInteractive();
        const panel = this.add.rectangle(640, 350, 620, 360, 0x10294a, 0.98).setStrokeStyle(4, 0x66d4ff, 0.9);
        const title = this.add.text(640, 224, 'SETTINGS & BUILD INFO', { fontFamily: 'Arial Black, Arial', fontSize: '26px', color: '#ffe36e' }).setOrigin(0.5);
        const version = this.add.text(640, 276, 'MEOW WARS v' + (globalThis.MEOW_WARS_VERSION || '0.6.0') + '\nBUILD ' + (globalThis.MEOW_WARS_BUILD || 'DEV'), { fontFamily: 'Arial Black, Arial', fontSize: '17px', color: '#ffffff', align: 'center', lineSpacing: 8 }).setOrigin(0.5);
        const details = this.add.text(640, 367, 'GRAPHICS  •  4K SOURCE ART\nPARALLAX  •  ON\nFLOWING WATER  •  ON\nSFX  •  ON', { fontFamily: 'Arial', fontSize: '16px', color: '#cfeeff', align: 'center', lineSpacing: 10 }).setOrigin(0.5);
        const close = this.add.rectangle(640, 472, 220, 48, 0xf05a4f, 1).setStrokeStyle(3, 0xfff0dc, 0.9).setInteractive({ useHandCursor: true });
        const closeText = this.add.text(640, 472, 'CLOSE', { fontFamily: 'Arial Black, Arial', fontSize: '18px', color: '#ffffff' }).setOrigin(0.5);
        layer.add([shade, panel, title, version, details, close, closeText]);
        this.settingsLayer = layer;
        close.on('pointerdown', () => { this.sfx.click(); layer.destroy(true); this.settingsLayer = null; });
    }
    createSquadCard(x, y, team) {
        const color = team === 0 ? 0x2898ee : 0xf04f6d;
        this.add.rectangle(x, y, 510, 202, 0x10294a, 0.96).setStrokeStyle(4, color, 0.95).setDepth(10);
        this.add.rectangle(x, y - 80, 494, 34, team === 0 ? 0x145a9a : 0x8d2f4d, 1).setDepth(11);
        const title = this.add.text(x - 228, y - 81, team === 0 ? '🐾  BLUE SQUAD' : '🐾  CPU SQUAD', {
            fontFamily: 'Arial Black, Arial', fontSize: '14px', color: team === 0 ? '#8cddff' : '#ff9fb0'
        }).setOrigin(0, 0.5).setDepth(12);
        if (team === 1)
            this.redTitle = title;
        this.makeArrow(x - 226, y + 5, '◀', () => {
            if (team === 0)
                this.blueSquadIndex = wrap(this.blueSquadIndex - 1, SQUADS.length);
            else
                this.redSquadIndex = wrap(this.redSquadIndex - 1, SQUADS.length);
            this.refresh();
        }, 36);
        this.makeArrow(x + 226, y + 5, '▶', () => {
            if (team === 0)
                this.blueSquadIndex = wrap(this.blueSquadIndex + 1, SQUADS.length);
            else
                this.redSquadIndex = wrap(this.redSquadIndex + 1, SQUADS.length);
            this.refresh();
        }, 36);
        const label = this.add.text(x, y - 50, '', { fontFamily: 'Arial Black, Arial', fontSize: '19px', color: '#ffffff' }).setOrigin(0.5).setDepth(12);
        if (team === 0)
            this.blueSquadText = label;
        else
            this.redSquadText = label;
    }
    refresh() {
        this.cpuButton.setFillStyle(this.mode === 'cpu' ? 0x2389ed : 0x233755, 1);
        this.localButton.setFillStyle(this.mode === 'local' ? 0xb33e7e : 0x233755, 1);
        const arena = ARENAS[this.arenaIndex];
        this.arenaText.setText(arena.name.toUpperCase());
        this.arenaTagline.setText(arena.tagline);
        this.arenaBadge.setFillStyle(Number.parseInt(arena.palette.accent.slice(1), 16), 0.18);
        const blue = SQUADS[this.blueSquadIndex];
        const red = SQUADS[this.redSquadIndex];
        this.blueSquadText.setText(blue.name.toUpperCase());
        this.redSquadText.setText(red.name.toUpperCase());
        this.redTitle?.setText(this.mode === 'cpu' ? '🐾  CPU SQUAD' : '🐾  RED SQUAD');
        this.refreshCatPreview(this.bluePreview, blue.id, 0, 330, 442);
        this.refreshCatPreview(this.redPreview, red.id, 1, 950, 442);
    }
    refreshCatPreview(previous, squadId, team, x, y) {
        previous.forEach((item) => item.destroy());
        previous.length = 0;
        const squad = getSquad(squadId);
        const cards = getSquadMenuCards(squadId);
        cards.forEach((card, index) => {
            const cx = x - 112 + index * 112;
            const frame = this.add.rectangle(cx, y + 3, 92, 96, team === 0 ? 0x153e6b : 0x55223b, 1).setStrokeStyle(2, team === 0 ? 0x64c8ff : 0xff8094, 0.85).setDepth(11);
            const sprite = this.add.image(cx, y - 7, catTextureKey(team, card.id)).setScale(CAT_MENU_DISPLAY_SCALE).setDepth(12);
            const name = this.add.text(cx, y + 39, card.name, { fontFamily: 'Arial Black, Arial', fontSize: '11px', color: '#ffffff' }).setOrigin(0.5).setDepth(13);
            const breed = this.add.text(cx, y + 55, card.breed, { fontFamily: 'Arial', fontSize: '9px', color: '#b8d7ec' }).setOrigin(0.5).setDepth(13);
            previous.push(frame, sprite, name, breed);
        });
        const motto = this.add.text(x, y + 82, squad.motto, { fontFamily: 'Arial', fontStyle: 'italic', fontSize: '12px', color: '#d7e8f5' }).setOrigin(0.5).setDepth(12);
        previous.push(motto);
    }
    start() {
        this.sfx.unlock();
        this.sfx.click();
        this.scene.start('GameScene', {
            mode: this.mode,
            arenaId: ARENAS[this.arenaIndex].id,
            blueSquadId: SQUADS[this.blueSquadIndex].id,
            redSquadId: SQUADS[this.redSquadIndex].id
        });
    }
    makeToggle(x, y, label, action) {
        const rect = this.add.rectangle(x, y, 270, 48, 0x233755, 1).setInteractive({ useHandCursor: true }).setDepth(10);
        rect.setStrokeStyle(3, 0xbde7ff, 0.65);
        this.add.text(x, y, label, { fontFamily: 'Arial Black, Arial', fontSize: '15px', color: '#ffffff' }).setOrigin(0.5).setDepth(11);
        rect.on('pointerdown', () => { this.sfx.click(); action(); });
        return rect;
    }
    makeButton(x, y, label, color, action) {
        const shadow = this.add.rectangle(x + 3, y + 5, 420, 62, 0x712e2d, 0.9).setDepth(10);
        const rect = this.add.rectangle(x, y, 420, 62, color, 1).setInteractive({ useHandCursor: true }).setDepth(11);
        rect.setStrokeStyle(3, 0xfff0dc, 0.9);
        const text = this.add.text(x, y, label, { fontFamily: 'Arial Black, Arial', fontSize: '25px', color: '#ffffff', stroke: '#9a302f', strokeThickness: 3 }).setOrigin(0.5).setDepth(12);
        rect.on('pointerover', () => { rect.setScale(1.035); text.setScale(1.035); shadow.setScale(1.035); });
        rect.on('pointerout', () => { rect.setScale(1); text.setScale(1); shadow.setScale(1); });
        rect.on('pointerdown', action);
    }
    makeArrow(x, y, label, action, size = 46) {
        const rect = this.add.rectangle(x, y, size, size, 0x183457, 1).setInteractive({ useHandCursor: true }).setDepth(15);
        rect.setStrokeStyle(2, 0xbfe8ff, 0.5);
        this.add.text(x, y - 1, label, { fontFamily: 'Arial Black, Arial', fontSize: `${Math.max(18, size * 0.46)}px`, color: '#ffffff' }).setOrigin(0.5).setDepth(16);
        rect.on('pointerdown', () => { this.sfx.click(); action(); });
    }
}
function wrap(value, length) {
    return (value + length) % length;
}
return { MenuScene };
})();

// --- main.js ---
const __mw_main_js = (() => {
const { preferredRenderResolution } = __mw_core_display_js;
const { GameScene } = __mw_game_GameScene_js;
const { MenuScene } = __mw_game_MenuScene_js;
const config = {
    type: Phaser.AUTO,
    parent: 'game',
    width: 1280,
    height: 720,
    resolution: preferredRenderResolution(globalThis.devicePixelRatio),
    backgroundColor: '#10182a',
    scene: [MenuScene, GameScene],
    input: { gamepad: true },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    render: {
        antialias: true,
        pixelArt: false
    }
};
new Phaser.Game(config);
return {};
})();
