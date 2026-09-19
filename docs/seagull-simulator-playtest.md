# Seagull Simulator: Dublin — hands-on play-test

Use this after CI is green. The point is to judge feel and real-device performance, not to discover whether files compile.

## Phone landscape

Play at least one 10-minute run.

Check:
- virtual stick responds immediately but flight still has a small arcade glide;
- the gull can change direction without feeling either twitchy or heavy;
- Dive steers toward a selected target but never feels like an uncontrollable auto-attack;
- holding Dive reaches the ground and waddle mode stays active until Flap;
- Grab feels fair at the green target-ring distance;
- Flap gets the gull out of danger quickly enough after a theft;
- controls do not overlap HUD or mission text;
- pause/resume works, including backgrounding the browser and returning;
- background the browser while holding Dive or Flap, then return and confirm no control remains stuck;
- rotate to portrait mid-run and confirm gameplay pauses behind the rotate screen;
- rotate back to landscape and confirm it resumes only when orientation caused the pause;
- phone stays in a usable landscape layout without accidental vertical scrolling.

## Desktop

Check keyboard movement with WASD and arrows, Space to dive/land, E to grab, Shift to flap/boost, and P/Escape to pause.

The mouse/tap target selection should not make keyboard movement feel secondary or awkward.

## Full-route run

Travel through all four areas in one run:

Dame Street → College Green → Grafton Street → St Stephen's Green.

Verify:
- Centra/SuperValu and the Dame Street shopfronts remain visible enough to identify;
- Luas stays within College Green;
- buses/taxis do not enter pedestrian Grafton Street;
- Grafton shopfronts, buskers and treats are visible;
- Stephen's Green reads immediately as a park, with pond/ducks/picnic detail;
- entering a new area is clear but does not interrupt play;
- no obvious hitch or stutter occurs at area boundaries.

## Risk / wanted loop

During one run:
- reach at least three wanted stars;
- allow a Garda to pursue at street level;
- escape upwards and confirm the Garda can lose sight rather than following forever;
- let heat cool fully and confirm the clear-heat feedback;
- test at least one defender/umbrella encounter;
- deliberately hit traffic once and confirm the recovery does not feel like an instant unfair death.

## Progression

Finish a run and confirm:
- score, food, best theft, combo, wanted peak, area count and active run time make sense;
- coins are awarded;
- Play Again goes directly into another run;
- a bird unlock or upgrade persists after a full browser reload;
- coins, selected gull, upgrades, trophies and lifetime stats survive a reload together;
- Trophy Cabinet shows real locked goals and correctly unlocked trophies;
- lifetime totals increase only when a run ends.

## Performance blockers

Treat these as blockers before merge:
- repeated visible stutter while flying normally;
- controls missing touch input;
- canvas becoming blank after background/resume;
- runaway sound repetition;
- traffic appearing in Grafton Street;
- Garda pursuit never disengaging;
- saved progression disappearing after a normal reload;
- result/progression screens clipping on a landscape phone.

Treat small speed, heat, coin-cost, grab-range and Garda-speed preferences as tuning rather than blockers.

## Weak-device / low-power check

On a weaker phone, or by forcing `?lowpower=1` in a local test build:
- the map, gull, food, Garda logic and missions must remain unchanged;
- fewer pigeons / simpler busker effects are acceptable;
- controls and stealing must feel identical;
- there must be no blank textures when landing/waddling;
- no obvious visual stutter should appear at area boundaries.

## CI artifact

Every green Seagull validation run publishes a `seagull-simulator-build` artifact containing the exact built browser-game folder. Use that artifact if a branch build needs to be tested independently of the live Duck & Bear deployment.
