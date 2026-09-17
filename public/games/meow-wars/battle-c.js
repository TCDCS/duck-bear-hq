/* GameScene methods targetX…explode */
GameScene.prototype.targetX = function(shooter) {
        const pointerX = this.input.activePointer?.worldX;
        if (typeof pointerX === 'number' && pointerX >= 0 && pointerX <= WIDTH && this.input.activePointer.y < 610) {
            return pointerX;
        }
        return clamp(shooter.x + this.facing * 300, 30, WIDTH - 30);
    };

GameScene.prototype.updateProjectiles = function(dtMs) {
        const dt = dtMs / 1000;
        for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
            const projectile = this.projectiles[i];
            projectile.ageMs += dtMs;
            if (projectile.fuseMs !== null)
                projectile.fuseMs -= dtMs;
            const next = stepProjectile(projectile, dt, GRAVITY, this.wind * 5, projectile.weapon.windFactor);
            projectile.x = next.x;
            projectile.y = next.y;
            projectile.vx = next.vx;
            projectile.vy = next.vy;
            projectile.object.setPosition(projectile.x, projectile.y);
            if (projectile.object.rotation !== undefined)
                projectile.object.rotation = Math.atan2(projectile.vy, projectile.vx);
            if (projectile.fuseMs !== null && projectile.fuseMs <= 0) {
                this.explodeProjectile(i);
                continue;
            }
            const directCat = this.cats.find((cat) => cat.alive && cat.id !== projectile.ownerId && Math.hypot(cat.x - projectile.x, cat.y - projectile.y) < 20);
            if (directCat && projectile.weapon.behaviour !== 'lobbed') {
                this.explodeProjectile(i);
                continue;
            }
            if (isSolidWorld(this.terrain, projectile.x, projectile.y + 3)) {
                if (projectile.weapon.behaviour === 'lobbed' && projectile.fuseMs !== null && projectile.fuseMs > 80) {
                    const groundY = surfaceY(this.terrain, projectile.x);
                    projectile.y = Math.min(projectile.y, groundY - 7);
                    projectile.vy = -Math.abs(projectile.vy) * 0.48;
                    projectile.vx *= 0.72;
                    projectile.object.setPosition(projectile.x, projectile.y);
                }
                else {
                    this.explodeProjectile(i);
                }
                continue;
            }
            if (projectile.x < -60 || projectile.x > WIDTH + 60 || projectile.y > HEIGHT + 100 || projectile.ageMs > 9000) {
                projectile.object.destroy();
                this.projectiles.splice(i, 1);
            }
        }
    };

GameScene.prototype.explodeProjectile = function(index) {
        const projectile = this.projectiles[index];
        if (!projectile)
            return;
        projectile.object.destroy();
        this.projectiles.splice(index, 1);
        this.explode(projectile.x, projectile.y, projectile.weapon, projectile.ownerId);
    };

GameScene.prototype.updateDeployables = function(dtMs) {
        for (let i = this.deployables.length - 1; i >= 0; i -= 1) {
            const item = this.deployables[i];
            item.armedMs = Math.max(0, item.armedMs - dtMs);
            if (item.fuseMs !== null)
                item.fuseMs -= dtMs;
            item.y = surfaceY(this.terrain, item.x) - 8;
            item.object.setPosition(item.x, item.y);
            if (item.fuseMs !== null && item.fuseMs <= 0) {
                item.object.destroy();
                this.deployables.splice(i, 1);
                this.explode(item.x, item.y, item.weapon, item.ownerId);
                continue;
            }
            if (item.weapon.id === 'mine' && item.armedMs <= 0) {
                const enemy = this.cats.find((cat) => cat.alive && cat.team !== item.team && Math.hypot(cat.x - item.x, cat.y - item.y) < 42);
                if (enemy) {
                    item.object.destroy();
                    this.deployables.splice(i, 1);
                    this.explode(item.x, item.y, item.weapon, item.ownerId);
                }
            }
        }
    };

