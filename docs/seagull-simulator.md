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

The current alpha contains the full continuous route. There are no loading screens between Dame Street, College Green, Grafton Street and St Stephen's Green.

## Visual direction

Detailed cartoon Dublin. Rough balance: 60% expressive cartoon, 40% recognisable real-world detail.

Environment detail should include shopfronts, windows, signs, paving, road markings, bollards, bins, traffic lights, hanging baskets, café furniture, bikes, buses, taxis, delivery riders, street clutter and moving pedestrians.

The seagull must remain the strongest character on screen: readable silhouette, oversized beak, expressive eyes, clear wing poses and exaggerated dive/grab movement.

## Dublin references

Real business names may appear as environmental references where useful, including Centra, SuperValu, Insomnia, McDonald's, Spar and Boots. Their appearance must not imply sponsorship or endorsement. Exact trademark artwork should be reviewed before any commercial/app-store release.

Garda characters are stylised and clearly recognisable through uniform colours, cap and high-vis treatment, without relying on exact official crest artwork.

Michael D. Higgins is a rare harmless cameo/background character. Real-person cameos are not attack targets and should remain non-political.

## Current build priorities

1. Tune flying, dive, landing, waddle, grab, collisions and camera.
2. Improve character animation and environment detail across all four areas.
3. Tune NPC reactions, Garda pursuit, wanted heat, food recycling, missions and combos.
4. Tune the local gull unlocks and the Wings, Beak and Nerve upgrade costs. Keep boosts small.
5. Add achievements only after progression has been play-tested.
6. Only then consider Duck & Bear account leaderboards or native mobile packaging.

The map scope is closed for the first release. Do not add more Dublin areas until the four-area route is polished and performs well on mobile.

## Release rule

Do not merge or deploy a new major gameplay stage solely because it compiles. The browser build should be played on phone and desktop first, with movement, controls, readability and restart behaviour checked.

## Local progression

The alpha uses local-device progression only. Run coins are earned through play and cannot be bought. The four gulls are Dublin Gull, Big Lad, Sneaky Gull and Absolute Unit. Upgrade tracks are Wings, Beak and Nerve, each capped at five small levels. Keep this system simple and avoid login streaks, premium currency or pay-to-win mechanics.

## 0.9 alpha checkpoint

The current feature branch has moved beyond the original MVP. It now includes:

- the complete four-area route with no level loading screens;
- smoothed arcade flight, short dive assist, landing and waddling;
- wanted heat, Garda line-of-sight loss, defender reactions and traffic hazards;
- eight food types with area-specific weighting and crowd mixes;
- local coins, four gulls and three five-level upgrade tracks;
- eight local trophies plus lifetime run statistics;
- richer end-of-run summaries and instant retry;
- automatic/manual pause and safe local-storage fallbacks;
- mobile-landscape layouts and portrait rotation guidance;
- lightweight ambient pigeons, animated Grafton buskers and a cooldown-limited Luas bell;
- a mobile optimisation pass that leaves only the player gull in Arcade Physics and culls distant pedestrian updates.

The map and major-system scope is closed for the first release. Future work before merge should be driven by hands-on feel/performance findings rather than adding more streets, currencies, menus or modes.

## Build 1.0 release rule

Build 1.0 is the first live Duck & Bear release. The opening game screen must visibly show **BUILD 1.0** before play begins. The Duck & Bear homepage and Games hub also surface Build 1.0.

Do not create another pre-release version number after this point. Any remaining branch changes before deployment are release-candidate hardening for Build 1.0. Once the exact Build 1.0 head passes the full validation matrix, the release path is: mark PR #61 ready, merge to main, verify the normal site deployment, then confirm the live game displays Build 1.0.
