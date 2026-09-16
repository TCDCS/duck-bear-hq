# Dǎnào Slice A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first complete playable Dǎnào local multiplayer vertical slice in Unity 6: title/menu flow, 1–4 local players, Wrestling Arena, 100 HP combat, damage/bruising/hazard toggles, physics knockdowns, representative weapons, arcade HUD and procedural audio.

**Architecture:** The Unity project lives at `unity/danao/` and creates the vertical-slice scene from focused runtime components so the source stays reviewable and binary art is not required for the first playable. Gameplay rules are plain C# classes where possible, with MonoBehaviours limited to Unity-facing movement, physics, input, rendering and audio. The website is not made dependent on generated Unity build output; source is build-ready for Web and Windows, while generated builds stay ignored.

**Tech Stack:** Unity 6, C# 9-compatible Unity scripts, Unity Input System, Unity PhysX, Universal Render Pipeline package, Unity Test Framework, procedural meshes/materials/audio, existing Duck & Bear GitHub/Cloudflare repository.

**Spec:** `docs/superpowers/specs/2026-09-16-danao-unity-design.md`

## Global Constraints

- Engine: Unity 6.
- Primary targets: Unity Web build and Windows x64 desktop build from the same gameplay assemblies.
- Project location: `unity/danao/`.
- Generated Unity build output is not committed.
- First arena: Wrestling Arena.
- Local players: 1–4; keyboard may control Player 1 and common gamepads join independently.
- Default health: 100 HP.
- Health Damage, Visible Bruising and Arena Hazards are independent settings.
- Required local match layouts include 1v1, 2v2 and free-for-all.
- All fighters use identical competitive stats.
- No blood, gore, dismemberment or realistic injury.
- The title is `打闹`, with `Dǎnào` supporting text.
- All Slice A audio is generated procedurally in code so redistribution is unambiguous.
- Eight representative Slice A weapons: boxing glove, folding chair, frying pan, floppy novelty weapon, foam blaster, cartoon bazooka, bowling ball and wrestling table.
- No normal ordinary hit may remove 100 HP in one hit.

---

### Task 1: Unity project scaffold and deterministic boot

**Files:**
- Create: `unity/danao/Packages/manifest.json`
- Create: `unity/danao/Packages/packages-lock.json`
- Create: `unity/danao/ProjectSettings/ProjectVersion.txt`
- Create: `unity/danao/Assets/Danao/Runtime/DanaoBootstrap.cs`
- Create: `unity/danao/Assets/Danao/Runtime/DanaoGame.cs`
- Create: `unity/danao/Assets/Danao/Editor/DanaoBuild.cs`
- Create: `unity/danao/.gitignore`
- Test: `tests/danao-source.test.mjs`

**Interfaces:**
- Produces: `DanaoBootstrap.EnsureBooted()` and `DanaoGame` singleton runtime root.
- Produces: editor build entry points `DanaoBuild.BuildWeb()` and `DanaoBuild.BuildWindows()`.

- [ ] **Step 1: Write the failing source-layout test**

```js
assert.ok(exists('unity/danao/Packages/manifest.json'));
assert.ok(exists('unity/danao/Assets/Danao/Runtime/DanaoBootstrap.cs'));
assert.match(read('unity/danao/ProjectSettings/ProjectVersion.txt'), /6000\./);
```

- [ ] **Step 2: Run the repository test and confirm failure**

Run: `node --test tests/danao-source.test.mjs`
Expected: FAIL because the Unity project files do not yet exist.

- [ ] **Step 3: Add the Unity 6 project scaffold**

`manifest.json` must include Input System, URP and Test Framework. `DanaoBootstrap` must use a runtime initialiser so a generated/empty boot scene can create the game root safely:

```csharp
[RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
public static void EnsureBooted()
{
    if (Object.FindFirstObjectByType<DanaoGame>() != null) return;
    new GameObject("DanaoGame").AddComponent<DanaoGame>();
}
```

- [ ] **Step 4: Add build entry points**

