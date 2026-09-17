# Dǎnào / 打闹 — Unity Game Design

## 1. Purpose

Build an original arcade physics brawler for Duck & Bear, inspired by the fast couch chaos of party-fighting games without copying their art, maps, branding or code.

The game title is **打闹** on the title screen, with **Dǎnào** used in supporting English text. The tone is childish, ridiculous and slapstick, but the intended audience is adults.

The finished game must work from the Duck & Bear games page in a desktop browser and also be buildable as a Windows desktop game from the same Unity project.

## 2. Core goals

The game must feel immediate, physical and funny rather than tactical or realistic. Players should be able to run, jump, punch, grab, carry, throw, dodge, pick up props and weapons, and knock each other around the environment.

Matches should normally last 2–5 minutes. Controls must be easy to learn with a gamepad from the couch. Local multiplayer is a first-class mode, not an afterthought.

The visual target is a polished high-definition cartoon arcade game. Characters can show comic bruising, scuffs, wobble and dazed reactions, but there is no gore, dismemberment or realistic injury.

## 3. Technical direction

### 3.1 Engine

Use **Unity 6** with the Universal Render Pipeline and Unity's built-in PhysX physics.

Use Unity's Input System for keyboard and gamepad support. The same gameplay assemblies must be used for Web and Windows builds.

### 3.2 Targets

Primary targets:

- Unity Web build for Duck & Bear.
- Windows x64 desktop build.

The Web build uses a lower graphics preset and the Windows build uses a higher preset. Gameplay rules must remain identical.

### 3.3 Hosting

Duck & Bear remains on Cloudflare. The website launches the Unity game from `/games/danao/`.

Large Unity Web build files are stored separately from small site assets and served through the Duck & Bear/Cloudflare deployment path. Cloudflare Workers/Durable Objects remain responsible for room/session APIs and cloud profiles.

### 3.4 Project location

Unity source lives under `unity/danao/` in the Duck & Bear repository. Generated Unity build output is not committed to source control.

Website launcher files live under `public/games/danao/`.

Dǎnào server code lives under `src/danao/` and remains separate from Wacky Races multiplayer code.

## 4. Player count and match types

Support 1–4 local players using keyboard/gamepads.

Support 2–4 online players using private room codes and invite links.

Initial online release keeps local and online sessions separate. Mixed couch-plus-online play is deferred until the base online mode is stable.

Core match types:

- 1v1.
- 2v2.
- 3-player free-for-all.
- 4-player free-for-all.
- Team Knockout.
- Royal Rumble / ring-out.
- Mango Grab.
- Hot Bomb.
- King of the Ring.
- Heist-style grab-and-return objective.

## 5. Match flow

The game opens to a proper title/menu flow and never drops directly into a match.

Flow:

1. Title screen.
2. Local Play / Online Play / Settings / Profiles.
3. Player join screen.
4. Character select.
5. Mode select.
6. Arena select.
7. Match settings.
8. Fight.
9. Results.
10. Rematch / change setup / main menu.

Menus are controller-first with large arcade buttons, fast transitions, clear focus states and no generic AI-dashboard look.

## 6. Health, damage and knockouts

Each fighter starts at **100 HP** by default.

Every fighter has a clear health bar and numerical HP display. Local matches must remain readable from a couch.

Three independent settings control the presentation:

- **Health Damage: On/Off** — when off, attacks still cause physical knockback but HP does not fall.
- **Visible Bruising: On/Off** — cosmetic bruises/scuffs can be disabled separately.
- **Arena Hazards: On/Off** — environmental hazards can be disabled separately.

When HP reaches zero in a knockout mode, the fighter enters an exaggerated ragdoll knockout state. No blood or gore is shown.

With health damage disabled, modes that require elimination use ring-out, score or objective rules instead of HP knockout.

## 7. Movement and combat controls

Default gamepad layout:

- Left stick: move.
- A / Cross: jump.
- X / Square: punch / use held melee weapon.
- Y / Triangle: grab / pick up / throw.
- B / Circle: dodge / shove.
- Right trigger: fire held ranged weapon.
- Left trigger: brace/block.
- Start/Menu: pause.

Keyboard support mirrors all core actions for Player 1.

Movement must be responsive rather than simulation-heavy. Physics should make impacts funny, but controls must not feel as though the player is steering a ragdoll all the time.

