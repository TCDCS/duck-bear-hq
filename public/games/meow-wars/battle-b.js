/* GameScene methods createTerrainTexture…updateHumanInput */
GameScene.prototype.createTerrainTexture = function() {
        if (this.textures.exists('terrain-live'))
            this.textures.remove('terrain-live');
        this.terrainTexture = this.textures.createCanvas('terrain-live', WIDTH, HEIGHT);
        this.paintTerrainTexture();
        this.terrainImage = this.add.image(0, 0, 'terrain-live').setOrigin(0, 0).setDepth(1);
    };

GameScene.prototype.paintTerrainTexture = function() {
        const texture = this.terrainTexture;
        const ctx = texture.getContext();
        ctx.clearRect(0, 0, WIDTH, HEIGHT);
        const { rows, cols, cellSize, data } = this.terrain;
        for (let cy = 0; cy < rows; cy += 1) {
            const ratio = cy / rows;
            ctx.fillStyle = ratio < 0.72 ? this.arena.palette.terrainTop : ratio < 0.84 ? shadeHex(this.arena.palette.terrainTop, -18) : this.arena.palette.terrainDeep;
            let start = -1;
            for (let cx = 0; cx <= cols; cx += 1) {
                const solid = cx < cols && data[cy * cols + cx] === 1;
                if (solid && start < 0)
                    start = cx;
                if ((!solid || cx === cols) && start >= 0) {
                    ctx.fillRect(start * cellSize, cy * cellSize, (cx - start) * cellSize, cellSize + 0.5);
                    start = -1;
                }
            }
        }
        ctx.fillStyle = shadeHex(this.arena.palette.grass, -24);
        for (let cx = 0; cx < cols; cx += 1) {
            const x = cx * cellSize;
            const y = surfaceY(this.terrain, x);
            if (y < HEIGHT)
                ctx.fillRect(x, y + 6, cellSize + 0.5, 5);
        }
        ctx.fillStyle = this.arena.palette.grass;
        for (let cx = 0; cx < cols; cx += 1) {
            const x = cx * cellSize;
            const y = surfaceY(this.terrain, x);
            if (y < HEIGHT) {
                ctx.fillRect(x, y, cellSize + 0.5, 7);
                if ((cx * 17 + this.arena.seed) % 11 === 0)
                    ctx.fillRect(x, y - 3, 2, 4);
            }
        }
        const rock = this.arena.id === 'garden-siege' ? '#a97b5b' : this.arena.id === 'rooftop-rumble' ? '#7f8493' : '#9a7657';
        ctx.fillStyle = rock;
        for (let cy = 0; cy < rows; cy += 1) {
            for (let cx = 0; cx < cols; cx += 1) {
                if (data[cy * cols + cx] !== 1)
                    continue;
                const hash = (cx * 31 + cy * 47 + this.arena.seed) % 257;
                if (hash === 0 && cy * cellSize > surfaceY(this.terrain, cx * cellSize) + 15)
                    ctx.fillRect(cx * cellSize, cy * cellSize, 5, 3);
            }
        }
        texture.refresh();
    };

GameScene.prototype.spawnCats = function() {
        const spawns = this.arena.spawnFractions.map((fraction) => fraction * WIDTH);
        for (let i = 0; i < 3; i += 1) {
            this.cats.push(this.makeCat(`blue-${i + 1}`, 0, this.blueSquad.memberIds[i], spawns[i]));
            this.cats.push(this.makeCat(`red-${i + 1}`, 1, this.redSquad.memberIds[i], spawns[i + 3]));
        }
    };

GameScene.prototype.makeCat = function(id, team, presetId, x) {
        const preset = getCatPreset(presetId);
        const y = surfaceY(this.terrain, x) - CAT_FOOT;
        const sprite = this.add.image(x, y, catTextureKey(team, presetId)).setDepth(12).setScale(CAT_TEXTURE_DISPLAY_SCALE);
        return { id, team, name: preset.name, presetId, x, y, vx: 0, vy: 0, health: 100, alive: true, sprite };
    };

GameScene.prototype.resetAmmo = function() {
        this.teamAmmo = [new Map(), new Map()];
        for (const weapon of WEAPONS) {
            this.teamAmmo[0].set(weapon.id, weapon.ammo);
            this.teamAmmo[1].set(weapon.id, weapon.ammo);
        }
    };

GameScene.prototype.registerInput = function() {
        if (!this.input.keyboard)
            return;
        this.keys = this.input.keyboard.addKeys({
            left: 'A', right: 'D', up: 'W', down: 'S', fire: 'SPACE', prev: 'Q', next: 'E', pause: 'ESC', restart: 'R', menu: 'M'
        });
        this.input.keyboard.on('keydown', (event) => {
            if (this.gameOver || this.actionLocked || this.isCpuTurn())
                return;
            if (event.code.startsWith('Digit')) {
                const digit = Number(event.code.slice(5));
                if (digit >= 1 && digit <= 9)
                    this.selectWeaponByIndex(digit - 1);
            }
        });
    };