GameScene.prototype.updateRunners = function(dtMs) {
        const dt = dtMs / 1000;
        for (let i = this.runners.length - 1; i >= 0; i -= 1) {
            const runner = this.runners[i];
            runner.ageMs += dtMs;
            runner.x += runner.direction * runner.weapon.projectileSpeed * dt;
            runner.y = surfaceY(this.terrain, runner.x) - 8;
            runner.object.setPosition(runner.x, runner.y);
            const enemy = this.cats.find((cat) => cat.alive && cat.team !== runner.team && Math.hypot(cat.x - runner.x, cat.y - runner.y) < 38);
            if (enemy || runner.x < 8 || runner.x > WIDTH - 8 || runner.ageMs > 5500 || runner.y >= HEIGHT - 5) {
                runner.object.destroy();
                this.runners.splice(i, 1);
                this.explode(clamp(runner.x, 0, WIDTH), clamp(runner.y, 0, HEIGHT), runner.weapon, runner.ownerId);
            }
        }
    };

GameScene.prototype.updateCatPhysics = function(dt) {
        for (const cat of this.cats) {
            if (!cat.alive)
                continue;
            cat.vx *= Math.pow(0.08, dt);
            cat.x = clamp(cat.x + cat.vx * dt, 12, WIDTH - 12);
            const belowSolid = isSolidWorld(this.terrain, cat.x, cat.y + CAT_FOOT + 2);
            if (!belowSolid || cat.vy < 0) {
                cat.vy += GRAVITY * dt;
                cat.y += cat.vy * dt;
            }
            const groundY = surfaceY(this.terrain, cat.x);
            if (cat.vy >= 0 && groundY < HEIGHT && cat.y + CAT_FOOT >= groundY) {
                cat.y = groundY - CAT_FOOT;
                cat.vy = 0;
            }
            if (cat.y > HEIGHT + 80) {
                cat.health = 0;
                cat.alive = false;
                cat.sprite.setAlpha(0.2);
            }
        }
    };

GameScene.prototype.raycast = function(x, y, dx, dy, maxDistance, ownerId) {
        let lastX = x;
        let lastY = y;
        for (let distance = 6; distance <= maxDistance; distance += 6) {
            const px = x + dx * distance;
            const py = y + dy * distance;
            lastX = px;
            lastY = py;
            if (px < 0 || px > WIDTH || py < 0 || py > HEIGHT)
                break;
            const cat = this.cats.find((candidate) => candidate.alive && candidate.id !== ownerId && Math.hypot(candidate.x - px, candidate.y - py) <= 22);
            if (cat)
                return { x: px, y: py, cat };
            if (isSolidWorld(this.terrain, px, py))
                return { x: px, y: py, cat: null };
        }
        return { x: lastX, y: lastY, cat: null };
    };

GameScene.prototype.drawTracer = function(x1, y1, x2, y2, color) {
        const tracer = this.add.graphics().setDepth(24);
        tracer.lineStyle(3, color, 0.95);
        tracer.beginPath();
        tracer.moveTo(x1, y1);
        tracer.lineTo(x2, y2);
        tracer.strokePath();
        this.tweens.add({ targets: tracer, alpha: 0, duration: 240, onComplete: () => tracer.destroy() });
    };

GameScene.prototype.explode = function(x, y, weapon, ownerId) {
        if (weapon.blastRadius <= 0)
            return;
        const craterRadius = weapon.blastRadius * 0.82 * (weapon.craterScale ?? 1);
        carveCircle(this.terrain, x, y, craterRadius);
        this.paintTerrainTexture();
        this.sfx.explosion(clamp(weapon.blastRadius / 60, 0.7, 1.5));
        this.cameras.main.shake(150 + weapon.blastRadius * 1.2, 0.004 + weapon.blastRadius / 30000);
        this.explosionFx(x, y, weapon);
        for (const cat of this.cats) {
            if (!cat.alive)
                continue;
            const distance = Math.hypot(cat.x - x, cat.y - y);
            const damage = radialDamage(weapon.damage, weapon.blastRadius, distance);
            if (damage <= 0)
                continue;
            const safeDistance = Math.max(10, distance);
            const push = damage * 5.1;
            this.damageCat(cat, damage, ((cat.x - x) / safeDistance) * push, ((cat.y - y) / safeDistance) * push - damage * 3.4);
        }
        const owner = this.catById(ownerId);
        if (owner?.alive && weapon.family === 'cat' && Math.random() < 0.35)
            this.sfx.meow();
    };

