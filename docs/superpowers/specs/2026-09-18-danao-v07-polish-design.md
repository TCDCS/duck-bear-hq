# Danao v0.7 Visual and Combat Polish Design

## Goal

Make the existing Danao brawler feel materially closer to a finished arcade party game without adding new modes, online systems or a new rendering stack.

## Scope

Danao remains a Babylon.js + Rapier web game. The existing eight-character Mango Mayhem cast, three arenas, core controls, grabbing, throwing, HP, knockdowns and destructible props remain the gameplay base.

v0.7 changes presentation and game feel in four areas:

1. Fighter animation must show readable anticipation, contact and recovery instead of a single punch pose. Running, jumping, dodging, hit-stun and knockdown recovery must also have distinct silhouettes.
2. Impacts must layer a shock ring with short-lived star/shard bursts and stronger heavy-hit feedback while cleaning up all temporary meshes/materials.
3. The three arenas must gain more authored visual detail using procedural geometry only. The Wrestling Hall remains the showcase; Courtyard and Rooftop receive extra depth and background dressing.
4. More comedy props can break where it makes visual sense. Baguettes, foam mallets and traffic cones become destructible; metal pans remain durable.

## Constraints

- No external art, fonts, audio downloads or paid assets.
- Do not change competitive fighter physics, body scale, HP, damage rules or player speed for cosmetic reasons.
- Mulan remains visually a dog but uses the same competitive physics/hitbox rules as the rest of the cast.
- Temporary impact/debris effects must self-dispose.
- Keep the current controller/keyboard mappings.
- Do not add new arenas, modes, profiles or multiplayer work in this pass.
- Release packaging must remain reproducible through `scripts/assemble-danao-v05.mjs`.

## Fighter animation

`fighterPose()` becomes the single deterministic presentation model. It derives locomotion, jump, attack wind-up/contact/recovery, dodge and hit-recoil values from state already supplied by the runtime plus vertical velocity/grounded state.

The runtime consumes those values to animate legs, feet, torso, shoulders, arms, fists and head. Heavy attacks use a larger wind-up and follow-through than light attacks. Hit-stun pushes the upper body away from the hit rather than only flashing red.

## Impact and destruction presentation

Heavy and light impacts remain short-lived Babylon meshes. Heavy impacts add a second expanding ring and more radial shards. Prop breakage gets kind-specific debris colours and a brief floor burst.

Breakable prop durability stays modest so destruction happens during normal play, but breakable status is presentation/content only and does not alter fighter stats.

## Arena dressing

- Dragon Wrestling Hall: more ringside signage/light detail and small crowd animation accents, while keeping the current ring, announcer desk and entrance.
- Lantern Courtyard: additional lantern strings, drum/gate details and distant roof silhouettes.
- Teahouse Rooftop: more skyline depth, vents/roof clutter and suspended signage.

Permanent geometry must remain simple low-poly primitives.

## Verification

Automated tests cover the pose phase calculations, new breakable items, v0.7 source markers and exact packaged hashes. CI must pass release assembly, JavaScript syntax, the full repository test suite and repository checks. A live browser smoke test must load the menu, fighter select and a match after deployment.
