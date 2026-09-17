# Dǎnào Babylon/Rapier Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Dǎnào's Unity-dependent browser client with a responsive Babylon.js + Rapier 3D arcade-brawler client while preserving the existing Duck & Bear route and Cloudflare backend.

**Architecture:** Keep the Cloudflare Dǎnào multiplayer/profile services unchanged. Move menus and setup into native HTML, run rendering in Babylon.js, run rigid-body simulation in Rapier, and keep game definitions as plain data so arenas/modes can be ported without engine coupling. Leave the Unity source/release path in place as rollback until browser parity is verified.

**Tech Stack:** Browser ES modules, Babylon.js 9.26.2, `@dimforge/rapier3d-compat` 0.20.0, HTML/CSS, Node test runner, existing Cloudflare Worker/Durable Objects/D1.

**Spec:** `docs/superpowers/specs/2026-09-17-danao-babylon-design.md`

## Global Constraints

- Browser-only target at `/games/danao/`.
- Main title remains `打闹` / `Dǎnào`.
- Deliberately colourful cartoon arcade presentation; no photorealistic requirement.
- Existing `/api/danao/*` room/profile backend remains intact during the client migration.
- Fighter health starts at 100 HP.
- Fixed-step Rapier simulation targets 60 Hz with catch-up capped.
- Native DOM menus must work with pointer and keyboard without depending on canvas input.
- Engine versions are pinned: Babylon.js `9.26.2`, Rapier compat `0.20.0`.

---

### Task 1: Native browser shell and migration contract

**Files:**
- Modify: `public/games/danao/index.html`
- Modify: `public/games/danao/danao.css`
- Create: `tests/danao-babylon.test.mjs`

**Interfaces:**
- Produces DOM ids `main-menu`, `local-setup`, `game-hud`, `game-canvas`, `local-play`, `start-local`, `return-menu`, `arena-select`, `character-select`, `mode-select`.

- [ ] **Step 1: Write the failing migration test** checking the new DOM ids, `game.mjs` script, Chinese title and absence of Unity loader startup from `index.html`.
- [ ] **Step 2: Run `node --test tests/danao-babylon.test.mjs` and confirm failure because the new shell is absent.**
- [ ] **Step 3: Replace the Unity-centric page body with native menu/setup/HUD/canvas markup while retaining accessible loading/error text and fullscreen control.**
- [ ] **Step 4: Rework Dǎnào CSS for the menu cards, setup grid, full-screen canvas and HUD; keep `[hidden]{display:none!important}`.**
- [ ] **Step 5: Run the migration test and existing `tests/danao-web.test.mjs`.**

### Task 2: Babylon/Rapier runtime bootstrap

**Files:**
- Create: `public/games/danao/game.mjs`
- Modify: `tests/danao-babylon.test.mjs`
- Modify: `src/game-routes.js`

**Interfaces:**
- `startLocalMatch(config)` starts a match from `{arena,character,mode}`.
- `stopMatch()` destroys Babylon/Rapier state and returns control to DOM menus.
- `initRuntime()` resolves only after Rapier and Babylon are usable.

- [ ] **Step 1: Extend the failing test for pinned Babylon `9.26.2`, Rapier `0.20.0`, `RAPIER.init()`, a `1/60` fixed step and exported/start functions.**
- [ ] **Step 2: Update only the Dǎnào document CSP to permit `https://cdn.jsdelivr.net` modules while preserving same-origin policy elsewhere and `wasm-unsafe-eval` for Rapier.**
- [ ] **Step 3: Implement runtime bootstrap, engine resize, fixed-step accumulator, cleanup, loading and error-state handling.**
- [ ] **Step 4: Run Dǎnào browser/source CSP tests.**

### Task 3: Data catalogs and cartoon arena builder

**Files:**
- Create: `public/games/danao/catalog.mjs`
- Modify: `public/games/danao/game.mjs`
- Modify: `tests/danao-babylon.test.mjs`

**Interfaces:**
- `ARENAS`: eleven definitions with id, name, size, primary, secondary.
- `CHARACTERS`: eight definitions with id, name, body/accent colours.
- `MODES`: eight launch-mode definitions.
- `buildArena(scene,RAPIER,world,definition)` returns `{meshes,bodies,spawnPoints,weaponSpawns,bounds}`.

- [ ] **Step 1: Add failing catalog assertions for all eleven arena names, eight characters and eight modes.**
- [ ] **Step 2: Implement immutable catalogs and populate setup selects from the data.**
- [ ] **Step 3: Build the Wrestling Arena with floor, raised ring, corner posts/ropes and colourful crowd/backdrop primitives; build simplified themed variants for the other ten arenas using the same helpers.**
- [ ] **Step 4: Run the catalog/source tests.**

### Task 4: Fighters, input, combat and HUD