/* GameScene methods damageCat…drawAim */
GameScene.prototype.damageCat = function(cat, damage, impulseX, impulseY) {
        const applied = Math.min(cat.health, damage);
        if (applied > 0.4)
            this.floatingDamage(cat.x, cat.y - 34, applied);
        cat.health = Math.max(0, cat.health - damage);
        cat.vx += impulseX;
        cat.vy += impulseY;
        cat.sprite.setTintFill?.(0xffffff);
        this.time.delayedCall(90, () => cat.sprite.clearTint?.());
        this.tweens.add({ targets: cat.sprite, scaleX: 1.14, scaleY: 0.93, duration: 70, yoyo: true });
        if (cat.health <= 0) {
            cat.alive = false;
            cat.sprite.setAlpha(0.42);
            cat.sprite.setAngle?.(18);
            const poof = this.add.text(cat.x, cat.y - 42, '☁', { fontSize: '30px', color: '#ffffff' }).setOrigin(0.5).setDepth(60);
            this.tweens.add({ targets: poof, y: poof.y - 30, alpha: 0, scale: 1.5, duration: 650, onComplete: () => poof.destroy() });
        }
    };

GameScene.prototype.floatingDamage = function(x, y, damage) {
        const amount = Math.max(1, Math.round(damage));
        const text = this.add.text(x, y, `-${amount}`, {
            fontFamily: 'Arial Black, Arial', fontSize: amount >= 50 ? '24px' : '19px',
            color: amount >= 50 ? '#ffe36e' : '#ffffff', stroke: '#3b1c25', strokeThickness: 5
        }).setOrigin(0.5).setDepth(70);
        this.tweens.add({ targets: text, y: y - 44, alpha: 0, scale: 1.12, duration: 760, ease: 'Cubic.Out', onComplete: () => text.destroy() });
    };

GameScene.prototype.explosionFx = function(x, y, weapon) {
        const colors = weapon.family === 'cat' ? [0xffd95a, 0xff6c91, 0x76e0ff] : [0xffe36e, 0xff8a45, 0xd84432];
        const flash = this.add.circle(x, y, Math.max(12, weapon.blastRadius * 0.45), 0xffffff, 0.88).setDepth(41);
        const ring = this.add.circle(x, y, Math.max(9, weapon.blastRadius * 0.35), colors[0], 0).setDepth(40);
        ring.setStrokeStyle?.(5, colors[0], 0.95);
        this.tweens.add({ targets: flash, alpha: 0, scale: 1.8, duration: 180, onComplete: () => flash.destroy() });
        this.tweens.add({ targets: ring, alpha: 0, scale: 2.8, duration: 430, ease: 'Cubic.Out', onComplete: () => ring.destroy() });
        const particles = 22 + Math.min(14, Math.floor(weapon.blastRadius / 6));
        for (let i = 0; i < particles; i += 1) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 18 + Math.random() * weapon.blastRadius * 1.05;
            const dot = this.add.circle(x, y, 2.5 + Math.random() * 6.5, colors[i % colors.length], 0.98).setDepth(40);
            this.tweens.add({
                targets: dot,
                x: x + Math.cos(angle) * distance,
                y: y + Math.sin(angle) * distance + 18,
                alpha: 0,
                scale: 0.15,
                duration: 320 + Math.random() * 300,
                ease: 'Cubic.Out',
                onComplete: () => dot.destroy()
            });
        }
    };

GameScene.prototype.muzzleFx = function(shooter, weapon) {
        const x = shooter.x + this.facing * 29;
        const y = shooter.y - 9;
        const color = weapon.family === 'cat' ? 0xff74c8 : 0xffe19a;
        const flash = this.add.circle(x, y, weapon.id === 'sniper' ? 8 : 6, color, 0.95).setDepth(32);
        this.tweens.add({ targets: flash, alpha: 0, scale: 2.2, duration: 110, onComplete: () => flash.destroy() });
    };

GameScene.prototype.showTurnBanner = function(cat) {
        const teamName = cat.team === 0 ? this.blueSquad.name : this.redSquad.name;
        const color = cat.team === 0 ? 0x3478d6 : 0xc94768;
        const back = this.add.rectangle(640, 92, 420, 52, 0x111522, 0.9).setDepth(180).setAlpha(0);
        back.setStrokeStyle?.(3, color, 0.9);
        const label = this.add.text(640, 92, `${teamName.toUpperCase()}  •  ${cat.name.toUpperCase()}`, {
            fontFamily: 'Arial Black, Arial', fontSize: '18px', color: '#ffffff'
        }).setOrigin(0.5).setDepth(181).setAlpha(0);
        this.tweens.add({ targets: [back, label], alpha: 1, duration: 130, yoyo: true, hold: 650, onComplete: () => { back.destroy(); label.destroy(); } });
    };