GameScene.prototype.startTurn = function(initial = false) {
        if (this.gameOver)
            return;
        const active = this.activeCat();
        if (!active.alive && !initial) {
            const next = this.turns.advance((id) => this.catById(id)?.alive ?? false);
            if (!next)
                return;
        }
        this.turnRemainingMs = TURN_MS;
        this.actionLocked = false;
        this.chargePower = 0.36;
        this.aimAngleDeg = 42;
        this.wind = Math.round((Math.random() * 2 - 1) * 20 * this.arena.windMultiplier);
        const current = this.activeCat();
        this.facing = current.team === 0 ? 1 : -1;
        this.lastFire = false;
        this.lastPrev = false;
        this.lastNext = false;
        this.lastLoggedMoveX = current.x;
        this.lastLoggedAim = this.aimAngleDeg;
        this.showTurnBanner(current);
        this.cpuToken += 1;
        if (this.isCpuTurn()) {
            const token = this.cpuToken;
            this.time.delayedCall(750, () => {
                if (token === this.cpuToken && !this.gameOver && !this.actionLocked)
                    this.performCpuTurn();
            });
        }
    };

GameScene.prototype.endTurn = function(reason = 'fired') {
        if (this.gameOver)
            return;
        const outgoing = this.activeCat();
        this.actionLog.append(this.turnNumber, { type: 'end-turn', actorId: outgoing.id, reason });
        this.actionLocked = false;
        this.chargePower = 0.36;
        const next = this.turns.advance((id) => this.catById(id)?.alive ?? false);
        if (!next) {
            this.checkWin();
            return;
        }
        this.turnNumber += 1;
        this.startTurn();
    };

GameScene.prototype.updateHumanInput = function(dtMs) {
        const active = this.activeCat();
        if (!active.alive)
            return;
        const pad = this.getGamepad();
        const axisX = pad?.axes?.length ? pad.axes[0].getValue?.() ?? pad.axes[0].value ?? 0 : 0;
        const axisY = pad?.axes?.length > 1 ? pad.axes[1].getValue?.() ?? pad.axes[1].value ?? 0 : 0;
        const left = !!this.keys.left?.isDown || axisX < -0.3;
        const right = !!this.keys.right?.isDown || axisX > 0.3;
        const up = !!this.keys.up?.isDown || axisY < -0.35;
        const down = !!this.keys.down?.isDown || axisY > 0.35;
        const fireDown = !!this.keys.fire?.isDown || !!pad?.buttons?.[0]?.pressed;
        const prevDown = !!this.keys.prev?.isDown || !!pad?.buttons?.[4]?.pressed;
        const nextDown = !!this.keys.next?.isDown || !!pad?.buttons?.[5]?.pressed;
        const dt = dtMs / 1000;
        if (left !== right) {
            const direction = left ? -1 : 1;
            this.facing = direction;
            const nextX = clamp(active.x + direction * 92 * dt, 28, WIDTH - 28);
            const nextSurface = surfaceY(this.terrain, nextX);
            if (nextSurface < HEIGHT) {
                active.x = nextX;
                if (active.vy === 0)
                    active.y = nextSurface - CAT_FOOT;
                if (Math.abs(active.x - this.lastLoggedMoveX) >= 12) {
                    this.actionLog.append(this.turnNumber, { type: 'move', actorId: active.id, x: Math.round(active.x * 10) / 10, facing: this.facing });
                    this.lastLoggedMoveX = active.x;
                }
            }
        }
        if (up)
            this.aimAngleDeg = clamp(this.aimAngleDeg + 52 * dt, 8, 82);
        if (down)
            this.aimAngleDeg = clamp(this.aimAngleDeg - 52 * dt, 8, 82);
        if (Math.abs(this.aimAngleDeg - this.lastLoggedAim) >= 3) {
            this.actionLog.append(this.turnNumber, { type: 'aim', actorId: active.id, angleDeg: Math.round(this.aimAngleDeg * 10) / 10, facing: this.facing });
            this.lastLoggedAim = this.aimAngleDeg;
        }
        if (prevDown && !this.lastPrev)
            this.cycleWeapon(-1);
        if (nextDown && !this.lastNext)
            this.cycleWeapon(1);
        this.lastPrev = prevDown;
        this.lastNext = nextDown;
        if (fireDown) {
            this.chargePower = clamp(this.chargePower + dtMs * 0.00055, 0.36, 1);
        }
        else if (this.lastFire) {
            this.fireCurrentWeapon();
        }
        this.lastFire = fireDown;
    };

