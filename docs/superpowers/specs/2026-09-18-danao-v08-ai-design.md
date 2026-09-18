# Danao v0.8 AI and Content Depth Design

## Goal

Make Danao's bot opponents behave more like human party-game players without changing fighter stats, controls, physics or the Mango Mayhem cast.

## Scope

v0.8 keeps the v0.7 combat/visual release intact and improves decision-making in the existing Babylon.js + Rapier runtime.

Bots gain a priority-based decision model:

1. Escape arena edges and active hazards before attacking.
2. Use or throw a held prop when it creates an advantage.
3. Seek nearby unheld props when their personality favours weapons.
4. Opportunistically grab knocked-down opponents.
5. Pressure the nearest opponent with light/heavy attacks and dodges.

Each bot receives one deterministic personality profile based on its slot:
- **Bruiser:** high aggression, low item bias, moderate dodging.
- **Scavenger:** medium aggression, high item bias, moderate dodging.
- **Trickster:** medium-high aggression, medium item bias, high dodging.

The runtime passes current arena bounds, hazards, available props, held-item state and opponent knockdown state into the bot decision layer. The existing grab button path remains the only way bots pick up/throw props or fighters, so bots use the same gameplay rules as humans.

## Content depth

Arena prop layouts remain within existing bounds. v0.8 adds a few extra existing comedy props to the Wrestling Hall so item-seeking bots have meaningful choices without introducing new item types or balance rules.

## Constraints

- No new modes, menus, accounts or multiplayer systems.
- No stat bonuses or hidden physics advantages for bots.
- Player controls remain unchanged.
- Bots must use existing attack/grab/dodge inputs only.
- Edge/hazard avoidance has higher priority than attacking.
- Runtime release packaging remains reproducible through `scripts/assemble-danao-v05.mjs`.
- Existing v0.7 visuals and Mango Mayhem cast identities must remain unchanged.

## Verification

Unit tests cover personality assignment, edge avoidance, hazard avoidance, prop seeking, held-item throwing and opponent pressure. Source-contract tests verify the packaged runtime supplies live arena/prop/hazard context and removes the old random grab shortcut. Full Danao CI, repository tests/checks and a live browser smoke test must pass before release.