```csharp
public static void BuildWeb() => Build(BuildTarget.WebGL, "Build/Web");
public static void BuildWindows() => Build(BuildTarget.StandaloneWindows64, "Build/Windows/Danao.exe");
```

The build helper must create a temporary boot scene when no committed scene exists, add it to `EditorBuildSettings.scenes`, build, then leave source assets clean.

- [ ] **Step 5: Run the source-layout test**

Run: `node --test tests/danao-source.test.mjs`
Expected: PASS for project structure/package/build assertions.

- [ ] **Step 6: Commit**

```bash
git add unity/danao tests/danao-source.test.mjs
git commit -m "feat: scaffold Danao Unity project"
```

### Task 2: Pure gameplay rules and settings

**Files:**
- Create: `unity/danao/Assets/Danao/Runtime/Core/MatchSettings.cs`
- Create: `unity/danao/Assets/Danao/Runtime/Core/DamageModel.cs`
- Create: `unity/danao/Assets/Danao/Runtime/Core/MatchRules.cs`
- Create: `unity/danao/Assets/Danao/Tests/EditMode/DamageModelTests.cs`
- Create: `unity/danao/Assets/Danao/Tests/EditMode/MatchRulesTests.cs`
- Modify: `tests/danao-source.test.mjs`

**Interfaces:**
- Produces: `MatchSettings` with `HealthDamage`, `VisibleBruising`, `ArenaHazards`, `TeamMode`, `RingOut`.
- Produces: `DamageModel.Apply(int currentHp, int rawDamage, bool enabled) -> int`.
- Produces: `MatchRules.TeamForSlot(int slot, bool teamMode) -> int`.

- [ ] **Step 1: Write Unity EditMode tests**

```csharp
[Test] public void DamageClampsAtZero() => Assert.AreEqual(0, DamageModel.Apply(5, 20, true));
[Test] public void DamageOffPreservesHp() => Assert.AreEqual(100, DamageModel.Apply(100, 30, false));
[Test] public void TwoVsTwoPairsSlots() {
    Assert.AreEqual(0, MatchRules.TeamForSlot(0, true));
    Assert.AreEqual(0, MatchRules.TeamForSlot(1, true));
    Assert.AreEqual(1, MatchRules.TeamForSlot(2, true));
    Assert.AreEqual(1, MatchRules.TeamForSlot(3, true));
}
```

- [ ] **Step 2: Add minimal rules implementation**

Damage must clamp 0–100 and damage-off must preserve the supplied HP. Team mode maps slots 0/1 to team 0 and 2/3 to team 1.

- [ ] **Step 3: Extend Node source checks**

Assert that health constants are 100 and settings contain the three independent toggles.

- [ ] **Step 4: Run repository source tests**

Run: `node --test tests/danao-source.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add unity/danao/Assets/Danao/Runtime/Core unity/danao/Assets/Danao/Tests tests/danao-source.test.mjs
git commit -m "feat: add Danao match and damage rules"
```

### Task 3: Local input, fighter factory and shared camera

**Files:**
- Create: `unity/danao/Assets/Danao/Runtime/Input/LocalInputHub.cs`
- Create: `unity/danao/Assets/Danao/Runtime/Fighters/FighterInput.cs`
- Create: `unity/danao/Assets/Danao/Runtime/Fighters/FighterController.cs`
- Create: `unity/danao/Assets/Danao/Runtime/Fighters/FighterFactory.cs`
- Create: `unity/danao/Assets/Danao/Runtime/Fighters/ArcadeKnockdown.cs`
- Create: `unity/danao/Assets/Danao/Runtime/Camera/SharedArenaCamera.cs`
- Modify: `unity/danao/Assets/Danao/Runtime/DanaoGame.cs`

**Interfaces:**
- Produces: `LocalInputHub.ReadSlot(int slot) -> FighterInput` and join detection for keyboard/gamepads.
- Produces: `FighterFactory.Create(int slot, string displayName, Vector3 spawn, MatchSettings settings) -> FighterController`.
- Produces: `FighterController.Knockdown(Vector3 impulse, float seconds)`.

