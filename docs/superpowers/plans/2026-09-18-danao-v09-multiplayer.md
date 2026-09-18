# Danao v0.9 Multiplayer and Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Danao v0.9 with reliable local gamepad slot assignment and functional browser online rooms backed by the existing Danao Durable Object service.

**Architecture:** Keep controller normalisation and room protocol logic in pure/browser modules outside the packaged runtime. Patch only the small runtime seams needed for sparse pad indexes, remote input and snapshot authority. Reuse the existing Cloudflare room protocol rather than creating another backend.

**Tech Stack:** JavaScript ES modules, Babylon.js, Rapier, WebSocket, Cloudflare Durable Objects, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-18-danao-v09-multiplayer-design.md`

## Global Constraints

- Local play remains the default and works without room APIs.
- Reconnect tokens never appear in invite URLs.
- Non-host clients do not author combat damage, prop destruction or hazard forces.
- Input traffic is capped at 30 Hz and snapshots at 15 Hz.
- Existing v0.8 AI, controls, fighter stats and Mango Mayhem cast remain unchanged.
- Release packaging stays reproducible through `scripts/assemble-danao-v05.mjs`.

---

### Task 1: Reliable local controller assignment

**Files:** Create `public/games/danao/src/game/controllers.js`; create `tests/danao-v09.test.mjs`; patch packaged runtime through `scripts/danao-v09-runtime-patch.mjs`.

- [ ] Write failing tests for sparse Gamepad arrays, duplicate prevention, keyboard-only fallback and bot fill.
- [ ] Verify RED.
- [ ] Implement `connectedPadIndices(gamepads)` and `localControlPlan(gamepads,totalSlots)`.
- [ ] Patch runtime to use resolved pad indexes instead of assuming indexes 0..N exist.
- [ ] Verify exact assembly and GREEN.

### Task 2: Browser Danao room client

**Files:** Create `public/games/danao/src/online/room-client.js`; extend `tests/danao-v09.test.mjs`.

- [ ] Write failing tests for create/join payloads, same-origin WebSocket URL, token privacy, session reconnect storage and message dispatch.
- [ ] Verify RED.
- [ ] Implement `createDanaoRoomClient()` with dependency-injected fetch/WebSocket/storage for tests.
- [ ] Add bounded `sendInput`, `sendState`, ready/start/leave methods and stale-sequence filtering.
- [ ] Verify GREEN.

### Task 3: Online lobby UI

**Files:** Create `public/games/danao/src/online/lobby.js`, `public/games/danao/src/online/online.css`; modify `public/games/danao/index.html` and `public/games/danao/src/main.js`.

- [ ] Add failing source/UI tests requiring ONLINE PLAY, CREATE ROOM, JOIN ROOM, ROOM CODE and LOCAL PLAY.
- [ ] Mount a compact overlay outside the existing packaged app so local UI remains stable.
- [ ] Map existing fighters and three Babylon arenas to server-compatible room choices.
- [ ] Keep errors recoverable and local play one click away.

### Task 4: Babylon online authority bridge

**Files:** Create `public/games/danao/src/online/match-bridge.js`; patch runtime through `scripts/danao-v09-runtime-patch.mjs`; extend tests.

- [ ] Add failing tests for 30 Hz client input cadence, 15 Hz host snapshot cadence, stale snapshot rejection and host-transfer state restore.
- [ ] Expose runtime hooks for network input, snapshot capture/apply and authority role.
- [ ] Host simulates all slots and consumes forwarded remote inputs.
- [ ] Non-host sends local input, applies snapshots to remote fighters and suppresses non-authoritative damage/hazards/prop destruction.
- [ ] On host change, apply retained snapshot exactly before enabling host authority.
- [ ] Verify GREEN.

### Task 5: Release and live verification

**Files:** Modify `public/games/danao/release.json` and release assertions.

- [ ] Bump release to `0.9.0`.
- [ ] Run exact assembly, Danao syntax checks, full repository tests and repository checks.
- [ ] Review diff for unrelated changes.
- [ ] Merge only after green validation.
- [ ] Verify live create/join room flow in two browser sessions and confirm a host/non-host match can start and exchange state.
