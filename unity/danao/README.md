# 打闹 Dǎnào — Unity project

This folder contains the Unity 6 source for the Duck & Bear arcade physics brawler.

## Open and play

1. Open `unity/danao/` as a project in Unity Hub with Unity **6000.0.65f1** or a compatible Unity 6.0 patch release.
2. Let Package Manager restore the Input System, Universal Render Pipeline, UGUI and Test Framework packages from `Packages/manifest.json`.
3. Open any empty scene or create one, then press Play. `DanaoBootstrap` creates the game automatically.
4. Choose **Local Play**.
5. Press **Start/Menu** on each controller to join. Keyboard can join Player 1 with Enter/Space when Player 1 is not already occupied.
6. With two or more players joined, continue to match setup and choose 1v1, 2v2, free-for-all or Royal Rumble where the joined player count allows it.

## Slice A controls

- Left stick / WASD: move
- A / Cross / Space: jump
- X / Square / X: punch or use held melee weapon
- Y / Triangle / E: grab, pick up or throw
- B / Circle / Shift: dodge
- Right trigger / F: fire ranged weapon
- Left trigger / Q: block
- Start/Menu / Esc: return to menu during a match

## First playable content

The first playable is the Wrestling Arena. It includes:

- 1–4 local input slots, with match modes constrained to valid player counts.
- 100 HP and couch-readable health bars.
- Independent Health Damage, Visible Bruising and Arena Hazards toggles.
- Physics knockdowns with recoverable articulated limbs.
- Ring-out rules for Royal Rumble and damage-off matches.
- Eight representative weapons: boxing glove, folding chair, frying pan, floppy novelty weapon, foam blaster, cartoon bazooka, bowling ball and wrestling table.
- Procedural sound effects and original code-generated title/fight music, with no external audio asset dependency.
- Chinese title `打闹` with `Dǎnào` as supporting text.

## Tests

Repository/static contract test:

```bash
node --test tests/danao-source.test.mjs
```

Inside Unity, run EditMode and PlayMode tests through **Window → General → Test Runner**. The Unity tests cover HP rules, damage-off behaviour, team assignment, weapon damage limits, fighter initialisation and Wrestling Arena weapon spawning.

## Build

Dǎnào is a browser-only game. The shipping target is Unity WebGL. Windows Micro may be used as the Unity Build Automation worker machine, but it still produces the WebGL browser build rather than a Windows application.

From the Unity Editor menu:

- `Danao → Build → Web`

Command line equivalent:

```bash
Unity -batchmode -quit -projectPath unity/danao -executeMethod Danao.Editor.DanaoBuild.BuildWeb
```

Generated output is written under `unity/danao/Build/` and is intentionally ignored by git.

## Source layout

- `Assets/Danao/Runtime/Core` — match settings, damage and local match rules.
- `Assets/Danao/Runtime/Input` — deliberate couch-player joining and per-slot input.
- `Assets/Danao/Runtime/Fighters` — fighter creation, movement and knockdowns.
- `Assets/Danao/Runtime/Combat` — HP, blocking, punching, grabbing and throwing.
- `Assets/Danao/Runtime/Weapons` — weapon data, pickups, projectiles and procedural models.
- `Assets/Danao/Runtime/Arenas` — Wrestling Arena vertical slice.
- `Assets/Danao/Runtime/UI` — controller-first arcade menu, join/setup flow and HUD.
- `Assets/Danao/Runtime/Audio` — generated music and effects.
- `Assets/Danao/Editor` — project setup and WebGL build automation.
- `Assets/Danao/Tests` — Unity EditMode/PlayMode tests.

The full design and later content/online/cloud slices are specified in `docs/superpowers/specs/2026-09-16-danao-unity-design.md`; that design document records the earlier dual-target plan, but the current shipping configuration is browser-only.
