# Danao v1.0 Release Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Release Danao 1.0 with build visibility, resilient controller hot-plugging, clean online disconnect recovery and verified teardown hygiene.

**Architecture:** Keep v0.9 gameplay/runtime architecture intact. Add release metadata loading in `main.js`, a small controller registry beside `controllers.js`, recoverable connection-state handling in the existing room client/lobby/bridge, and narrow runtime diagnostics for teardown verification. Patch only the packaged App/runtime seams needed for version display and controller lookup.

**Tech Stack:** JavaScript ES modules, Babylon.js, Rapier, WebSocket, Cloudflare Durable Objects, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-18-danao-v10-hardening-design.md`

## Global Constraints

- No new gameplay content or balance changes.
- Keep Babylon.js + Rapier and the existing Cloudflare room backend.
- Local play must remain available when online fails.
- Player 1 always retains keyboard control.
- Reconnect tokens never appear in UI, URLs, logs or build markers.
- Release packaging stays reproducible through `scripts/assemble-danao-v05.mjs`.

---

### Task 1: Release/build marker

**Files:** Modify `public/games/danao/release.json`, `public/games/danao/src/main.js`, packaged App source via a new `scripts/danao-v10-app-patch.mjs`, release hash assertions and `tests/danao-v10.test.mjs`.

- [ ] Write failing tests requiring `version` + `build` metadata and UI hooks `setReleaseLabel` / `releaseLabel`.
- [ ] Confirm RED.
- [ ] Add release metadata loader with fallback `build unavailable`.
- [ ] Patch App menu/settings to render the compact release label.
- [ ] Reassemble and update exact App hash.
- [ ] Confirm GREEN.

### Task 2: Controller hot-plug registry

**Files:** Modify `controllers.js`; patch runtime via `scripts/danao-v10-runtime-patch.mjs`; extend `tests/danao-v10.test.mjs`.

- [ ] Write failing tests for disconnect neutralisation, duplicate prevention and newly connected pad reclamation.
- [ ] Confirm RED.
- [ ] Implement `createControllerRegistry()` with `refresh(gamepads)`, `controlForSlot(slot)` and stable slot ownership.
- [ ] Patch runtime input lookup to refresh the registry each frame and neutralise missing pad indexes.
- [ ] Confirm GREEN.

### Task 3: Online disconnect recovery

**Files:** Modify `room-client.js`, `match-bridge.js`, `lobby.js`, `main.js`; extend tests.

- [ ] Write failing tests for unexpected close → recoverable lobby state and normal leave → no failure.
- [ ] Confirm RED.
- [ ] Add structured connection-state events and distinguish intentional close from failure.
- [ ] Make the bridge stop idempotently on fatal/disconnected state.
- [ ] Reopen online lobby with reconnect action and keep local play available.
- [ ] Confirm GREEN.

### Task 4: Teardown diagnostics

**Files:** Modify runtime patch, match bridge and main loop; extend tests.

- [ ] Write failing tests for idempotent dispose/stop and stable listener/subscription counters after repeated start/stop.
- [ ] Confirm RED.
- [ ] Expose narrow `debugState()` methods without changing gameplay.
- [ ] Ensure global listeners, bridge subscriptions and animation-frame loop are installed once and removed once.
- [ ] Confirm GREEN.

### Task 5: Release and production verification

**Files:** Finalise `release.json` as `1.0.0`; update release assertions.

- [ ] Run exact assembly, syntax checks, Danao tests, full repository tests and repository checks.
- [ ] Review diff for unrelated changes.
- [ ] Merge only after green validation.
- [ ] Verify public `release.json` and visible menu build marker.
- [ ] Verify local play still starts.
- [ ] Verify production create/join room flow and recoverable exit to lobby/local play.
