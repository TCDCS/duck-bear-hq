# Dǎnào Babylon/Rapier Browser Client Design

## Goal

Replace the Unity WebGL client for Dǎnào with a browser-native Babylon.js + Rapier 3D client while retaining the existing Duck & Bear URL, Cloudflare multiplayer services, profile APIs, Chinese title and arcade-brawler game design.

## Product direction

Dǎnào remains a colourful, exaggerated arcade physics brawler rather than a realistic or photorealistic game. The visual target is chunky readable silhouettes, bright materials, simple lighting, comic impact effects and responsive UI. Browser performance and fast iteration take priority over expensive rendering features.

The main title remains `打闹` with `Dǎnào` as the romanised title. The game remains browser-only.

## Migration strategy

The migration is staged so the existing Unity source and release infrastructure remain available until the Babylon client has proven parity. The public Dǎnào page changes to a normal HTML/DOM shell and Babylon canvas. Unity build files are not required by the new client, but the old launcher and release pipeline are left in the repository during the migration so rollback is possible.

The first shippable Babylon slice must provide a working main menu, local setup, one playable arena, browser-native keyboard/gamepad input, Rapier physics, health/damage/knockback and a complete return-to-menu loop. After that foundation is stable, the other arena themes, launch modes, character presentation, weapon roster and online room bridge are ported onto the same runtime.

## Runtime architecture

### Browser shell

`public/games/danao/index.html` owns the title screen, setup menus, loading/error states, HUD and canvas. Menu controls are real HTML buttons/selects so pointer, keyboard and accessibility behavior do not depend on the 3D engine.

`public/games/danao/danao.css` provides the arcade presentation and responsive landscape layout.

`public/games/danao/game.mjs` is the browser entry point. It loads Babylon.js and Rapier, starts/stops matches, reads input, drives the simulation and updates the DOM HUD.

During the first migration slice the engine packages are pinned browser ES modules. They are permitted only on the Dǎnào document CSP. A later packaging task may self-host/bundle these modules after gameplay parity is proven; no game logic should depend on a CDN-specific API.

### Rendering

Babylon.js provides WebGL/WebGPU-capable 3D rendering. Dǎnào uses simple procedural meshes, Standard/PBR materials with restrained specular response, hemispheric/directional lighting and lightweight particles. The scene should look deliberately cartoon-like rather than like untextured realistic geometry.

A fixed arcade camera frames the arena and follows the midpoint of active fighters without requiring mouse-look.

### Physics

Rapier 3D owns rigid-body simulation. Static arena surfaces use fixed bodies/colliders. Fighters use dynamic bodies with locked rotations and capsule/cuboid colliders. Movement is expressed as controlled planar velocity plus impulses for attacks, throws and hazards. Rendering meshes mirror Rapier transforms each frame.

The simulation uses a fixed physics step and caps accumulated frame time so a background-tab return cannot explode the simulation.

### Input

Menus use native DOM pointer/keyboard input. Match input is read from `KeyboardEvent` state and the browser Gamepad API.

Player 1 keyboard defaults:

- Move: WASD / arrow keys
- Attack: Space
- Dash/grab context: Shift
- Pause/back: Escape

Connected gamepads use left stick/D-pad for movement, south face button for attack and east/west/shoulder buttons for context actions. Gamepad polling is per-frame and controller loss does not crash the match.

### Combat

Each fighter starts at 100 HP. An attack checks a short forward/radial range, applies bounded damage and a knockback impulse, then enters a cooldown. Hits create a brief flash/particle effect and update the HUD immediately.

A fighter reaching zero HP is knocked out for the current round. The first slice ends the round when one fighter remains. Later launch modes can supply different win conditions without changing fighter physics.

### Arenas and characters

Arena and character definitions are data objects rather than engine-specific classes. The initial catalog exposes all planned arena names and eight character slots, while the first production-quality scene is the Wrestling Arena. Additional arenas reuse procedural primitives and theme helpers.

The arena catalog retains these eleven locations:

1. Wrestling Arena
2. Dublin Docks
3. London Underground
4. Mango Market
5. Temple Courtyard
6. Sichuan Tea House
7. Ice Festival
8. House Party
9. Toy Factory
10. Cruise Ship
11. Mad Circus

### Online and profiles

Existing Cloudflare routes under `/api/danao/*` remain unchanged during the client migration. The Babylon client will later connect to the existing room/create/join/profile endpoints rather than replacing the backend.

The browser-native client must not expose reconnect passes or private account data. Existing signed-in profile semantics remain owner-scoped.

## Error handling

Loading failure shows a visible browser-native error card with a Retry button. Rapier/Babylon initialization errors are caught at the entry point. A failed gamepad read is treated as no controller input. A match can always be abandoned back to the menu without reloading the page.

## Performance constraints

- Browser-only target.
- No photorealistic requirement.
- Avoid large textures and imported models in the first migration slice.
- Use procedural geometry and reusable materials.
- Fixed-step physics at 60 Hz with frame catch-up cap.
- Keep DOM menus outside the render loop.
- Avoid per-frame object allocation in hot input/physics paths where practical.

## Security and hosting

The game remains served at `/games/danao/` through the existing Cloudflare Worker/static assets configuration. The Dǎnào document retains the narrow WebAssembly CSP allowance needed by Rapier. Any temporary external engine module host is allow-listed only for the Dǎnào page, not the rest of Duck & Bear.

The game does not add chat, tracking, microphone, camera or public account data.

## Verification

Repository tests must verify:

- the Dǎnào page loads `game.mjs` rather than depending on Unity startup;
- Babylon and Rapier are pinned;
- the HTML contains native Local Play/setup controls;
- the arena catalog contains all eleven names;
- 100 HP and the fixed-step simulation are represented in the client;
- the Dǎnào CSP allows only the required engine host plus existing same-origin/WebSocket access;
- the existing Dǎnào API/backend files remain unchanged by the first migration slice.

Browser acceptance verifies that Local Play can be clicked, setup opens, a match starts, keyboard input moves Player 1, attack changes opponent health and Return to Menu works.