## 8. Physics model

Characters use an animated upright controller during normal movement and transition into partial/full ragdoll when hit hard, thrown, knocked down or eliminated.

Key physics behaviours:

- Weighty object pickup and throwing.
- Knockback scaled by weapon force, attacker motion and target state.
- Short hit stun rather than long loss of control.
- Recovery from knockdown.
- Grab-and-drag interactions.
- Breakable light props.
- Heavy props that can crush, block or shove without gore.
- Arena-specific moving hazards.

Physics values must be capped to avoid objects tunnelling through levels or launching permanently out of bounds.

## 9. Characters

Use the same Duck & Bear/Mango Mayhem cast and visual identities as the existing games, but rebuild them as original stylised 3D arcade fighters.

Initial roster:

- The Mango Mayhem hero.
- Stephen.
- Zachary.
- Mulan.
- Gaby.
- Sara.
- Mum.
- Dad.

All fighters have the same gameplay stats. Differences are cosmetic only: silhouette, idle animation, reactions, victory poses, entrances and outfits.

No fighter may provide a competitive advantage through reach, speed, weight, hitbox or weapon handling.

Costumes are unlockable and cosmetic.

## 10. Arenas

The full launch set contains eleven arenas.

### 10.1 Dublin Docks

Cranes, cargo containers, swinging hooks, movable trolleys and water-edge ring-outs.

### 10.2 London Underground

Platform environment with warning lights, luggage, barriers and an occasional passing train hazard. Hazard can be disabled.

### 10.3 Mango Market

Colourful fruit market with rolling mango crates, awnings, stalls and breakable produce displays.

### 10.4 Temple Courtyard

Open courtyard with drums, lantern poles, stairs, movable benches and a central bell/gong interaction.

### 10.5 Sichuan Tea House

Multi-level tea house with sliding screens, tables, stools, hanging lanterns and a kitchen area.

### 10.6 Ice Festival

Slippery ice patches, snow sculptures, curling stones, ramps and cracking visual effects without realistic danger.

### 10.7 Duck & Bear House Party

Living-room/kitchen party arena with sofas, cushions, lamps, food, speakers and breakable party clutter.

### 10.8 Toy Factory

Conveyor belts, giant blocks, boxing-glove machines, toy hammers and packing crates.

### 10.9 Cruise Ship

Deck arena with deckchairs, luggage, pool toys, sliding objects and occasional ship tilt.

### 10.10 Mad Circus

Trampolines, seesaws, cannons, rolling balls and breakable stage props.

### 10.11 Wrestling Arena

Full wrestling ring with elastic ropes, climbable turnbuckles, ringside floor, folding chairs and breakable tables. Ring-out can be enabled as a victory rule. This is the first fully playable arena built and used as the vertical-slice proving ground.

## 11. Weapons and props

No normal weapon should delete a 100 HP fighter in a single ordinary hit. Heavy weapons can create major knockback, but each has a wind-up, limited ammunition, slow movement penalty or clear counterplay.

### 11.1 Melee

- Boxing gloves.
- Oversized spring boxing glove.
- Inflatable hammer.
- Rubber chicken.
- Pool noodle.
- Frying pan.
- Folding chair.
- Mop.
- Baguette.
- Giant fish.
- Umbrella.
- Toy guitar.
- Silly sausage.
- Floppy dildo novelty weapon.

The dildo is a comic adult prop only: no sexual act, nudity or explicit animation. It behaves as a floppy physics melee item with a squeaky impact sound and high comic knockback.

### 11.2 Ranged

- Foam dart blaster.
- Water blaster.
- Suction-cup launcher.
- Confetti cannon.
- Bubble cannon.
- Tennis-ball launcher.
- Magnet gun.
- Plunger launcher.
- Party-popper blaster.
- Cartoon rocket launcher / bazooka.

### 11.3 Heavy and throwable

- Bowling ball.
- Traffic cone.
- Bin.
- Suitcase.
- Kettle.
- Cushion.
- Fire extinguisher-style knockback prop with fictional harmless foam.
- Anvil pickup with very slow carry speed.
- Giant mango.
- Wrestling table.
- Speaker.
- Toy crate.

Arena props can also be thrown even when they are not part of the formal weapon roster.

