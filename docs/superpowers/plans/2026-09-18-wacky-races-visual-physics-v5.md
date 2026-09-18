# Wacky Races v5 — visual, landmark and physics upgrade

Date: 18 September 2026
Branch: `wacky-races-visual-physics-v5`

## 1. Goal

Upgrade Wacky Races without replacing the existing browser engine, online rooms, race rules or seven-racer limit.

The handling target is deliberately arcade-first: approximately **85% arcade / 15% believable vehicle behaviour**. Steering must remain easy on keyboard, touch and gamepad. The extra realism is used only to give vehicles clearer weight, grip, suspension and collision response.

The visual target remains a colourful slapstick cartoon racer, but with substantially more environmental detail, stronger local identity and deliberately staged landmark views.

## 2. Locked design rules

1. Do not turn the game into a simulation.
2. Keep drifting forgiving and readable.
3. Do not add moving traffic beyond the seven racers.
4. Preserve deterministic fixed-step multiplayer physics.
5. London and Dublin service vehicles must be visibly different.
6. Major landmarks must be staged around the racing camera, not merely placed somewhere in the world.
7. The important landmark on a section should normally become visible ahead of the player, with a left-side bias where the route supports it.
8. Generic buildings, trees and street furniture must not block hero-landmark sightlines.
9. Keep the slapstick tone, bright colour palette and exaggerated proportions.
10. High-detail scenery must have a low-detail equivalent so mobile/browser performance stays acceptable.

## 3. Phase A — handling and physics

### A1. Steering and grip

Replace the current mostly linear steering response with an arcade speed-sensitive curve.

Expected behaviour:
- Low speed: quick steering for recovery and tight corners.
- Medium speed: responsive arcade handling.
- High speed: slightly reduced steering authority so the vehicle feels planted rather than twitchy.
- Steering release: chassis settles naturally instead of snapping immediately.
- Assist remains helpful but does not fight the player.

### A2. Drift

Keep the existing hold-to-drift control, but make the transition progressive.

Expected behaviour:
- Drift grip reduces gradually rather than feeling like a sudden switch.
- Drift angle is limited enough that players can save a slide.
- Releasing a charged drift still gives the existing boost reward.
- Buses and ambulances drift less aggressively than karts.
- Police/Garda cars sit between karts and heavy vehicles.

### A3. Vehicle character

Retune the four classes.

Kart:
- light
- fastest response
- strongest drift rotation
- weakest collision authority

Police / Garda:
- planted
- good acceleration
- slightly heavier steering
- strong recovery after contact

Ambulance:
- heavier
- slower transition
- more body roll
- stable once settled

Bus:
- heaviest
- slow steering response
- obvious body roll
- hardest vehicle to shove sideways
- still usable and fun, not deliberately bad

### A4. Suspension and chassis motion

Use the existing roll, pitch and heave model more strongly rather than adding expensive wheel physics.

Add:
- clearer pitch under braking and acceleration
- progressive body roll
- stronger but damped impact heave
- extra bus/ambulance roll scale
- quick settle so the camera never becomes unpleasant

### A5. Collisions

Improve arcade collision response using mass and relative velocity.

Requirements:
- side hits create readable lateral knockback
- rear impacts transfer some momentum
- heavy vehicles win contact without becoming immovable
- low-speed rubbing should not create violent impulses
- wall contact should scrape and slow the car rather than repeatedly bounce it
- all outcomes remain deterministic across 30/60/120 Hz callers

### A6. Surface behaviour

Keep normal road forgiving.

Add lightweight grip modifiers:
- road: 100%
- road paint / smooth bridge deck: about 96–98%
- wet-looking quayside or selected decorative zones: about 92–95% only where clearly telegraphed
- grass/verge: strong speed loss and weaker steering
- pizza/whiskey hazards remain much stronger than normal surface differences

This must not become a tyre or weather simulation.

## 4. Phase B — country-specific vehicle art

### B1. London police

Create a clearly British/London-inspired police racer:
- white base
- blue/yellow high-visibility pattern
- UK-style roof lightbar
- different front grille/headlight treatment
- black lower trim and wheel-arch detail
- readable POLICE-style fictional marking without copying protected insignia

### B2. Dublin Garda

Create a visibly separate Irish Garda-inspired racer:
- Garda-blue / high-visibility treatment
- different body proportions from the London police car
- separate roof lightbar
- GARDA-style fictional track livery
- Irish registration-style plate proportions where visible
- no official crest

### B3. London bus

Rebuild the London bus silhouette so it immediately reads as the iconic red double-decker:
- bright red body
- rounded modern front
- broad upper and lower windscreens
- two rows of side windows
- front/rear destination boards
- black/yellow detail around doors and lights
- fictional route display such as W9 / WESTMINSTER / CAMDEN

### B4. Dublin bus

Build a separate Dublin double-decker:
- Dublin-inspired green/blue/yellow colour family
- visibly different front and window treatment from London
- Irish route display such as 46A
- different bumper, light and door arrangement
- no simple recolour of the London mesh

### B5. Ambulances

London:
- yellow/green UK-inspired high-visibility appearance

Dublin:
- Irish white/green/yellow emergency appearance

Both retain the same gameplay class but get country-specific body detailing.

### B6. Parked scenery vehicles

Only use the appropriate versions in each country:
- London: red double-deckers, black cabs, London police/ambulance
- Dublin: Dublin-style buses, Garda cars, Irish ambulance/service vehicles

No inappropriate London service vehicle should appear as Dublin set dressing and vice versa.

## 5. Phase C — landmark staging

Introduce explicit landmark approach zones rather than relying on fixed world placement alone.