**Files:**
- Create: `public/games/danao/fighter.mjs`
- Modify: `public/games/danao/game.mjs`
- Modify: `public/games/danao/index.html`
- Modify: `tests/danao-babylon.test.mjs`

**Interfaces:**
- `createFighter({scene,RAPIER,world,definition,position,slot})` returns fighter state with `hp=100`, body, meshes, attack cooldown and `applyDamage(amount,impulse)`.
- `readPlayerInput(slot)` returns `{x,z,attack,dash}`.

- [ ] **Step 1: Add failing assertions for `hp:100`, keyboard mappings, Gamepad API polling and attack cooldown.**
- [ ] **Step 2: Implement keyboard state and gamepad polling with graceful controller disconnect.**
- [ ] **Step 3: Implement dynamic locked-rotation Rapier fighter bodies, mesh synchronization and arcade planar movement.**
- [ ] **Step 4: Implement close attack, bounded damage, knockback, hit flash/particle burst and HUD health updates.**
- [ ] **Step 5: Run tests.**

### Task 5: Local round loop and opponent control

**Files:**
- Create: `public/games/danao/bot.mjs`
- Modify: `public/games/danao/game.mjs`
- Modify: `public/games/danao/index.html`
- Modify: `tests/danao-babylon.test.mjs`

**Interfaces:**
- `createBotInput(fighter,target,now)` returns the same input shape as human input.
- A second connected gamepad can claim Player 2; otherwise slot 2 is CPU-controlled.

- [ ] **Step 1: Add failing tests for CPU fallback, round-over message and Return to Menu.**
- [ ] **Step 2: Implement simple seek/attack/spacing bot behavior.**
- [ ] **Step 3: Add round-over state when only one fighter has HP remaining and prevent further damage after finish.**
- [ ] **Step 4: Make Return to Menu fully dispose the engine/world and restore setup without page reload.**
- [ ] **Step 5: Run tests.**

### Task 6: Weapon/prop roster

**Files:**
- Create: `public/games/danao/weapons.mjs`
- Modify: `public/games/danao/game.mjs`
- Modify: `tests/danao-babylon.test.mjs`

**Interfaces:**
- `WEAPONS`: 36 definitions with id, name, class, damage, knockback, shape and colour.
- `spawnWeapons(...)` returns Rapier bodies plus Babylon meshes.

- [ ] **Step 1: Add failing count/category tests for all 36 roster entries.**
- [ ] **Step 2: Port the existing roster names/stat intent into plain data.**
- [ ] **Step 3: Spawn readable procedural weapon shapes at arena spawn points and implement pickup/throw/use for melee and throwable classes.**
- [ ] **Step 4: Run tests and verify no single normal hit exceeds the intended heavy/explosive bounds from the existing Dǎnào design.**

### Task 7: Existing online room/profile bridge

**Files:**
- Create: `public/games/danao/online.mjs`
- Modify: `public/games/danao/game.mjs`
- Modify: `public/games/danao/index.html`
- Test: existing `tests/danao-online*.mjs`, `tests/danao-profile*.mjs`, plus `tests/danao-babylon.test.mjs`

**Interfaces:**
- `createRoom(profile)`, `joinRoom(code,profile)`, `connectRoom(room)` call the existing same-origin `/api/danao/*` endpoints.
- Snapshot/input message schemas remain compatible with the existing Durable Object gateway.

- [ ] **Step 1: Add client contract tests without changing backend schemas.**
- [ ] **Step 2: Implement create/join/ready UI using existing four-digit room codes.**
- [ ] **Step 3: Bridge local fighter input/snapshots to the existing WebSocket protocol.**
- [ ] **Step 4: Preserve host transfer/reconnect behavior already owned by Cloudflare.**
- [ ] **Step 5: Run all Dǎnào online/profile tests.**

### Task 8: Production hardening and Unity retirement

**Files:**
- Modify: `package.json`, `package-lock.json` only if moving engine modules to a self-hosted bundle
- Modify/Delete only after parity: `.github/workflows/danao-*.yml`, `public/games/danao/launcher.mjs`, `public/games/danao/release.json`, Unity-specific release routes
- Modify: `README.md`, `docs/danao-online-cloud.md`

**Interfaces:**
- Production Dǎnào must start without Unity Build Automation or `/game-builds/danao/web/current/*`.

- [ ] **Step 1: Run the complete Dǎnào Node suite plus browser acceptance against the Babylon client.**
- [ ] **Step 2: Self-host/bundle Babylon/Rapier if package-lock/build integration is stable, then remove the temporary external module CSP host.**
- [ ] **Step 3: Remove Unity release automation and R2 game-build serving only after Babylon local and online acceptance passes.**
- [ ] **Step 4: Update release documentation and run the full repository test/check suite.**