## 12. Weapon balance

Damage bands:

- Light: 4–8 HP.
- Standard: 8–15 HP.
- Heavy: 15–24 HP.
- Explosive/major hazard: 18–30 HP with strong falloff.

Combos, environmental impacts and throws are the main route to high damage. Cooldowns, ammunition and wind-up prevent dominant weapons.

Weapon spawners are randomised from curated arena-specific pools so every item still fits the space.

## 13. Game modes

### 13.1 Knockout

Reduce opponents to zero HP. Last fighter standing wins.

### 13.2 Team Knockout

2v2 with team colours and friendly-fire setting.

### 13.3 Royal Rumble

Damage can be on or off. Throw opponents out of the allowed arena boundary.

### 13.4 Mango Grab

Golden mangos spawn around the arena. First player/team to the target score wins.

### 13.5 Hot Bomb

A ridiculous ticking prop is passed by hitting or throwing it. The holder at detonation is launched and loses points/HP depending on match settings.

### 13.6 King of the Ring

Hold a marked zone while opponents try to knock you out of it.

### 13.7 Heist

Grab an objective from the centre/opponent side and return it to your team zone.

## 14. UI and presentation

The UI must look like a bespoke arcade game, not a website control panel.

Style:

- Big angled panels.
- Thick outlines.
- Punchy screen transitions.
- Animated focus states.
- Character reactions in menus.
- Minimal text where an icon works better.
- Readable couch-scale HUD.

The title uses **打闹** prominently. `Dǎnào` can appear as a small subtitle or supporting mark, but the Chinese characters remain the main title.

## 15. Audio

All shipped music and sound assets must be legally redistributable with the project.

Preferred policy is original procedural/game-generated audio or CC0/public-domain recordings. Avoid NC licences and avoid anything that creates redistribution ambiguity.

The title theme is deliberately over-the-top arcade martial-arts comedy: fast drums, gong-style percussion, pentatonic melodic movement and exaggerated stings. It must be original or permissively licensed, not copied from a film/game soundtrack.

Every important action has a distinct sound: punch, grab, throw, knockout, pickup, rocket, bounce, table break, health warning, round start and victory.

The novelty dildo weapon uses a deliberately stupid squeak/boing style sound rather than anything sexual.

## 16. Local multiplayer

Gamepad joining is drop-in at the lobby. Each controller owns one player slot.

The game must support common Xbox-layout and PlayStation-layout controllers through Unity Input System mappings.

Input loss must pause only when appropriate. A disconnected controller gets a clear reconnect message without destroying the match state.

## 17. Online multiplayer

Dǎnào gets its own room service rather than reusing racing room state directly.

Cloudflare Durable Objects own:

- Room code allocation.
- Lobby membership.
- Ready state.
- Character selection.
- Match settings.
- Host election.
- Rate limiting.
- Reconnect reservation.
- Match result acceptance.

For gameplay, the selected host acts as the authoritative Unity physics simulation. Remote clients send input frames through the room relay; the host publishes regular compressed state snapshots. Clients interpolate remote movement and correct large divergence.

The room service never trusts a non-host client to directly set another player's HP, score or result.

Host migration can occur between rounds. If the host disappears mid-round, the current round is safely stopped and restarted after host election rather than attempting an unreliable live PhysX handover.

Private rooms use short room codes and invite links. No public voice or text chat is included.

## 18. Cloud saves

Anonymous/local players save settings and unlocks locally.

Signed-in Duck & Bear accounts can sync a Dǎnào profile to Cloudflare D1.

Cloud profile data:

- Settings.
- Unlocked costumes.
- Cosmetic loadout.
- Match statistics.
- Arena/mode preferences.
- Accessibility settings.

Do not store detailed input telemetry or private chat because the game has no public chat.

Cloud writes use revision checks and safe conflict handling similar to the existing Mango profile pattern, but Dǎnào data remains in its own schema/API namespace.

## 19. Website integration

Add a Dǎnào card to `/games/`.

`/games/danao/` is a dedicated launch shell with:

- Chinese title art.
- Play button/load progress.
- Full-screen option.
- Controller recommendation.
- Audio start/unmute handling required by browsers.
- Graceful WebGL compatibility message.

The Unity canvas takes over after launch. Duck & Bear navigation remains available outside the active full-screen match.