Each hero landmark receives:
- an intended approach direction
- a first-reveal distance
- a hero-view distance
- a side-of-road preference
- a sightline exclusion zone

Generic procedural scenery must respect these exclusions.

### C1. Westminster Wobble

Hero sequence:
1. Elizabeth Tower / Big Ben appears ahead-left.
2. Parliament mass extends behind it.
3. Westminster Bridge/Thames becomes visible.
4. London Eye is visible across the river as a secondary landmark.

Increase tower detail:
- clock faces
- roof/spire profile
- stronger stone bands
- window recesses
- more recognisable Parliament silhouette

### C2. Camden Caper

Hero sequence:
1. colourful Camden market frontage ahead-left
2. railway/market arches
3. canal/lock reveal
4. dense signs, stalls and street-art details

Avoid generic terrace buildings covering the market approach.

### C3. Docklands Dash

Hero sequence:
1. Tower Bridge towers visible in the middle distance
2. bridge structure becomes the dominant approach target
3. skyline behind it provides depth
4. waterside/industrial detail reinforces Docklands

### C4. Hyde Park Hustle

Hero sequence:
1. major park-edge landmark or entrance feature
2. dense tree avenue
3. Serpentine reveal through controlled gaps in the foliage
4. bandstand/picnic details as secondary scenery

Tree placement must deliberately preserve view corridors.

### C5. Regent Street Rush

Hero sequence:
1. sweeping curved stone façades
2. major junction reveal
3. flags, buses, cabs and storefronts
4. stronger roofline and cornice detail

The route should feel like a grand street canyon rather than generic repeated blocks.

### C6. Liffey Lunacy

Hero sequence:
1. O’Connell/central Dublin approach with the Spire ahead-left
2. GPO clearly visible close to the approach
3. Liffey and bridge reveal
4. Ha’penny Bridge as a secondary moment
5. Samuel Beckett Bridge as a later major reveal
6. Poolbeg towers as distant orientation landmarks

Dublin hero objects must not be hidden behind random Georgian buildings or trees.

## 6. Phase D — environment detail

Add detail in layers so the scene remains readable at racing speed.

Road:
- more varied tarmac shading
- manholes
- drains
- patched sections
- arrows and crossings where appropriate
- more believable kerbs
- bridge deck variation

Pavement:
- bins
- bollards
- benches
- railings
- traffic lights
- bus stops
- planters
- café furniture
- poster/sign frames

Buildings:
- deeper window recesses
- sills
- lintels
- cornices
- roof caps
- chimneys
- shop awnings
- entrance depth
- selective lit/interior colour variation

Water:
- layered animated surface response in shader where performance allows
- brighter highlights
- darker depth tone
- quay wall/reflection cues

Vehicles:
- wheel arches
- bumpers
- mirrors
- grilles
- light clusters
- body panel separation
- improved wheels

## 7. Phase E — rendering polish

Keep the current native WebGL engine.

Improve:
- sun/ambient balance
- fog/depth separation
- contact/shadow readability
- material response for glass, metal, road, water and foliage
- slightly longer landmark visibility where performance permits
- subtle speed presentation without excessive blur

Do not add a dependency-heavy external 3D engine.

## 8. Performance budget

High quality:
- hero landmark geometry may be substantially richer
- procedural filler remains economical
- scene must remain below the existing 500,000-triangle test ceiling
- keep draw architecture compatible with current single-world mesh approach

Low quality:
- reduce round-box subdivisions
- reduce cylinders/spheres
- reduce decorative props
- retain landmark silhouettes and route identity

Mobile must not lose the important landmark views just because detail is reduced.

## 9. Code areas

Primary:
- `src/kart-assets/core.js.txt` — handling/physics
- `src/multiplayer/core.mjs` — exact deterministic physics mirror
- `src/kart-assets/models.js.txt` — country-specific service vehicles and Dublin models
- `src/kart-assets/scenery.js.txt` — landmark staging, sightlines and street detail
- `src/kart-assets/renderer.js.txt` — camera/material/render polish
- `src/kart-assets/shaders.js.txt` — water/material/lighting polish if needed

Tests:
- `tests/physics.test.cjs`
- `tests/scene.test.cjs`
- add vehicle-country differentiation and landmark-sightline tests

## 10. Acceptance criteria

Physics:
- fixed-step deterministic test passes
- 30/60/120 Hz equivalence remains within tolerance
- AI can finish every circuit in every class
- manual recovery remains exploit-safe
- bus visibly feels heavier than kart
- normal steering remains easy on keyboard/touch

Vehicles:
- London police and Garda are different meshes/liveries
- London and Dublin buses are different meshes, not simple recolours
- country-specific parked vehicles are correct
- all service meshes remain finite and bounded

Landmarks:
- each track has at least one deliberately staged hero landmark
- Westminster and Dublin hero landmarks are visible ahead on the intended approach
- procedural filler does not occupy registered hero sightline exclusion zones
- Dublin retains Spire, GPO, Temple Bar, Ha’penny Bridge, Samuel Beckett Bridge and Poolbeg

Visual:
- scene still works in low-quality renderer
- triangle budget tests pass
- no moving traffic is reintroduced
- seven-racer rule is unchanged

## 11. Build order

1. Physics tuning and tests.
2. London/Dublin service vehicle split.
3. Landmark sightline system.
4. Westminster + Dublin hero passes first.
5. Camden, Docklands, Hyde Park and Regent Street hero passes.
6. General street/detail pass.
7. Renderer/material polish.
8. Full regression tests.
9. Before/after browser screenshots.
10. Merge/deploy only after the visual difference is obvious and the physics tests remain green.