GameScene.prototype.updateActionResolution = function() {
        const transientDeployables = this.deployables.some((item) => item.weapon.id === 'dynamite');
        const hasTransient = this.projectiles.length > 0 || this.runners.length > 0 || transientDeployables;
        if ((!hasTransient && this.time.now >= this.resolutionEarliest) || this.time.now >= this.resolutionDeadline) {
            this.endTurn('fired');
        }
    };

GameScene.prototype.performCpuTurn = function() {
        const shooter = this.activeCat();
        if (!shooter.alive || !this.isCpuTurn())
            return;
        try {
            const shot = chooseCpuShot(shooter, this.cats, this.wind);
            const preferred = getWeapon(shot.weaponId);
            const ammo = this.teamAmmo[shooter.team].get(preferred.id) ?? 0;
            const selectedId = ammo === 0 ? 'bazooka' : preferred.id;
            this.selectWeaponById(selectedId);
            this.facing = shot.direction;
            const selected = getWeapon(selectedId);
            const target = this.catById(shot.targetId);
            if (target && (selected.behaviour === 'hitscan' || selected.behaviour === 'spread')) {
                const directAngle = Math.atan2(shooter.y - target.y, Math.max(1, Math.abs(target.x - shooter.x))) * 180 / Math.PI;
                this.aimAngleDeg = clamp(directAngle + (selected.id === 'shotgun' ? 1.5 : 0), -32, 78);
            }
            else {
                this.aimAngleDeg = shot.angleDeg;
            }
            this.chargePower = shot.power;
            this.time.delayedCall(500, () => {
                if (!this.gameOver && !this.actionLocked && this.isCpuTurn())
                    this.fireCurrentWeapon();
            });
        }
        catch {
            this.endTurn('skip');
        }
    };

GameScene.prototype.syncSprites = function() {
        for (const cat of this.cats)
            cat.sprite.setPosition(cat.x, cat.y);
    };

GameScene.prototype.drawAim = function() {
        this.aimGraphics.clear();
        if (this.gameOver || this.actionLocked || this.isCpuTurn())
            return;
        const cat = this.activeCat();
        if (!cat.alive)
            return;
        const weapon = WEAPONS[this.selectedWeaponIndex];
        const angle = this.aimAngleDeg * Math.PI / 180;
        const originX = cat.x + this.facing * 18;
        const originY = cat.y - 10;
        if (weapon.behaviour === 'projectile' || weapon.behaviour === 'lobbed') {
            const speed = weapon.projectileSpeed * (0.48 + this.chargePower * 0.72);
            let x = originX;
            let y = originY;
            let vx = Math.cos(angle) * this.facing * speed;
            let vy = -Math.sin(angle) * speed;
            this.aimGraphics.fillStyle(0xffffff, 0.86);
            for (let i = 0; i < 13; i += 1) {
                const dt = 0.08;
                vx += this.wind * weapon.windFactor * dt;
                vy += GRAVITY * dt;
                x += vx * dt;
                y += vy * dt;
                const radius = i === 12 ? 4 : 2.3;
                this.aimGraphics.fillCircle(x, y, radius);
                if (x < 0 || x > WIDTH || y > HEIGHT)
                    break;
            }
            return;
        }
        const length = 78 + this.chargePower * 54;
        const x2 = cat.x + Math.cos(angle) * this.facing * length;
        const y2 = cat.y - 8 - Math.sin(angle) * length;
        this.aimGraphics.lineStyle(3, weapon.behaviour === 'laser' ? 0xff5dcf : 0xffffff, 0.92);
        this.aimGraphics.beginPath();
        this.aimGraphics.moveTo(originX, originY);
        this.aimGraphics.lineTo(x2, y2);
        this.aimGraphics.strokePath();
        this.aimGraphics.fillStyle(0xffe36e, 1);
        this.aimGraphics.fillCircle(x2, y2, 4);
    };
