# Dǎnào / 打闹 — local launch content

## Status

The Unity source now contains the full planned local content layer on top of the Wrestling Arena vertical slice. The project remains on `feature/danao-unity` while online/cloud and website release work is added.

## Arenas

There are eleven selectable arenas: Dublin Docks, London Underground, Mango Market, Temple Courtyard, Sichuan Tea House, Ice Festival, Duck & Bear House Party, Toy Factory, Cruise Ship, Mad Circus and Wrestling Arena. Each arena is built from original runtime geometry, has its own palette, curated weapons and a distinct optional hazard.

## Modes

Local rules include 1v1, 2v2, Free-for-All, Royal Rumble, Mango Grab, Hot Bomb, King of the Ring and Heist. 1v1 requires two joined players and 2v2 requires four. Objective modes respawn knocked-out fighters so one early knockout does not end the objective round.

## Characters and cosmetics

The launch cast is Hero, Stephen, Zachary, Mulan, Gaby, Sara, Mum and Dad. All characters share the same competitive body scale, physics mass and movement rules. Character and costume choices are cosmetic only. Eight initial costume styles are included: Arcade Original, Kung Fu Nonsense, Ring Legend, Punchy Pyjamas, Rubber Duck, Panda Problem, Space Cadet and Mango Hero.

## Weapons

The formal roster contains 36 weapons and props across melee, ranged and heavy/throwable categories. This includes boxing gloves, spring boxing glove, inflatable hammer, rubber chicken, pool noodle, frying pan, folding chair, mop, baguette, giant fish, umbrella, toy guitar, silly sausage, floppy novelty weapon, foam/water/suction/confetti/bubble/tennis/magnet/plunger/party blasters, cartoon bazooka, bowling ball, traffic cone, bin, suitcase, kettle, cushion, foam extinguisher, anvil, giant mango, wrestling table, speaker and toy crate.

Normal attacks remain below 100 HP. The cartoon bazooka is capped at 24 HP at the centre of its blast and applies distance falloff. Explosion targets are deduplicated so a ragdoll's multiple colliders cannot multiply one blast into several hits on the same fighter.

## Current verification

The repository-level Dǎnào source contract test checks Unity 6 structure, all eleven arenas, all eight launch modes, the eight-character cast, the 36-item weapon roster, couch joining, 100 HP/toggles, Chinese title, Web/Windows build targets and procedural-audio policy.

Unity compilation, Unity Test Runner, controller hardware, PhysX feel and generated Web/Windows binaries still require a Unity 6 editor/CI runner. They are not represented as verified until that runner has actually completed them.

## Next

The next source slice is Dǎnào-specific online rooms and cloud profiles using the existing Duck & Bear Cloudflare stack, followed by the `/games/danao/` launcher and Web/Windows release workflow.
