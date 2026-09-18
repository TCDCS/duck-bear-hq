# Danao v0.9 Multiplayer and Reliability Design

## Goal

Make Danao's browser build reliable with multiple local controllers and connect the existing Cloudflare Danao room service to the Babylon.js runtime without changing the game's combat rules or Mango Mayhem cast.

## Scope

v0.9 has three layers:

1. **Local controller reliability.** Sparse/disconnected browser Gamepad API entries are normalised before assigning controls. Player 1 uses keyboard plus the first connected pad when available. Additional connected pads fill remaining player slots exactly once; bots fill unused slots.
2. **Browser room client.** A same-origin browser client uses the existing `/api/danao/create`, `/api/danao/join` and room WebSocket protocol. Room tokens stay in session storage and never appear in invite URLs.
3. **Babylon online bridge.** The existing host-authoritative room model is reused. Non-host clients send bounded input frames; the current host simulates all fighters and publishes snapshots at 15 Hz. Host transfer consumes the retained snapshot before the promoted client resumes authority.

## Online UX

Danao keeps local play as the default. An ONLINE PLAY control opens a compact overlay with player name, create-room and join-room actions. The room view shows the four-digit code, connected players, ready state and host-only START control.

Room settings are deliberately restricted to the current Babylon content:
- mode: FreeForAll
- arena mapping: WrestlingArena → ring, TempleCourtyard → courtyard, SichuanTeaHouse → rooftop
- character choices use the existing eight Mango Mayhem fighters.

## Authority rules

- Cloudflare remains authoritative for membership, host identity, ready state and room phase.
- Host Babylon runtime owns combat damage, hazards, props, KOs and final result.
- Non-host local prediction may move the local fighter, but non-host clients do not author damage, prop destruction or arena hazard forces.
- Remote fighters on non-host clients follow authoritative snapshots.
- Input frames are capped at 30 Hz.
- Host snapshots are capped at 15 Hz and only include bounded fighter state needed by the Babylon runtime.

## Reliability constraints

- Local play works even if room APIs are unavailable.
- Online failures show an error and never block returning to local play.
- Reconnect credentials are kept only in session storage.
- Invite links contain the room code only, never the reconnect token.
- WebSocket messages are parsed defensively and stale snapshot/input sequences are ignored.
- Existing v0.8 AI remains available for empty local slots only.
- No new physics, damage, movement speed or item-balance changes.

## Verification

Tests cover sparse gamepad assignment, room client URL/token handling, message parsing, reconnect behaviour, input rate limiting, snapshot sequencing and runtime source contracts for host/non-host authority. Full Danao CI, repository checks and live browser smoke tests must pass before release.
