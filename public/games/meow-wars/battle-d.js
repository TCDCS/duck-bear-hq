/* GameScene methods drawHealthBars…isCpuTurn */
GameScene.prototype.drawHealthBars = function() {
        this.healthGraphics.clear();
        for (const cat of this.cats) {
            if (!cat.alive)
                continue;
            const width = 44;
            const ratio = clamp(cat.health / 100, 0, 1);
            this.healthGraphics.fillStyle(0x151823, 0.8);
            this.healthGraphics.fillRoundedRect(cat.x - width / 2, cat.y - 39, width, 6, 3);
            this.healthGraphics.fillStyle(ratio > 0.5 ? 0x5de36f : ratio > 0.25 ? 0xffc94a : 0xff5b5b, 1);
            this.healthGraphics.fillRoundedRect(cat.x - width / 2 + 1, cat.y - 38, (width - 2) * ratio, 4, 2);
            if (cat.id === this.turns.current) {
                this.healthGraphics.lineStyle(2, 0xffe36e, 1);
                this.healthGraphics.strokeCircle(cat.x, cat.y - 5, 32);
                this.healthGraphics.fillStyle(0xffe36e, 1);
                this.healthGraphics.fillTriangle(cat.x - 8, cat.y - 54, cat.x + 8, cat.y - 54, cat.x, cat.y - 44);
            }
        }
    };

GameScene.prototype.updateHud = function() {
        const cat = this.activeCat();
        const teamName = cat.team === 0 ? this.blueSquad.name.toUpperCase() : this.redSquad.name.toUpperCase();
        this.hud.update({
            teamName,
            catName: cat.name,
            health: cat.health,
            timerSeconds: this.turnRemainingMs / 1000,
            wind: this.wind,
            selectedWeaponId: WEAPONS[this.selectedWeaponIndex].id,
            ammo: this.teamAmmo[cat.team],
            mode: this.mode,
            charging: this.chargePower,
            arenaName: this.arena.name
        });
        if (this.isCpuTurn())
            this.hud.setHelp('CPU THINKING…');
        else if (this.paused)
            this.hud.setHelp('PAUSED');
        else
            this.hud.setHelp('A/D move  W/S aim  SPACE charge/fire  Q/E weapons');
    };

GameScene.prototype.checkWin = function() {
        if (this.gameOver)
            return;
        const blueAlive = this.cats.some((cat) => cat.team === 0 && cat.alive);
        const redAlive = this.cats.some((cat) => cat.team === 1 && cat.alive);
        if (blueAlive && redAlive)
            return;
        this.gameOver = true;
        this.actionLocked = true;
        this.cpuToken += 1;
        const overlay = this.add.rectangle(640, 315, 660, 210, 0x111522, 0.92).setDepth(250);
        overlay.setStrokeStyle(4, 0xffe36e, 0.8);
        const result = blueAlive ? `${this.blueSquad.name.toUpperCase()} WINS!` : redAlive ? `${this.redSquad.name.toUpperCase()} WINS!` : 'EVERYBODY LOST!';
        this.add.text(640, 285, result, {
            fontFamily: 'Arial Black, Arial', fontSize: '42px', color: '#ffe36e', align: 'center'
        }).setOrigin(0.5).setDepth(251);
        this.add.text(640, 350, 'R: rematch     M: main menu', {
            fontFamily: 'Arial', fontSize: '22px', color: '#ffffff'
        }).setOrigin(0.5).setDepth(251);
        this.sfx.meow();
    };

GameScene.prototype.activeCat = function() {
        const cat = this.catById(this.turns?.current ?? 'blue-1');
        if (!cat)
            throw new Error('Active cat missing');
        return cat;
    };

GameScene.prototype.catById = function(id) {
        return this.cats.find((cat) => cat.id === id);
    };

GameScene.prototype.isCpuTurn = function() {
        return this.mode === 'cpu' && this.activeCat().team === 1;
    };

function safeArena(id) {
    if (!id)
        return ARENAS[0];
    try {
        return getArena(id);
    }
    catch {
        return ARENAS[0];
    }
}
function safeSquad(id, fallback) {
    if (!id)
        return fallback;
    try {
        return getSquad(id);
    }
    catch {
        return fallback;
    }
}
function hexNumber(value) {
    return Number.parseInt(value.slice(1), 16);
}
function shadeHex(value, amount) {
    const raw = Number.parseInt(value.slice(1), 16);
    const r = Math.max(0, Math.min(255, (raw >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((raw >> 8) & 255) + amount));
    const b = Math.max(0, Math.min(255, (raw & 255) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function projectileColor(id) {
    if (id === 'fish-launcher')
        return 0x6ed8e8;
    if (id === 'yarn-bomb')
        return 0xff68c0;
    if (id === 'hairball-mortar')
        return 0x7b6a52;
    if (id === 'catnip-grenade')
        return 0x72d464;
    if (id === 'grenade')
        return 0x4f6f4e;
    return 0x343944;
}
const __mw_game_GameScene_js = { GameScene };