## 20. Performance

Web target:

- Aim for 60 fps on a normal modern desktop/laptop.
- Provide a 30 fps fallback mode.
- Cap active rigidbodies and particle counts.
- Pool common props/projectiles.
- Use baked lighting where practical.
- Avoid expensive transparent effects.
- Keep physics fixed-step stable under browser load.

Windows target can use higher shadow, texture and post-processing settings.

## 21. Accessibility and settings

Include:

- Master/music/SFX sliders.
- Screen shake slider/off.
- Reduced motion.
- Visible bruising toggle.
- Health damage toggle.
- Hazard toggle.
- Colour-independent team markers.
- Controller vibration toggle.
- Subtitle/caption support for non-voice gameplay callouts where needed.

No spoken dialogue is required for launch.

## 22. Security and abuse controls

Online state-changing messages are rate-limited and schema-validated.

Room codes are locators rather than passwords. Hosts can lock rooms after friends join.

Client-supplied HP, scores and results are not accepted as authoritative unless they come from the elected host and satisfy server-side match/session rules.

Cloud-save APIs remain owner-scoped to the signed-in Duck & Bear account.

## 23. Testing

### 23.1 Unity tests

EditMode tests cover:

- Damage calculation.
- HP clamping.
- damage-off behaviour.
- weapon data validation.
- team rules.
- score rules.
- arena/mode compatibility.
- save serialisation.

PlayMode tests cover:

- Player join.
- pickup/drop/throw.
- knockout/recovery.
- ring-out.
- weapon firing.
- rematch reset.

### 23.2 Cloudflare tests

Node tests cover:

- room creation/join.
- maximum player count.
- ready state.
- host election.
- room locking.
- reconnect reservation.
- invalid message rejection.
- result validation.
- Dǎnào profile ownership and revision conflicts.

### 23.3 Browser acceptance

Automated browser checks cover:

- Dǎnào game card and launch shell.
- Unity loader progress/error states.
- keyboard input path.
- WebSocket room lifecycle using test clients.

Physical controller feel and final WebGL performance require real-device testing before release.

## 24. Build order

The game is large enough to split into implementation slices rather than one unsafe mega-change.

### Slice A — Core local vertical slice

Deliver a complete local game using the Wrestling Arena, 1–4 players, 100 HP, damage/bruising/hazard settings, ragdoll knockdowns, pickups, eight representative weapons, arcade HUD, title/menu flow and procedural audio.

This slice proves movement, combat, physics and couch play before multiplying content.

### Slice B — Full content

Add the remaining ten arenas, complete 36-weapon/prop roster, all launch modes, full cast presentation, costumes, hazards and content balancing.

### Slice C — Online and cloud

Add Dǎnào Durable Object rooms, WebSocket/WebGL transport, host-authoritative snapshots, reconnect flow, signed-in cloud profiles and account sync.

### Slice D — Website/deployment polish

Add final Duck & Bear games-page card, Web launch shell, build publishing, Windows build workflow, licence manifest, compatibility checks and release documentation.

## 25. First playable acceptance criteria

Slice A is accepted when:

- The Unity project opens without missing packages.
- Title screen shows 打闹 as the primary game title.
- At least two local controllers can join and play; architecture supports four slots.
- The Wrestling Arena is fully playable.
- Fighters can move, jump, punch, grab, pick up, throw and dodge.
- All players start at 100 HP.
- Health damage can be switched off without disabling physics knockback.
- Bruising can be switched off separately.
- Arena hazards can be switched off separately.
- Knockout and ring-out matches both work.
- Eight representative weapons work, including boxing gloves, folding chair, inflatable hammer, foam blaster, bazooka and the floppy novelty dildo weapon.
- Round results and rematch work without reloading the whole game.
- Keyboard Player 1 and gamepad input work.
- No gore or explicit sexual animation appears.
- Core rule logic is covered by automated tests.

## 26. Non-goals for the first slice

Do not block the first playable on:

- Final 3D character art.
- All eleven arenas.
- All 36 weapons.
- Online multiplayer.
- Cloud save.
- Mixed local-plus-online sessions.
- Voice chat.
- Matchmaking with strangers.
- Ranked competitive play.

Those are handled by later slices without changing the core combat contracts proven in Slice A.