- [ ] **Step 1: Define a value-only input frame**

```csharp
public readonly struct FighterInput {
    public readonly Vector2 Move;
    public readonly bool Jump, Punch, Grab, Dodge, Fire, Block;
}
```

- [ ] **Step 2: Implement controller joining**

Slot 0 accepts keyboard when used. Gamepads join by Start/Menu press and remain bound to one slot. Up to four slots may exist.

- [ ] **Step 3: Implement responsive Rigidbody movement**

Use acceleration toward a capped planar velocity, grounded checks, jump impulse and facing toward recent movement. Normal movement freezes body X/Z rotation; knockdown temporarily releases rotation and restores upright control after the timer.

- [ ] **Step 4: Build original primitive fighters**

The factory creates a rounded cartoon body from Unity primitives with identical colliders/physics for every named fighter. Names/colours are cosmetic only. Initial names are Hero, Stephen, Zachary, Mulan, Gaby, Sara, Mum and Dad.

- [ ] **Step 5: Add a shared camera**

The camera tracks the average fighter position and adjusts distance using the maximum pairwise spread, clamped to keep the Wrestling Arena readable.

- [ ] **Step 6: Run source tests and commit**

Run: `node --test tests/danao-source.test.mjs`

```bash
git add unity/danao/Assets/Danao/Runtime
git commit -m "feat: add Danao local fighters and input"
```

### Task 4: Health, bruising, melee, pickups and ranged weapons

**Files:**
- Create: `unity/danao/Assets/Danao/Runtime/Combat/FighterHealth.cs`
- Create: `unity/danao/Assets/Danao/Runtime/Combat/FighterCombat.cs`
- Create: `unity/danao/Assets/Danao/Runtime/Weapons/WeaponDefinition.cs`
- Create: `unity/danao/Assets/Danao/Runtime/Weapons/PickupWeapon.cs`
- Create: `unity/danao/Assets/Danao/Runtime/Weapons/Projectile.cs`
- Create: `unity/danao/Assets/Danao/Runtime/Weapons/WeaponFactory.cs`
- Create: `unity/danao/Assets/Danao/Tests/EditMode/WeaponDefinitionTests.cs`

**Interfaces:**
- Produces: `FighterHealth.ApplyDamage(int damage, Vector3 impulse, int attackerSlot)`.
- Produces: `WeaponDefinition` data for eight Slice A weapons.
- Produces: `WeaponFactory.Spawn(WeaponKind kind, Vector3 position) -> PickupWeapon`.

- [ ] **Step 1: Write weapon validation tests**

```csharp
[TestCase(WeaponKind.BoxingGlove)]
[TestCase(WeaponKind.FoldingChair)]
[TestCase(WeaponKind.FryingPan)]
[TestCase(WeaponKind.NoveltyFloppy)]
[TestCase(WeaponKind.FoamBlaster)]
[TestCase(WeaponKind.Bazooka)]
[TestCase(WeaponKind.BowlingBall)]
[TestCase(WeaponKind.WrestlingTable)]
public void OrdinaryHitsNeverOneShot(WeaponKind kind)
{
    Assert.Less(WeaponDefinition.For(kind).Damage, 100);
}
```

- [ ] **Step 2: Implement health and cosmetic bruising**

HP begins at 100. When health damage is disabled, impulses still apply but HP is unchanged. When bruising is enabled, fighter material shifts through mild scuff/bruised tints based on HP; disabling bruising restores the base palette.

- [ ] **Step 3: Implement punch and grab**

Punch uses a short forward overlap sphere with cooldown and 8 HP base damage. Grab finds the nearest pickup in front, attaches it to a hand anchor, and throw releases it with forward/up impulse.

- [ ] **Step 4: Implement eight weapons**

Required data bands:

