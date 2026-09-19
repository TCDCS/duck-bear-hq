# Seagull Simulator: Dublin

## Locked direction

Seagull Simulator is a Duck & Bear browser game built with Phaser and TypeScript. It is a detailed cartoon arcade sandbox, not a flight simulator and not a full 3D reconstruction of Dublin.

The camera uses an angled/top-down feel. The player free-flies rather than being pushed forward. Mobile is landscape-first with a left virtual stick and Flap, Dive and Grab buttons. Desktop uses keyboard equivalents.

## Core loop

1. Free-fly around the current area.
2. Select or approach a person carrying food.
3. Dive to street level.
4. Grab the food at close range.
5. Climb away.
6. Build score and wanted level.
7. Survive traffic and Garda response.

The game should restart quickly after a run. Complexity belongs in the reactions and environment, not in the controls.

## World route

The final continuous route is:

Dame Street → College Green → Grafton Street → St Stephen's Green.

The first playable alpha deliberately contains Dame Street only. The next areas should extend the same world rather than become separate loading-screen levels.

## Visual direction

Detailed cartoon Dublin. Rough balance: 60% expressive cartoon, 40% recognisable real-world detail.

Environment detail should include shopfronts, windows, signs, paving, road markings, bollards, bins, traffic lights, hanging baskets, café furniture, bikes, buses, taxis, delivery riders, street clutter and moving pedestrians.

The seagull must remain the strongest character on screen: readable silhouette, oversized beak, expressive eyes, clear wing poses and exaggerated dive/grab movement.

## Dublin references

Real business names may appear as environmental references where useful, including Centra, SuperValu, Insomnia, McDonald's, Spar and Boots. Their appearance must not imply sponsorship or endorsement. Exact trademark artwork should be reviewed before any commercial/app-store release.

Garda characters are stylised and clearly recognisable through uniform colours, cap and high-vis treatment, without relying on exact official crest artwork.

Michael D. Higgins is a rare harmless cameo/background character. Real-person cameos are not attack targets and should remain non-political.

## Expansion order

1. Tune flying, dive, grab, collisions and camera.
2. Improve Dame Street art and animation.
3. Add proper NPC reactions and more food.
4. Add College Green and stronger Garda/wanted behaviour.
5. Add Grafton Street crowds, buskers and retail detail.
6. Add St Stephen's Green, benches, picnics, dogs, ducks and open-space gameplay.
7. Add gull unlocks, upgrades, missions and achievements.
8. Only then consider Duck & Bear account leaderboards or native mobile packaging.

## Release rule

Do not merge or deploy a new major gameplay stage solely because it compiles. The browser build should be played on phone and desktop first, with movement, controls, readability and restart behaviour checked.