/* GameScene methods handlePauseInput…fireLaser */
GameScene.prototype.handlePauseInput = function() {
        const pauseDown = !!this.keys.pause?.isDown;
        if (pauseDown && !this.lastPause) {
            this.paused = !this.paused;
            if (this.paused) {
                this.add.text(640, 310, 'PAUSED', {
                    fontFamily: 'Arial Black, Arial', fontSize: '58px', color: '#ffffff', stroke: '#172038', strokeThickness: 8
                }).setOrigin(0.5).setDepth(300).setName('pause-label');
            }
            else {
                this.children.getByName('pause-label')?.destroy();
            }
        }
        this.lastPause = pauseDown;
    };

GameScene.prototype.handleRestartInput = function() {
        if (this.keys.restart?.isDown)
            this.scene.restart({ mode: this.mode, arenaId: this.arena.id, blueSquadId: this.blueSquad.id, redSquadId: this.redSquad.id });
        if (this.keys.menu?.isDown)
            this.scene.start('MenuScene');
    };

GameScene.prototype.getGamepad = function() {
        const pads = this.input.gamepad?.gamepads;
        if (!pads)
            return null;
        return pads.find((pad) => !!pad) ?? null;
    };

GameScene.prototype.cycleWeapon = function(direction) {
        const team = this.activeCat().team;
        for (let checked = 0; checked < WEAPONS.length; checked += 1) {
            this.selectedWeaponIndex = (this.selectedWeaponIndex + direction + WEAPONS.length) % WEAPONS.length;
            const weapon = WEAPONS[this.selectedWeaponIndex];
            if ((this.teamAmmo[team].get(weapon.id) ?? 0) !== 0)
                break;
        }
        const active = this.activeCat();
        const weapon = WEAPONS[this.selectedWeaponIndex];
        this.actionLog.append(this.turnNumber, { type: 'select-weapon', actorId: active.id, weaponId: weapon.id });
        this.sfx.click();
    };

GameScene.prototype.selectWeaponById = function(id) {
        const index = WEAPONS.findIndex((weapon) => weapon.id === id);
        if (index >= 0)
            this.selectWeaponByIndex(index);
    };

GameScene.prototype.selectWeaponByIndex = function(index) {
        const weapon = WEAPONS[index];
        if (!weapon)
            return;
        const ammo = this.teamAmmo[this.activeCat().team].get(weapon.id) ?? 0;
        if (ammo === 0)
            return;
        this.selectedWeaponIndex = index;
        const active = this.activeCat();
        this.actionLog.append(this.turnNumber, { type: 'select-weapon', actorId: active.id, weaponId: weapon.id });
        this.sfx.click();
    };

GameScene.prototype.fireCurrentWeapon = function() {
        if (this.actionLocked || this.gameOver)
            return;
        const shooter = this.activeCat();
        if (!shooter.alive)
            return;
        const weapon = WEAPONS[this.selectedWeaponIndex];
        if (!supportsBehaviour(weapon.behaviour))
            throw new Error(`Unsupported weapon behaviour: ${weapon.behaviour}`);
        const ammo = this.teamAmmo[shooter.team].get(weapon.id) ?? 0;
        if (ammo === 0)
            return;
        if (ammo !== Infinity)
            this.teamAmmo[shooter.team].set(weapon.id, Math.max(0, ammo - 1));
        this.actionLog.append(this.turnNumber, {
            type: 'fire', actorId: shooter.id, weaponId: weapon.id,
            angleDeg: Math.round(this.aimAngleDeg * 10) / 10,
            power: Math.round(this.chargePower * 1000) / 1000,
            facing: this.facing
        });
        this.muzzleFx(shooter, weapon);
        this.actionLocked = true;
        this.resolutionEarliest = this.time.now + 650;
        this.resolutionDeadline = this.time.now + 8000;
        switch (weapon.behaviour) {
            case 'hitscan':
                this.fireHitscan(shooter, weapon, [0]);
                break;
            case 'spread':
                this.fireHitscan(shooter, weapon, weapon.id === 'shotgun' ? [-8, -5, -2, 2, 5, 8] : [-2.5, 0, 2.5]);
                break;
            case 'projectile':
            case 'lobbed':
                this.fireProjectile(shooter, weapon);
                break;
            case 'deploy':
                this.placeDeployable(shooter, weapon);
                break;
            case 'airstrike':
                this.fireAirstrike(shooter, weapon);
                break;
            case 'ground-runner':
                this.fireRunner(shooter, weapon);
                break;
            case 'laser':
                this.fireLaser(shooter, weapon);
                break;
        }
        this.chargePower = 0.36;
    };

