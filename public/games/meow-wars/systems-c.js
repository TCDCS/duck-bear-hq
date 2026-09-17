/* Meow Wars v0.3 systems bundle. */
// --- game/audio.js ---
const __mw_game_audio_js = (() => {
class Sfx {
    constructor() {
        this.context = null;
    }
    unlock() {
        if (!this.context) {
            const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
            if (AudioContextCtor)
                this.context = new AudioContextCtor();
        }
        if (this.context?.state === 'suspended')
            void this.context.resume();
    }
    click() {
        this.tone(520, 0.045, 'square', 0.035, 720);
    }
    shot(kind = 'gun') {
        if (kind === 'sniper')
            this.tone(120, 0.12, 'sawtooth', 0.09, 55);
        else if (kind === 'laser')
            this.tone(950, 0.16, 'sine', 0.06, 1800);
        else
            this.tone(190, 0.075, 'square', 0.06, 85);
    }
    explosion(strength = 1) {
        this.unlock();
        const context = this.context;
        if (!context)
            return;
        const length = Math.floor(context.sampleRate * 0.28);
        const buffer = context.createBuffer(1, length, context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i += 1) {
            const envelope = 1 - i / length;
            data[i] = (Math.random() * 2 - 1) * envelope * envelope;
        }
        const source = context.createBufferSource();
        const gain = context.createGain();
        const filter = context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 700;
        gain.gain.value = Math.min(0.18, 0.1 * strength);
        source.buffer = buffer;
        source.connect(filter);
        filter.connect(gain);
        gain.connect(context.destination);
        source.start();
    }
    meow() {
        this.tone(430, 0.09, 'triangle', 0.035, 620);
        window.setTimeout(() => this.tone(620, 0.08, 'triangle', 0.03, 380), 70);
    }
    tone(startHz, duration, type, volume, endHz) {
        this.unlock();
        const context = this.context;
        if (!context)
            return;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const now = context.currentTime;
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(startHz, now);
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endHz), now + duration);
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(now);
        oscillator.stop(now + duration);
    }
}
return { Sfx };
})();

