# Danao v1.0 Release Hardening Design

## Goal

Ship Danao 1.0 as a stable, clearly identifiable browser release without changing the established v0.9 gameplay, AI, arena content, Mango Mayhem cast, controls or networking architecture.

## Scope

v1.0 is a hardening release only. It improves four areas:

1. **Release visibility.** The main menu and settings surface the exact semantic version and a short build marker derived from the deployed release metadata so live builds can be identified quickly.
2. **Controller hot-plug resilience.** Local controller assignment reacts safely when pads connect or disconnect during a match. Player 1 always retains keyboard control. A disconnected secondary pad is neutralised immediately and its slot can be reclaimed by a newly connected pad without duplicating a physical controller across players.
3. **Online disconnect recovery.** Online matches never remain in a half-dead state. A socket disconnect, room close or unrecoverable online error stops the bridge cleanly and returns the user to the online lobby with a recoverable status. Local play remains available immediately.
4. **Final performance/cleanup checks.** Temporary match listeners/timers/animation loops are disposed deterministically, duplicate global listeners are prevented, and the release exposes enough runtime diagnostics to catch obvious leaks or stale-match state in tests.

## Constraints

- No new arenas, weapons, modes, profiles or progression systems.
- No combat balance changes.
- No changes to fighter stats, damage values, movement speeds, prop stats or arena bounds.
- Keep the current Babylon.js + Rapier runtime.
- Keep the existing Cloudflare Danao room service and host-authoritative model.
- Do not place reconnect tokens in URLs, UI, logs or build markers.
- Local play must still work if multiplayer APIs are unavailable.
- Player 1 must always retain keyboard control even when no gamepad is present.
- Release packaging must remain reproducible through `scripts/assemble-danao-v05.mjs`.

## Release marker

`release.json` becomes the source for:
- `version`: `1.0.0`
- `build`: a short immutable build identifier for the release commit

The browser loads that metadata once during startup and passes the label into the existing UI. The menu/settings display a compact line such as `v1.0.0 · build abc1234`.

If release metadata cannot be fetched, the game still starts and shows `build unavailable`.

## Controller resilience

A small controller registry tracks the currently connected Gamepad API indexes and maps them to local fighter slots.

Rules:
- slot 0 is always hybrid keyboard + optional first connected pad;
- secondary physical pads fill slots 1–3;
- one physical pad may never control more than one slot;
- a disconnected pad immediately becomes neutral input;
- newly connected pads may claim unassigned local slots during an active local match;
- bots may continue occupying slots that do not have local pads; hot-plug does not silently convert a bot fighter into a human mid-match unless that slot was created as a local controller slot.

The runtime reads the registry every frame instead of relying on the original startup Gamepad array.

## Online recovery

The room client emits structured connection state:
- connected
- reconnecting
- disconnected
- fatal

The match bridge owns match teardown for online sessions. When the socket closes unexpectedly during a fight:
- the runtime is stopped;
- the app exits match presentation;
- the online lobby reopens;
- reconnect credentials remain in session storage;
- the user sees a retry/reconnect action;
- local play is immediately available.

A normal `leave` or page unload does not show a failure error.

If host authority changes, the existing retained-snapshot handoff remains unchanged.

## Cleanup and diagnostics

The runtime and online layers expose lightweight debug counters for tests:
- active global input listeners;
- active render loop state;
- active online bridge subscriptions;
- active online animation frame loop.

Disposal is idempotent. Starting/stopping matches repeatedly must not increase listener/subscription counts.

## Verification

Automated tests cover:
- release/build marker fallback and display;
- controller disconnect/neutralise/reclaim behaviour;
- no duplicate pad assignment;
- online unexpected-close recovery;
- normal leave not treated as failure;
- idempotent teardown and listener/subscription counts;
- exact release assembly/hash contracts;
- `1.0.0` release metadata.

Full Danao CI, full repository tests, repository checks and Worker syntax checks must pass. Production smoke testing must verify:
- live `release.json` reports `1.0.0`;
- menu displays version/build information;
- local match starts after a controller disconnect/reconnect scenario where browser automation permits;
- online create/join still works;
- a forced room exit returns cleanly to a recoverable lobby/local state.