GameScene.prototype.fireHitscan = function(shooter, weapon, offsets) {
        this.sfx.shot(weapon.id === 'sniper' ? 'sniper' : 'gun');
        for (const offset of offsets) {
            const angle = (this.aimAngleDeg + offset) * Math.PI / 180;
            const dx = Math.cos(angle) * this.facing;
            const dy = -Math.sin(angle);
            const hit = this.raycast(shooter.x, shooter.y - 4, dx, dy, weapon.id === 'sniper' ? 1180 : 760, shooter.id);
            this.drawTracer(shooter.x, shooter.y - 4, hit.x, hit.y, weapon.id === 'sniper' ? 0xfff4a3 : 0xffffff);
            if (hit.cat) {
                const damage = weapon.damage;
                this.damageCat(hit.cat, damage, dx * damage * 1.3, dy * damage * 0.9);
            }
        }
    };

GameScene.prototype.fireProjectile = function(shooter, weapon) {
        this.sfx.shot(weapon.family === 'cat' ? 'laser' : 'gun');
        const angle = this.aimAngleDeg * Math.PI / 180;
        const speed = weapon.projectileSpeed * (0.65 + this.chargePower * 0.55);
        const x = shooter.x + this.facing * 30;
        const y = shooter.y - 9;
        const color = projectileColor(weapon.id);
        const radius = weapon.id === 'fish-launcher' ? 9 : weapon.id.includes('yarn') ? 8 : 6;
        const object = this.add.circle(x, y, radius, color, 1).setDepth(20);
        object.setStrokeStyle?.(2, 0x1b2436, 0.5);
        this.projectiles.push({
            object, weapon, ownerId: shooter.id, team: shooter.team, x, y,
            vx: Math.cos(angle) * this.facing * speed,
            vy: -Math.sin(angle) * speed,
            fuseMs: weapon.behaviour === 'lobbed' ? (weapon.fuseMs ?? 2400) : null,
            ageMs: 0
        });
    };

GameScene.prototype.placeDeployable = function(shooter, weapon) {
        const x = clamp(shooter.x + this.facing * 28, 10, WIDTH - 10);
        const y = surfaceY(this.terrain, x) - 8;
        const color = weapon.id === 'mine' ? 0x2a2d32 : 0xe33a35;
        const object = weapon.id === 'mine'
            ? this.add.circle(x, y, 8, color, 1).setDepth(11)
            : this.add.rectangle(x, y, 13, 18, color, 1).setDepth(11);
        this.deployables.push({
            object, weapon, ownerId: shooter.id, team: shooter.team, x, y,
            armedMs: weapon.id === 'mine' ? 700 : 0,
            fuseMs: weapon.id === 'dynamite' ? (weapon.fuseMs ?? 3000) : null
        });
        this.sfx.click();
    };

GameScene.prototype.fireAirstrike = function(shooter, weapon) {
        const targetX = this.targetX(shooter);
        this.sfx.shot('gun');
        for (let i = 0; i < 5; i += 1) {
            this.time.delayedCall(i * 120, () => {
                if (this.gameOver)
                    return;
                const x = clamp(targetX - 100 + i * 50, 20, WIDTH - 20);
                const y = -18 - i * 8;
                const object = this.add.circle(x, y, 6, 0x2e333b, 1).setDepth(20);
                this.projectiles.push({ object, weapon, ownerId: shooter.id, team: shooter.team, x, y, vx: 25 * this.facing, vy: 230, fuseMs: null, ageMs: 0 });
            });
        }
    };

GameScene.prototype.fireRunner = function(shooter, weapon) {
        const x = clamp(shooter.x + this.facing * 30, 12, WIDTH - 12);
        const y = surfaceY(this.terrain, x) - 8;
        const object = weapon.id === 'roomba-ride'
            ? this.add.rectangle(x, y, 24, 10, 0x303640, 1).setDepth(12)
            : this.add.ellipse(x, y, 18, 10, 0xb4a29a, 1).setDepth(12);
        this.runners.push({ object, weapon, ownerId: shooter.id, team: shooter.team, x, y, direction: this.facing, ageMs: 0 });
        this.sfx.meow();
    };

GameScene.prototype.fireLaser = function(shooter, weapon) {
        const x = this.targetX(shooter);
        const y = surfaceY(this.terrain, x);
        const beam = this.add.rectangle(x, y / 2, 7, Math.max(10, y), 0xff2b45, 0.85).setDepth(25);
        this.sfx.shot('laser');
        this.tweens.add({ targets: beam, alpha: 0, duration: 360, onComplete: () => beam.destroy() });
        this.time.delayedCall(150, () => this.explode(x, y, weapon, shooter.id));
    };