```csharp
BoxingGlove  = 8 HP;
FoldingChair = 14 HP;
FryingPan    = 12 HP;
NoveltyFloppy= 10 HP with high knockback and squeak event;
FoamBlaster  = 6 HP per dart;
Bazooka      = 24 HP centre explosion with falloff;
BowlingBall  = 16 HP on strong impact;
WrestlingTable = 18 HP when thrown/broken.
```

- [ ] **Step 5: Implement projectiles and explosion falloff**

Bazooka explosion damage is capped at 24 HP at the centre and falls to zero at radius edge. Projectile ownership prevents immediate self-collision on spawn.

- [ ] **Step 6: Run source tests and commit**

Run: `node --test tests/danao-source.test.mjs`

```bash
git add unity/danao/Assets/Danao/Runtime/Combat unity/danao/Assets/Danao/Runtime/Weapons unity/danao/Assets/Danao/Tests
git commit -m "feat: add Danao combat and weapons"
```

### Task 5: Wrestling Arena and match loop

**Files:**
- Create: `unity/danao/Assets/Danao/Runtime/Arenas/WrestlingArena.cs`
- Create: `unity/danao/Assets/Danao/Runtime/Core/LocalMatch.cs`
- Modify: `unity/danao/Assets/Danao/Runtime/DanaoGame.cs`

**Interfaces:**
- Produces: `WrestlingArena.Build(Transform parent, MatchSettings settings) -> ArenaRuntime`.
- Produces: `LocalMatch.StartMatch(LocalMatchConfig config)` and `LocalMatch.ResetRound()`.

- [ ] **Step 1: Build arena geometry from primitives**

Create a raised ring, four posts, three rope heights, ringside floor, stairs/turnbuckles, weapon spawn points and ring-out volume. Elastic rope contacts apply a bounded rebound impulse. Hazard-off disables rebound/ring-edge hazard logic but leaves geometry present.

- [ ] **Step 2: Place Slice A weapons**

Place curated spawns for the eight representative weapons around ring/ringside. Respawn consumed light weapons after a delay; bazooka ammo is limited.

- [ ] **Step 3: Implement modes needed for user acceptance**

`LocalMatchConfig` supports `OneVsOne`, `TwoVsTwo`, `FreeForAll`, `RoyalRumble`. OneVsOne enables two slots; TwoVsTwo enables four slots and team mapping; FFA accepts 2–4; RoyalRumble can function with Health Damage off.

- [ ] **Step 4: Implement round completion and rematch reset**

A round ends when one eligible fighter/team remains. Results freeze combat, then allow rematch which resets HP, positions, weapons and knockout state without reloading the whole application.

- [ ] **Step 5: Run source tests and commit**

Run: `node --test tests/danao-source.test.mjs`

```bash
git add unity/danao/Assets/Danao/Runtime/Arenas unity/danao/Assets/Danao/Runtime/Core
git commit -m "feat: add wrestling arena and local match loop"
```

### Task 6: Arcade menu, HUD and procedural audio

**Files:**
- Create: `unity/danao/Assets/Danao/Runtime/UI/ArcadeUi.cs`
- Create: `unity/danao/Assets/Danao/Runtime/Audio/ProceduralAudio.cs`
- Modify: `unity/danao/Assets/Danao/Runtime/DanaoGame.cs`

**Interfaces:**
- Produces: title/menu state flow `Title -> LocalPlay -> Join -> Setup -> Fight -> Results`.
- Produces: `ProceduralAudio.Play(SfxId id, Vector3 position)` and looping title/fight music.

- [ ] **Step 1: Implement title/menu UI**

Use a full-screen Unity canvas built in code with large angled/outlined panels, controller focus, `打闹` as the main title string and `Dǎnào` as supporting text. Local Play opens player join/setup rather than jumping directly into combat.

- [ ] **Step 2: Implement match settings controls**

Expose mode, active player count, Health Damage, Visible Bruising and Arena Hazards. Invalid combinations are disabled, e.g. 2v2 requires four players.

- [ ] **Step 3: Implement couch-readable HUD**

