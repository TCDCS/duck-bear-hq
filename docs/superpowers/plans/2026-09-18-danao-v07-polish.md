# Danao v0.7 Visual and Combat Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Danao v0.7 with materially better fighter animation, impact feedback, stage dressing and breakable comedy props while preserving the existing gameplay rules.

**Architecture:** Keep Babylon.js + Rapier and the current runtime structure. Put deterministic animation math in `presentation.js`, consume it in the packaged runtime, keep geometry/effects in packaged `visuals.js`, and keep content/durability data in `arena.js` and `items.js`. Repackage only the authoritative runtime/visual sources used by `assemble-danao-v05.mjs`.

**Tech Stack:** JavaScript ES modules, Babylon.js, Rapier, Node test runner, Cloudflare Worker deployment.

**Spec:** `docs/superpowers/specs/2026-09-18-danao-v07-polish-design.md`

## Global Constraints

- No external art, fonts, audio downloads or paid assets.
- Do not change competitive fighter physics, body scale, HP, damage rules or player speed for cosmetic reasons.
- Mulan remains visually a dog but uses the same competitive physics/hitbox rules as the rest of the cast.
- Temporary impact/debris effects must self-dispose.
- Keep the current controller/keyboard mappings.
- Do not add new arenas, modes, profiles or multiplayer work in this pass.
- Release packaging must remain reproducible through `scripts/assemble-danao-v05.mjs`.

---

### Task 1: Deterministic animation phases

**Files:** Modify `public/games/danao/src/game/presentation.js`; create `tests/danao-v07.test.mjs`.

**Interfaces:** `fighterPose({ now, speed, verticalSpeed, grounded, attackKind, attackUntil, dodgeUntil, hitStunUntil, knockedDownUntil })` keeps existing fields and adds `stride`, `footLift`, `attackWindup`, `attackReach`, `attackRecovery`, `bodyTwist`, `recoil`, `dodgeLean`, `jumpTuck`.

- [ ] Write failing tests for attack phases, locomotion, airborne tuck and hit recoil.
- [ ] Run `node --test tests/danao-v07.test.mjs` and confirm RED.
- [ ] Implement bounded piecewise curves in `fighterPose()`: 35% wind-up, 25% contact, 40% recovery; heavy 250ms, light 155ms, dodge 230ms.
- [ ] Re-run and confirm GREEN.
- [ ] Commit `Danao v0.7 fighter pose phases`.

### Task 2: Use the new pose model in the runtime

**Files:** Modify authoritative packaged runtime source `scripts/danao-v05-gz/runtime.gz`, `scripts/assemble-danao-v05.mjs`, `tests/danao-v05.test.mjs`, `tests/danao-v07.test.mjs`.

- [ ] Add a failing source-contract test requiring runtime use of `verticalSpeed`, `grounded`, `attackWindup`, `attackReach`, `bodyTwist`, `recoil`, `footLift` and `jumpTuck`.
- [ ] Verify RED after assembly.
- [ ] Update `syncVisuals()` to animate lifted feet, airborne knee tuck, attack wind-up/contact/follow-through, dodge lean and hit recoil while preserving floppy knockdown/grab behavior.
- [ ] Re-gzip runtime source and update exact SHA-256 in assembler and tests.
- [ ] Run assembly, syntax and Danao tests; confirm GREEN.
- [ ] Commit `Danao v0.7 animate combat silhouettes`.

### Task 3: Layered hit and destruction effects

**Files:** Modify authoritative packaged visuals `scripts/danao-v05-gz/visuals/*.part`, assembler hashes and Danao tests.

- [ ] Add failing source-contract tests for `impact-burst`, `impact-shard`, `impact-core`, `debris-floor-burst` and disposal.
- [ ] Verify RED.
- [ ] Upgrade light impacts to ring + core + 4 shards; heavy impacts to two rings + larger core + 8 shards + stronger shake.
- [ ] Add tailored debris palettes for baguette, mallet and cone plus a short floor burst.
- [ ] Repackage visuals into base64 gzip parts and update exact hashes.
- [ ] Verify and commit `Danao v0.7 impact and debris pass`.

### Task 4: Breakable comedy props and denser arena dressing

**Files:** Modify `items.js`, `arena.js`, authoritative packaged visuals and `tests/danao-v07.test.mjs`.

- [ ] Add failing tests requiring baguette/mallet/cone breakability, durable pan, extra prop placements and visual markers `courtyard-lantern-string`, `courtyard-drum`, `roof-vent`, `roof-hanging-sign`, `crowd-cheer-arm`.
- [ ] Verify RED.
- [ ] Set baguette 10 HP, foam mallet 22 HP, traffic cone 16 HP; keep pan durable.
- [ ] Add several existing props to Courtyard and Rooftop without changing bounds or spawns.
- [ ] Add low-poly dressing: Hall cheer/sign accents; Courtyard lantern string/drums; Rooftop vents/antenna/hanging-sign depth.
- [ ] Repackage visuals, verify and commit `Danao v0.7 arena and destruction polish`.

### Task 5: Release, full verification and live smoke test

**Files:** Modify `public/games/danao/release.json`, release assertions and feature-branch validation coverage if needed.

- [ ] Bump release metadata to `0.7.0`.
- [ ] Run release assembly, Danao syntax checks, `npm test`, and `npm run check`.
- [ ] Review diff for unrelated changes.
- [ ] Merge through a PR only after green validation.
- [ ] Verify live `release.json` reports `0.7.0`; run a read-only browser smoke test through menu, fighter select and a Wrestling Hall match.