// --- game/Hud.js ---
const __mw_game_Hud_js = (() => {
const { WEAPONS } = __mw_core_weapons_js;
const { buildWeaponHudCards, weaponTextureKey } = __mw_core_weaponVisuals_js;
const { WEAPON_ICON_DISPLAY_SCALE } = __mw_game_art_js;
class Hud {
    constructor(scene) {
        this.buttons = new Map();
        this.selectHandler = () => undefined;
        this.scene = scene;
        const bottom = scene.add.rectangle(640, 668, 1272, 100, 0x081a30, 0.96).setDepth(100);
        bottom.setStrokeStyle(2, 0x65c9ff, 0.45);
        const leftTop = scene.add.rectangle(218, 30, 420, 50, 0x0d355f, 0.94).setDepth(100);
        const centreTop = scene.add.rectangle(706, 30, 535, 50, 0x0d355f, 0.94).setDepth(100);
        const rightTop = scene.add.rectangle(1115, 30, 275, 50, 0x0d355f, 0.94).setDepth(100);
        for (const panel of [leftTop, centreTop, rightTop])
            panel.setStrokeStyle(2, 0x6bd4ff, 0.65);
        this.teamText = scene.add.text(20, 14, '', {
            fontFamily: 'Arial Black, Arial', fontSize: '17px', color: '#ffffff', stroke: '#0b2948', strokeThickness: 2
        }).setDepth(102);
        this.centreText = scene.add.text(706, 12, '', {
            fontFamily: 'Arial Black, Arial', fontSize: '18px', color: '#ffe15c', align: 'center'
        }).setOrigin(0.5, 0).setDepth(102);
        this.helpText = scene.add.text(1242, 15, 'A/D move  W/S aim\nSPACE fire  Q/E weapons', {
            fontFamily: 'Arial', fontSize: '11px', color: '#eef8ff', align: 'right', lineSpacing: 3
        }).setOrigin(1, 0).setDepth(102);
        this.powerBack = scene.add.rectangle(706, 54, 220, 7, 0x071321, 0.95).setDepth(102);
        this.powerBack.setStrokeStyle(1, 0x8fdcff, 0.35);
        this.powerFill = scene.add.rectangle(596, 54, 2, 7, 0xffd95a, 1).setOrigin(0, 0.5).setDepth(103);
        WEAPONS.forEach((weapon, index) => {
            const col = index % 8;
            const row = Math.floor(index / 8);
            const x = 81 + col * 160;
            const y = 638 + row * 44;
            const base = weapon.family === 'cat' ? 0x41285d : 0x163b64;
            const rect = scene.add.rectangle(x, y, 151, 38, base, 0.98)
                .setDepth(101)
                .setInteractive({ useHandCursor: true });
            rect.setStrokeStyle(2, weapon.family === 'cat' ? 0xa170d2 : 0x57b6ed, 0.55);
            const icon = scene.add.image(x - 49, y, weaponTextureKey(weapon.id)).setScale(WEAPON_ICON_DISPLAY_SCALE).setDepth(102);
            const label = scene.add.text(x + 2, y - 5, weapon.shortName, {
                fontFamily: 'Arial Black, Arial', fontSize: '10px', color: '#ffffff', align: 'center'
            }).setOrigin(0.5).setDepth(102);
            const ammo = scene.add.text(x + 58, y + 8, '', {
                fontFamily: 'Arial Black, Arial', fontSize: '10px', color: '#d8edff'
            }).setOrigin(1, 0.5).setDepth(102);
            rect.on('pointerdown', () => this.selectHandler(weapon.id));
            rect.on('pointerover', () => { rect.setScale(1.025); icon.setScale(WEAPON_ICON_DISPLAY_SCALE * 1.03); });
            rect.on('pointerout', () => { rect.setScale(1); icon.setScale(WEAPON_ICON_DISPLAY_SCALE); });
            this.buttons.set(weapon.id, { rect, icon, label, ammo });
        });
    }
    onWeaponSelect(handler) {
        this.selectHandler = handler;
    }
    update(state) {
        this.teamText.setText(`${state.teamName}  •  ${state.catName}  •  ${Math.max(0, Math.ceil(state.health))} HP`);
        const direction = state.wind < -1 ? '◀' : state.wind > 1 ? '▶' : '•';
        this.centreText.setText(`${Math.ceil(state.timerSeconds)}s   WIND ${direction} ${Math.abs(state.wind).toFixed(0)}   ${state.arenaName.toUpperCase()}   ${state.mode === 'cpu' ? 'VS CPU' : 'LOCAL 2P'}`);
        this.powerFill.width = Math.max(2, 218 * state.charging);
        const ammoRecord = Object.fromEntries(state.ammo.entries());
        const cards = buildWeaponHudCards(state.selectedWeaponId, ammoRecord);
        for (const card of cards) {
            const button = this.buttons.get(card.weaponId);
            if (!button)
                continue;
            button.label.setText(card.label);
            button.ammo.setText(card.ammoLabel);
            button.rect.setStrokeStyle(card.selected ? 3 : 2, card.selected ? 0xffe15c : (card.weaponId.includes('fish') || card.weaponId.includes('yarn') || card.weaponId.includes('hairball') || card.weaponId.includes('catnip') || card.weaponId.includes('mouse') || card.weaponId.includes('roomba') || card.weaponId.includes('laser') ? 0xa170d2 : 0x57b6ed), card.selected ? 1 : 0.55);
            button.rect.setAlpha(card.disabled ? 0.35 : 1);
            button.icon.setAlpha(card.disabled ? 0.35 : 1);
            button.label.setAlpha(card.disabled ? 0.45 : 1);
            button.ammo.setAlpha(card.disabled ? 0.45 : 1);
            if (card.selected) {
                button.rect.setFillStyle(0x5c4a2a, 1);
                button.label.setColor('#fff3a4');
            }
            else {
                const weapon = WEAPONS.find((entry) => entry.id === card.weaponId);
                button.rect.setFillStyle(weapon?.family === 'cat' ? 0x41285d : 0x163b64, 0.98);
                button.label.setColor('#ffffff');
            }
        }
    }
    setHelp(text) {
        if (text.includes('move'))
            this.helpText.setText('A/D move  W/S aim\nSPACE fire  Q/E weapons');
        else
            this.helpText.setText(text);
    }
}
return { Hud };
})();

// --- game/WeaponRuntime.js ---
const __mw_game_WeaponRuntime_js = (() => {
const SUPPORTED_BEHAVIOURS = new Set([
    'hitscan',
    'spread',
    'projectile',
    'lobbed',
    'deploy',
    'airstrike',
    'ground-runner',
    'laser'
]);
function supportsBehaviour(behaviour) {
    return SUPPORTED_BEHAVIOURS.has(behaviour);
}
return { SUPPORTED_BEHAVIOURS, supportsBehaviour };
})();