Each active fighter gets a corner/edge panel with display name, coloured marker, large health bar and numeric HP. Health Damage off shows `∞` beside the physical-impact status rather than decrementing HP.

- [ ] **Step 4: Generate original audio in code**

Create short PCM clips with `AudioClip.Create`: punch thump, grab pop, throw whoosh, squeak/boing, rocket, table break, knockout sting, round start and victory. Generate title music from drums, gong-like decays and a pentatonic motif; generate a simpler fight loop. No external audio file is required.

- [ ] **Step 5: Run source tests and commit**

Run: `node --test tests/danao-source.test.mjs`

```bash
git add unity/danao/Assets/Danao/Runtime/UI unity/danao/Assets/Danao/Runtime/Audio unity/danao/Assets/Danao/Runtime/DanaoGame.cs
git commit -m "feat: add Danao arcade UI and procedural audio"
```

### Task 7: Unity tests and project validation

**Files:**
- Create: `unity/danao/Assets/Danao/Tests/EditMode/Danao.EditModeTests.asmdef`
- Create: `unity/danao/Assets/Danao/Tests/PlayMode/Danao.PlayModeTests.asmdef`
- Create: `unity/danao/Assets/Danao/Tests/PlayMode/LocalMatchSmokeTests.cs`
- Create: `unity/danao/Assets/Danao/Runtime/Danao.Runtime.asmdef`
- Modify: `tests/danao-source.test.mjs`

**Interfaces:**
- Tests all public Slice A contracts and source invariants.

- [ ] **Step 1: Add assembly definitions**

Runtime assembly references Input System and Unity UI. EditMode/PlayMode assemblies reference the runtime and Unity Test Framework.

- [ ] **Step 2: Add PlayMode smoke test**

```csharp
[UnityTest]
public IEnumerator FighterStartsAtOneHundredHp()
{
    var settings = new MatchSettings();
    var fighter = FighterFactory.Create(0, "Stephen", Vector3.zero, settings);
    yield return null;
    Assert.AreEqual(100, fighter.GetComponent<FighterHealth>().CurrentHp);
}
```

Add tests for damage-off impulse path, ring-out elimination and rematch HP reset.

- [ ] **Step 3: Strengthen Node source validation**

Check required weapon names, `100` HP constant, all three settings, `1v1`, `2v2`, `打闹`, WebGL build target and Windows x64 build target.

- [ ] **Step 4: Run all repository Node tests available without Unity**

Run: `npm test`
Expected: existing Duck & Bear tests plus `danao-source.test.mjs` pass. Unity-specific EditMode/PlayMode tests are run by Unity Test Runner when Unity is available.

- [ ] **Step 5: Commit**

```bash
git add unity/danao/Assets/Danao tests/danao-source.test.mjs
git commit -m "test: cover Danao Unity vertical slice"
```

### Task 8: First-playable documentation and handoff

**Files:**
- Create: `unity/danao/README.md`
- Create: `docs/danao-first-playable.md`
- Modify: `README.md`

**Interfaces:**
- Documents exact editor/build/test commands and what is/not yet in Slice A.

- [ ] **Step 1: Document Unity open/run path**

State: open `unity/danao/` in Unity Hub using Unity 6, press Play, choose Local Play, join controllers, select 1v1/2v2/FFA/Royal Rumble and start the Wrestling Arena.

- [ ] **Step 2: Document command-line build methods**

```bash
Unity -batchmode -quit -projectPath unity/danao -executeMethod Danao.Editor.DanaoBuild.BuildWeb
Unity -batchmode -quit -projectPath unity/danao -executeMethod Danao.Editor.DanaoBuild.BuildWindows
```

- [ ] **Step 3: Record verification limits accurately**

Document that repository Node/static checks can be run in the current environment, while Unity compilation, PhysX feel, real controller mapping, WebGL frame rate and generated player binaries require a machine/CI runner with Unity 6 installed.

- [ ] **Step 4: Run repository tests one final time**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add unity/danao/README.md docs/danao-first-playable.md README.md
git commit -m "docs: document Danao first playable"
```
