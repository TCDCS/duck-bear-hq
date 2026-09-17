# Dǎnào / 打闹 — first playable

## Status

Slice A is the local multiplayer vertical slice for the Unity version of Dǎnào. It is intended to prove the game feel and project structure before the remaining arenas, full content roster, online transport and cloud profiles are layered on.

The source is under `unity/danao/`.

## Included

The current slice contains the complete local flow from title screen to couch-player join, match setup, fight, result and rematch. Two to four local players can deliberately join with controllers; keyboard can occupy Player 1. The available local rules are 1v1, 2v2, free-for-all and Royal Rumble, with the UI preventing invalid player-count combinations.

Every fighter starts at 100 HP. Health Damage, Visible Bruising and Arena Hazards are separate settings. Turning health damage off leaves physics impacts active and changes elimination to ring-out rules where needed.

The Wrestling Arena is built at runtime from original Unity primitives. It includes a raised ring, ropes, posts, turnbuckles, ringside floor and weapon spawns. The fighter rig is also created at runtime, so the first playable does not depend on unfinished character art or third-party models.

Eight representative weapons are included: boxing glove, folding chair, frying pan, floppy novelty weapon, foam blaster, cartoon bazooka, bowling ball and wrestling table. Ordinary attacks are below 100 HP damage; the bazooka is capped at 24 HP at the centre of its blast with distance falloff.

All first-playable audio is generated in code. There are no downloaded music or SFX files in Slice A, avoiding redistribution/licence ambiguity.

## Verification

The source contract tests check the Unity 6 project layout, 100 HP rule, the three independent presentation/gameplay toggles, required local match modes, all eight weapons, deliberate controller joining, Chinese title, WebGL browser build target and procedural audio policy.

Dǎnào now ships only as a Unity WebGL browser game. Windows Micro can be used as the cloud build worker because it is cheaper, but it does not produce a Win64 application.

## Build command

```bash
Unity -batchmode -quit -projectPath unity/danao -executeMethod Danao.Editor.DanaoBuild.BuildWeb
```

Generated Unity build output remains excluded from source control.

## Next slices

Slice B expands this foundation to the other ten arenas, the full weapon/prop roster, launch modes, character presentation and costumes. Slice C adds Dǎnào-specific Cloudflare Durable Object rooms, WebSocket/WebGL transport and cloud profiles. Slice D publishes the Web build through Duck & Bear, adds the `/games/danao/` launch shell, licence manifest and release checks.
