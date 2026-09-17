# Dǎnào Slice B Full Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the working Unity local vertical slice into the complete launch content set: eleven selectable arenas, all thirty-six weapons/props, full cast/cosmetic selection and all local launch modes.

**Architecture:** Keep the runtime-generated, original arcade art direction so the project stays buildable without third-party models. Replace Wrestling-only branching with data-driven arena, weapon, player-selection and objective systems. Existing movement/HP/physics contracts remain stable; new content plugs into them through `ArenaId`, `WeaponKind`, `PlayerLoadout` and objective interfaces.

**Tech Stack:** Unity 6, C#, Unity Input System, PhysX, UGUI, procedural meshes/materials/audio, Unity Test Framework.

**Spec:** `docs/superpowers/specs/2026-09-16-danao-unity-design.md`

## Global Constraints

- Preserve 100 HP default and independent Health Damage, Visible Bruising and Arena Hazards toggles.
- Preserve identical competitive fighter stats and hitboxes.
- Keep all art/audio original or generated in-project.
- Support 2–4 joined local players for multiplayer matches.
- The eleven arenas are Dublin Docks, London Underground, Mango Market, Temple Courtyard, Sichuan Tea House, Ice Festival, Duck & Bear House Party, Toy Factory, Cruise Ship, Mad Circus and Wrestling Arena.
- The complete formal weapon/prop roster contains the 36 items listed in the design spec.
- Modes are 1v1, 2v2, free-for-all, Royal Rumble, Mango Grab, Hot Bomb, King of the Ring and Heist.

---

### Task 1: Arena and weapon contracts

**Files:**
- Create: `Assets/Danao/Runtime/Arenas/ArenaCatalog.cs`
- Create: `Assets/Danao/Runtime/Arenas/ArenaBuilder.cs`
- Modify: `Assets/Danao/Runtime/Weapons/WeaponDefinition.cs`
- Modify: `Assets/Danao/Runtime/Weapons/WeaponFactory.cs`
- Test: `Assets/Danao/Tests/EditMode/ContentCatalogTests.cs`
- Modify: `tests/danao-source.test.mjs`

- [ ] Test that exactly 11 arena IDs and 36 formal weapon kinds are exposed, every weapon has positive damage below 100, and every arena has at least one curated weapon pool.
- [ ] Implement immutable arena metadata including display name, palette, size, hazard family and curated weapon pool.
- [ ] Extend `WeaponKind`/definitions to the complete roster and generate readable primitive visuals for every kind.
- [ ] Keep the existing eight Slice A values unchanged unless balancing tests explicitly change them.

### Task 2: Eleven procedural arena builders

**Files:**
- Modify: `Assets/Danao/Runtime/Arenas/ArenaBuilder.cs`
- Create: `Assets/Danao/Runtime/Arenas/ArenaHazards.cs`
- Modify: `Assets/Danao/Runtime/Arenas/WrestlingArena.cs`
- Test: `Assets/Danao/Tests/PlayMode/ArenaSmokeTests.cs`

- [ ] Test that every `ArenaId` builds a valid floor, four spawn points, bounds and weapon spawns.
- [ ] Build distinct original environments for all eleven arena themes using colour, geometry and moving props rather than copied layouts.
- [ ] Implement hazard families: swinging crane/hook, passing train lane, rolling fruit, gong impulse, sliding screens/kitchen clutter, ice slip, house-party speaker pulse, conveyor/boxing machine, ship tilt, circus trampoline/cannon and wrestling ropes/ring-out.
- [ ] All hazard behaviour must respect `ArenaHazards` and cap impulses/velocities.

### Task 3: Character and costume selection

**Files:**
- Create: `Assets/Danao/Runtime/Fighters/CharacterCatalog.cs`
- Create: `Assets/Danao/Runtime/Fighters/PlayerLoadout.cs`
- Modify: `Assets/Danao/Runtime/Fighters/FighterFactory.cs`
- Modify: `Assets/Danao/Runtime/UI/ArcadeUi.cs`
- Test: `Assets/Danao/Tests/EditMode/CharacterCatalogTests.cs`

- [ ] Test the eight-character launch roster and equal competitive dimensions/stats.
- [ ] Add per-slot selection for Hero, Stephen, Zachary, Mulan, Gaby, Sara, Mum and Dad.
- [ ] Add cosmetic outfit palettes/accessories with no stat change.
- [ ] Insert a controller-first Character Select screen between Join and Match Setup.

### Task 4: Arena selection and corrected mode cycling

**Files:**
- Modify: `Assets/Danao/Runtime/Core/MatchRules.cs`
- Modify: `Assets/Danao/Runtime/Core/LocalMatch.cs`
- Modify: `Assets/Danao/Runtime/UI/ArcadeUi.cs`
- Modify: `Assets/Danao/Runtime/DanaoGame.cs`
- Test: `Assets/Danao/Tests/EditMode/MatchRulesTests.cs`

- [ ] Use `MatchRules.NextAllowedMode` so invalid modes are skipped rather than trapping the UI.
- [ ] Add arena selection after mode selection and pass selected `ArenaId` into the match config.
- [ ] Extend local modes with Mango Grab, Hot Bomb, King of the Ring and Heist.
- [ ] Keep 1v1 constrained to two active players and 2v2 to four.

### Task 5: Objective mode runtime

**Files:**
- Create: `Assets/Danao/Runtime/Objectives/ObjectiveController.cs`
- Create: `Assets/Danao/Runtime/Objectives/MangoGrabObjective.cs`
- Create: `Assets/Danao/Runtime/Objectives/HotBombObjective.cs`
- Create: `Assets/Danao/Runtime/Objectives/KingOfRingObjective.cs`
- Create: `Assets/Danao/Runtime/Objectives/HeistObjective.cs`
- Modify: `Assets/Danao/Runtime/Core/LocalMatch.cs`
- Modify: `Assets/Danao/Runtime/UI/ArcadeUi.cs`
- Test: `Assets/Danao/Tests/EditMode/ObjectiveRuleTests.cs`

- [ ] Test objective scoring/win thresholds without physics.
- [ ] Mango Grab: first player/team to 10 golden mangos.
- [ ] Hot Bomb: pass a timed bomb by contact/throw; holder is launched and opponent score advances on detonation.
- [ ] King of the Ring: accumulate 30 seconds of uncontested zone time.
- [ ] Heist: return the centre objective to a team/home zone three times.
- [ ] HUD shows score/objective status without obscuring HP.

### Task 6: Full local content verification

**Files:**
- Modify: `tests/danao-source.test.mjs`
- Create: `docs/danao-content.md`

- [ ] Static test checks all 11 arena IDs, all 36 weapon IDs, eight characters and eight launch modes.
- [ ] Unity tests cover representative arena builds and objective score rules.
- [ ] Document content, controls and known verification limits.
- [ ] Run repository/static checks and keep Unity-specific verification explicitly separate until a Unity runner is available.
