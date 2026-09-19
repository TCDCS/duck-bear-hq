# Last Luas — hand-drawn overhaul specification

**Status:** Design for review. No replacement game code or deployment is included in this document.
**Date:** 19 September 2026
**Project:** Duck & Bear / Last Luas
**Existing repository:** TCDCS/duck-bear-hq
**Source baseline reviewed:** `1cbfc60c52db4bdeb31d2b4ecadb8ce9dca87785`
**Proposed release family:** `1.0.0-inked`; preview builds must remain labelled previews.

## 1. Purpose and decisions

Replace the current block-based PlayCanvas presentation with a hand-drawn, inked cartoon runner. Retain the simple race to the last Luas, the existing Duck & Bear Games location, keyboard/touch controls and a 90-second normal run.

The result must be judged in the browser while playing, not from a promotional image. Finished artwork is a core deliverable, not a later addition to a skeleton.

The agreed direction is a custom Canvas 2D renderer, following Mango Mayhem's general organisation. Keep the behind-the-runner view and create perspective using illustrated scenery and sprites. This is not a side-scrolling conversion and not a free-roaming 3D environment. Mango's existing renderer uses `getContext('2d')` and separate scenery/character modules [R1].

Use recognisable, reference-checked Dawson Street frontages and genuine shop logos. Do not substitute an approximately similar font and call it the official logo. The existing Last Luas `signMaterial()` draws text in Arial; that does not meet the requested logo requirement [R2].

### 1.1 Scope

Deliver one finished Dawson Street route, one finished runner, all eight requested obstacle families, an illustrated tram/platform finish, sound controls, pause/menu/restart, local best-run records and integration with the existing Games surfaces. First prove the art on one short continuous street section before extending the route.

### 1.2 Exclusions

No Unity, PlayCanvas dependency in the replacement, new multiplayer service, open-world map, shop interiors, live transport feed, public leaderboard, purchases, advertising or new paid subscription. Do not redesign Mango or any other game to support this work. Do not generate another marketing picture as a substitute for playable evidence.

### 1.3 Intended access

The owner says this is only for personal play. The proposed release therefore keeps the branded game owner-only through the existing account system. This access proposal needs confirmation with this specification. The Games card remains in the same location, with a private/sign-in label for visitors. Other games remain unchanged.

Personal use is not a blanket copyright or trademark permission. Access control is a privacy/distribution measure, not a licence. Exact branding remains a requirement; missing assets or unresolved reuse terms are recorded honestly rather than silently replaced [R8].

## 2. What changes and what is retained

| Area | Decision |
|---|---|
| 3D building, people and prop primitives | Replace with authored illustrated assets. |
| Existing nameboards | Replace with verified logo/sign artwork; no Arial fallback in an accepted build. |
| Dark street and full-screen diagonal rain | Replace with legible blue-hour colours and restrained rain. |
| Existing movement/collision implementation | Preserve the intended controls, not untested code. Rebuild as independent simulation modules. |
| Countdown and finish | Preserve 90 seconds; define boarding, missed departure and pause correctly. |
| Duck & Bear navigation | Preserve Games hub, homepage card, signed-in Games card and return links. |
| Existing account and other games | Reuse narrowly; do not alter their data or behaviour. |
| Old build | Preserve in Git history and as a rollback reference; do not delete or replace live during design. |

The current game combines rendering, movement, input, sound and state in one module. Its collision check allows a jumpable object to be cleared simply when the runner is airborne; the replacement must compare actual collision height. Its time step caps each frame's elapsed time, so the replacement needs a defined slow-frame policy rather than assuming 90 displayed seconds equals 90 elapsed playing seconds [R2]. These observations identify work; this document does not claim a runtime regression test has been run.

## 3. Visual specification

### 3.1 Style

Use deliberate dark ink outlines, clean colour blocks, two or three shading tones, restrained paper/brush texture and rounded cartoon characters. Avoid photorealism, heavy crosshatching over gameplay lanes, voxel people, rectangle-bodied pedestrians and filter-based attempts to disguise unfinished geometry.

The environment should be more detailed than the HUD. Frame the action with shopfront detail, but keep the central route readable. Building identity comes from proportions, window divisions, doors, signage, materials and frontage layout—not from putting a shop name on a generic wall.

### 3.2 Colour and lighting

Start with blue-hour evening: visible blue sky, warm shop windows, legible grey-blue road and pavement, green/cream/brick frontages where supported by references. Keep the runner and obstacles distinct in silhouette and value as well as colour.

Wet highlights and reflections are illustrated/composited effects. They must not be described as physically accurate reflections. Any animated reflection must stay attached to the relevant lamp, shop or tram rather than slide independently over the road. Detail, not bloom or darkness, should sell the street.

### 3.3 Camera and framing

Use a fixed forward-looking perspective with tightly limited lateral following. Keep the whole runner visible, including foot contact and jumping clearance. Three movement corridors converge towards the horizon without painting three artificial road lanes through Dawson Street.

Landscape targets 1920 × 1080; portrait targets 1080 × 1920. These are maximum high-quality drawing targets, not compulsory output on every device. Maintain the viewport aspect ratio and recalculate the composition on resize. Never crop away an obstacle corridor or stretch the picture to fill a phone.

The runner should occupy roughly 22–28% of the playable view height. This is an initial art target to validate at browser size. Keep HUD/buttons outside the immediate obstacle-reading area. Decorative facade detail may be reduced at distance, but lane safety cues may not disappear.

### 3.4 Artwork production

Create editable, layered source artwork for each featured frontage, character and obstacle family. Export clean transparent PNG/WebP sprites and runtime facade textures. Keep linework, colour, shading, window glow and sign placements separately editable in the master.

Drawing tools or generated base art may assist, but any assisted artwork requires cleanup and consistent proportions. Generated lettering never qualifies as a real logo. No per-frame random line jitter: it makes ink shimmer rather than look hand-drawn.

Approve artwork both at its maximum on-screen size and while approaching in perspective. An attractive source image that becomes an unreadable sliver in gameplay fails the visual check.

## 4. Dawson Street reference plan

### 4.1 Do not inherit the old layout as fact

Do not reuse the current 430-unit length, left/right placement, shop spacing, platform position or destination merely because it is already coded. Postal numbers alone do not establish the order encountered along a route.

Compile a dated reference sheet with the start point, travel direction, footprint/position of each frontage, side of the street, junctions, track alignment, platform side and finish point. Use official business pages to check addresses; use suitable map data and dated street photographs to establish physical placement.

The approved playable route must end at the verified boarding platform. Do not move Dawson stop to an arbitrary end of the road to fit the timer. Do not cram all named businesses together if they are not neighbours.

### 4.2 Initial source register

These are confirmed source leads, not completed facade surveys or cleared logo downloads.

| Subject | Evidence checked | Remaining requirement |
|---|---|---|
| ARKET | Official store page lists 60 Dawson Street [R3]. | Check exact frontage, side, current sign variant and original logo asset. |
| Hodges Figgis | Official Find Us page lists 56–58 Dawson Street [R4]. | Check facade photograph date, shopfront lettering and original artwork. |
| Café en Seine | Official contact page lists 39/40 Dawson Street [R5]. | Check entrance/sign variant and its position relative to the chosen route. |
| The Ivy Dawson Street | Official restaurant page lists 13–17 Dawson Street [R6]. | Check location-specific branding against the physical frontage. |
| The Dawson Lounge | Present in the old game; not independently verified in this research pass. | Confirm current location, frontage and branding before inclusion. |
| Dawson Luas stop | Official Luas stop information exists [R7]. | Verify platform coordinates, approach direction, boarding side and destination for the chosen run. |

Include any other business actually present in the selected visible frontage run after the same checks. Do not swap it for a more recognisable brand from elsewhere.

### 4.3 Reference sourcing rules

Prefer owner-supplied photographs, official business frontage imagery with appropriate reuse terms, and individually licensed photographs. Record photography dates separately from the date a page was accessed. Where two sources disagree, resolve the difference before the asset is marked verified.

OpenStreetMap can supply an initial geometric reference, subject to its attribution and ODbL obligations. Assess obligations for any derived database separately from the game's own artwork; do not label all game art ODbL by default [R9].

Do not scrape Street View, bulk-download it, remove attribution or bake its screenshots into game scenery. Viewing permission does not establish permission to build an asset dataset from imagery. Check source-specific terms; Google Maps restrictions apply separately from the rights in the photographed subject [R10].

## 5. Real logos: required asset standard

### 5.1 What counts

Use an original SVG or a high-resolution transparent raster supplied by the brand, its authorised press/media resources, or another source whose provenance can be checked. A website header logo may differ from the fascia on Dawson Street; record and match the relevant variant.

Do not use search thumbnails, a fan redraw presented as official, generic-font text, generated lettering, stretched logos, mirrored lettering or invented straplines. Use the real symbol, letterforms, spacing and colours. No unnecessary recolouring to fit the illustration palette.

Normal perspective placement on a building is expected. Start from the correct unwarped artwork and apply the same scene projection as the facade. It must not float above the shop as a HUD label.

### 5.2 Asset record

Every shop identity record must contain: stable brand/asset ID; official source page; exact source file URL when available; source owner; retrieval date; original filename/format/dimensions; SHA-256 hash; physical frontage/sign variant; allowed alterations or export notes; usage terms/permission basis; attribution requirements; review status; and the scene IDs that use it.

Keep authenticity, location verification and reuse review as separate fields. An authentic file can still have restricted reuse. A verified address does not verify the logo.

### 5.3 Unavailable or unclear artwork

Mark it `source-needed` or `reuse-review-needed`. Keep a visible review flag in the private development build. Do not claim that logo is complete and do not publish an approximation under the label “real logos”. First seek a suitable official file; request the specific missing item only when that route has failed.

No logo files were downloaded, cleared or installed by this specification. The initial register contains source pages and verification requirements only.

### 5.4 Storage and access

The reviewed GitHub repository is public. A private game page does not make logo files committed to a public repository private. Keep restricted original artwork, private permission records and branded review captures outside that repository. Store runtime branded assets in private R2 storage, served only after the game's owner check. Never expose an R2 public bucket URL or unauthenticated alternate asset route.

Brand artwork should not be hotlinked from business websites during play. Approved copies are versioned and served through the game's controlled asset route. Credits record owners and provenance; they are not presented as a substitute for permission [R8].

## 6. First playable art proof

### 6.1 Deliverable

Build approximately 120–180 metres of one continuous, reference-checked stretch, with at least four individually authored near-view frontages. This range is an art-production target, not a claim about measured street length. Choose the exact endpoints after the reference sheet is checked.

Include the finished runner, one real-logo frontage visible at useful scale, bollard/bin, tourist and cyclist obstacles, appropriate street furniture, light rain, warm windows and the actual perspective renderer. Show the same visual quality in a paused frame and while running.

If that stretch does not reach the verified stop, it is an art-preview course, not a fabricated full Dawson-to-platform route. Review the tram/platform art separately until the correct section joins it. Do not compress the entire street into that sample.

### 6.2 Acceptance before extension

The owner reviews an actual in-browser sample or a recording of that sample. The sample must contain the exported game assets, not an overlaid concept image. The owner confirms the ink style, runner proportions, perspective, signage legibility and overall quality before more frontage artwork is produced.

If it still looks like geometric placeholders with outlines, revise the artwork. Do not respond by adding more rain, generic props or a new version number.

## 7. Game rules

### 7.1 Session and controls

Use separate loading, menu, running, paused, boarding, won, missed and error states. The timer starts only after Play and any visible countdown. Left/right arrow or A/D changes corridor; Space/Up/W jumps. Swipe left/right changes corridor; tap jumps. On-screen buttons remain available.

Escape opens the in-game pause/menu with Resume, Restart and Back to Games. Do not send the user out of the game on an accidental press. Button/menu taps must not also jump; a swipe must not also count as a tap. Ignore queued gameplay input while paused, loading, in menus or after a result. Clear pointer state on cancellation and focus loss.

### 7.2 Countdown and distance

Normal mode has 90 seconds of active play. Maintain a monotonic active-play clock, excluding explicit pause and tab-hidden time. A slow frame must not secretly grant extra time. Use a fixed simulation step and swept collision checks; reconcile elapsed active time without letting low frame rates skip hazards. A long suspension pauses visibly rather than jumping the player forward.

Record distance using the surveyed route coordinate system. Tune speed, obstacle encounters and recovery penalties against that route; do not falsify street length to hit a desired duration. The clean run must be achievable with visible spare time. Repeated mistakes must be capable of causing a miss.

### 7.3 Collision and recovery

Define bounds independently from sprite transparency. A jump succeeds only if the feet clear the relevant obstacle during overlap. An airborne boolean is insufficient. Tall people, bicycles, umbrellas and barriers require a corridor change unless a specific obstacle is explicitly designed as jumpable.

Collide against current physical positions, including during corridor changes and pedestrian movement. Prevent tunnelling at low frame rates. One contact produces one recovery penalty, not a penalty every frame. Use a short stumble and recovery animation with temporary collision protection. Keep the remaining safe route visible.

### 7.4 Obstacles

| Family | Behaviour and cue |
|---|---|
| Bollard | Fixed low hazard; clearly distinguish jumpable and non-jumpable variants. |
| Bin | Fixed or visibly rolling; wheels/body establish movement before entry. |
| Cyclist | Readable lateral approach; no unexplained teleporting. |
| Tourist | Map/phone gesture before a stop or turn. |
| Umbrella | Clear silhouette; any contact vignette must be brief and not hide the next required response. |
| Delivery rider | Distinct rider/bag shape and signalled corridor drift; do not borrow a delivery-company logo by default. |
| Roadworks | Cones/barriers guide a viable path; paired closures leave a safe route. |
| Person stopping | Walk-to-stop animation provides warning; collision follows their actual stopped position. |

Use validated obstacle patterns and a seeded selector. Buildings and businesses remain fixed. Do not add “randomness” that can close all three corridors or require contradictory inputs. Initial target: allow at least about 1.2 seconds to read a newly hazardous movement at normal speed; verify at the smallest supported layout and tune rather than assume.

### 7.5 Luas finish

Define the finish against the actual platform, not a tram-distance threshold that ignores side or height. The runner must reach the boarding area while grounded and while boarding is available. A successful run ends in a short step-inside animation.

Use a visible departure warning, then door-closing animation, then tram departure. The Luas may start pulling away alongside a late runner, but closed doors on a moving tram are a miss—not an invisible success trigger through its front. The dramatic moving-tram scene can be the failure payoff while the final valid chance is reaching the doors before closure. Do not imply real trams can be boarded while moving.

Early arrival counts as success; do not force an artificial wait to show the dramatic sequence. Once a result is decided, later animation events cannot reverse it. Time is the same clock for runner, doors and departure; all pause together.

## 8. Renderer and architecture

### 8.1 Technical choice and limits

Use JavaScript ES modules and Canvas 2D, with lightweight type checking/JSDoc for module contracts. This matches the existing Mango code style without a framework migration. No PlayCanvas or remote engine CDN in the new Last Luas bundle. Other games keep their dependencies.

Canvas can draw and scale finished images and sprite frames [R11]. It does not make the artwork automatically: the asset production and quality checks above remain essential.

### 8.2 Perspective

One projection module owns the horizon, camera distance, road widths and conversion from world position to screen position. Use it for sprites, shadows, tram, platform and collision debugging. Sort visible objects from far to near. Clip content outside the view and maintain a minimum near-plane distance.

Facade art must stay on the sides of the street rather than face the player like floating billboards. Project the facade plane corners, subdivide into a bounded number of strips/triangles, and draw clipped affine image sections. Canvas's ordinary transform is affine; a single rotated/scaled image is not a general perspective warp [R12]. Validate seams, sign readability and performance in the short art proof before extending this system.

Start with a small adaptive subdivision budget, cached source textures and limited near facades. Do not promise unmeasured full-street performance. If the projection fails the visual/performance gate, revise the view or rendering design before committing to a larger asset set; an engine switch requires a new explicit decision.

### 8.3 Proposed code structure

The following paths are a design, not created implementation files.

```text
public/games/last-luas/
  index.html                 Menu, canvas, HUD and accessible controls
  game.css                   Scoped layout and inked UI
  main.mjs                   Composition and lifecycle only
  release.json               Version, commit and asset-set identifiers
  core/
    config.mjs               Validated gameplay settings
    session.mjs              Session state transitions
    clock.mjs                Active-play time and pause accounting
    world.mjs                Authoritative run state
    movement.mjs             Corridor movement and jump motion
    collisions.mjs           Bounds, height and swept checks
    patterns.mjs             Seeded, solvable obstacle encounters
    departure.mjs            Boarding/doors/tram outcome
  render/
    projection.mjs           World-to-screen conversion
    facade-warp.mjs          Perspective facade image sections
    scene.mjs                Culling, ordering and composition
    sprites.mjs              Frame selection and foot anchors
    effects.mjs              Restrained rain, splashes and highlights
  content/
    route.mjs                Verified route positions and source IDs
    obstacles.mjs            Behaviour and collision definitions
    animations.mjs           Animation states and timings
  platform/
    assets.mjs               Authenticated manifest loading/decoding
    input.mjs                Keyboard/pointer/button event mapping
    audio.mjs                Pausable sound and volume controls
    save.mjs                 Versioned local settings and scores
  ui/
    views.mjs                Menu, help, pause and result views
    hud.mjs                  Timer, goal distance and feedback

src/last-luas/
  access.mjs                 Owner authorisation using existing sessions
  routes.mjs                 Protected page/assets and strict routing

private R2 prefix: last-luas/inked/<asset-set>/
  manifests/                 Approved image/audio pack and hashes
  frontages/                 Exported illustrated facade assets
  brands/                    Verified logos and approved variants
  characters/                Runner and pedestrian sprites
  props/                     Obstacles and street furniture
  transport/                 Tram and stop artwork
  audio/                     Licensed or original effects

scripts/
  last-luas-assets-check.mjs  Asset/hash/reference/size checks
  last-luas-browser.mjs      Real browser interaction/capture checks

tests/
  last-luas-core.test.mjs
  last-luas-routing.test.mjs
  last-luas-assets.test.mjs
```

Master artwork and permission correspondence stay in a separate controlled working location, not in `public/` or public CI artifacts. Their storage destination is configured during the asset-preparation stage.

### 8.4 Contracts and ownership

`session` owns which actions are permitted. `clock` owns time. `world` owns positions and outcomes. The renderer reads a snapshot and cannot award success or change hitboxes. Input produces actions, not DOM-driven changes to player coordinates. Audio/effects consume events and cannot decide gameplay.

An asset record exposes an ID, approved route, content hash, dimensions, foot/pivot anchor and status. A frontage record holds verified location, side, visible width, source IDs and sign placement. An obstacle record holds physical position, bounds, height, behaviour and animation ID. UI text comes from state rather than a second independent timer.

### 8.5 Reuse from Mango

Reuse suitable pure drawing helpers, input conventions, local-settings patterns and audio lifecycle ideas after checking them. Do not import Mango's side-on camera, boss/progression system or account-bound character profile data into Last Luas. Keep public APIs stable and regression-test both games if a helper is genuinely shared.

## 9. Asset sizing and performance targets

| Item | Initial target, subject to measured review |
|---|---|
| High drawing resolution | Up to 2,073,600 pixels, preserving viewport aspect ratio. |
| Lower quality mode | Around 720p-equivalent pixel area; retain sprite outlines and controls. |
| Main facade/runner exports | Size to their largest displayed dimensions; usually 1K–2K components, not 4K everywhere. |
| Sprite sheets | Split/pack frames into bounded atlases; no enormous single strip. |
| Initial playable download | Target at most 12 MiB compressed, excluding assets not yet needed. |
| Frame rate | Target 60 fps on a representative desktop and stable 30 fps minimum on the selected test phone. |
| Frame pacing | Report device/browser and frame-time distribution; no claim based only on an average FPS counter. |
| Loading | Decode required images before Play; preload upcoming content without changing world state. |

Cache composited facade surfaces and parsed artwork. Avoid recreating paths, decoding images, generating logos or repeatedly measuring text during every frame. Release off-route resources. Reduce decorative particles/resolution before removing collision cues.

These are budgets and acceptance targets, not benchmarks of software that already exists. Physical handset performance must be measured on a named device. Browser emulation does not establish handset performance.

## 10. Access, routing and website integration

The source configuration currently serves the `public` asset directory and only routes selected paths through the Worker first; Last Luas is not in that list [R13]. A private game cannot rely on hiding a button or adding a browser-side password.

Protect `/games/last-luas`, `/games/last-luas/*` and the branded asset route at the Worker before static delivery. Cloudflare supports selective Worker-first routing for this purpose [R14]. Use the existing session validator, account-active check and one explicit owner ID configured server-side. A general “signed in” or “admin” check is not the same as “only me”. Missing owner configuration fails closed.

The repository already has an authenticated API path and `getAuth` call [R15]. The implementation plan must identify the narrow reuse/refactor needed for page and asset requests, without changing existing login semantics or querying private account data for public cards.

Serve private runtime assets from an allowlisted R2 prefix, never arbitrary object keys. Apply the same owner check to GET and HEAD, aliases, manifests and every individual asset. Do not allow a private response into a public/shared cache; use `Cache-Control: private, no-store` initially and do not service-worker-cache private artwork. No public `r2.dev`, preview-domain or Workers-origin bypass.

Unauthenticated page access returns to the existing sign-in flow. Missing assets return a genuine 404, not homepage HTML. Unsupported methods return 405. Protected asset requests do not receive login HTML labelled as an image. Clear error reporting must distinguish session expiry, missing artwork and unsupported drawing features.

Keep Games hub, homepage and signed-in Games entry points. Use one verified build label across them. The public card can use original unbranded tram artwork and a private/sign-in notice; private branded gameplay captures do not belong on it by default. No other page, account data, points or multiplayer state is changed.

## 11. Audio, menus and saves

Use original or appropriately licensed effects for footsteps, splashes, bells, crowd ambience and departure. No implication that a recording is official without a source. Audio starts after user interaction, has separate music/effect volume controls, pauses with play and fails silently without blocking the game.

Provide Play, How to play, Sound, Quality, Reduced motion, Pause/Resume, Restart and Back to Games. Do not add a full settings product or cloud progression system. Reduced motion removes shake/large camera movements and reduces rain without altering difficulty.

Keep scores local to the browser under an inked-build save schema. Do not compare the old 0.3 best time against a new route and ruleset. Missing/corrupt storage must not stop play. Never claim cross-device saves. At logout, prevent another account from being shown the previous owner's private session state.

## 12. Verification and acceptance

| Check | Required evidence |
|---|---|
| Real logos | Original-file provenance and a side-by-side check of exported sign artwork at browser size. |
| Street layout | Dated location sheet confirming side/order/relative spacing and platform approach; unresolved features visibly flagged. |
| Artwork quality | Actual browser captures and a moving sample with no blockout character/frontage in the approved stretch. |
| Perspective | Correct ground contact, depth ordering and facade projection; no stretched/mirrored logos or visible triangle seams. |
| Input | Keyboard, mouse buttons and touch gestures tested; no menu click causing a jump or swipe causing two actions. |
| Collision | Height clearance, changing corridors, moving hazards, repeated contact and low-frame-rate tunnelling tests. |
| Time | Active run elapsed time within 0.1 s of 90 s under normal execution; pause/tab loss and slow-frame cases tested separately. |
| Finish | Early boarding, grounded/side checks, door deadline, near miss and missed tram tests. No win through closed doors. |
| Rendering | Desktop HD and small portrait/landscape browser checks; representative physical-phone test before phone-performance claims. |
| Access | Anonymous and other signed-in account blocked from the game and all private asset routes on custom domain and Workers origin. |
| Loading | Missing image, expired session, incorrect MIME and cache/version mismatch produce a useful error, not a broken run. |
| Regression | Existing Games links, Mango and account handling still pass their relevant checks. |
| Release | Actual deployed commit/build/asset-set checked on `guannan.party`; opening HTML alone is not proof that the game renders. |

Tests that merely search source text for a function name or version number are insufficient. Core tests assert behaviour. Browser tests must press Play, move, jump, pause, restart and reach a result. Visual approval remains a human check; a green test suite cannot certify that the art looks good.

## 13. Delivery gates

1. **Specification approval:** Confirm this design, including the owner-only proposal. No replacement code starts before approval.
2. **Implementation plan:** Translate the approved modules and tests into a sequenced plan with narrow integration points. Do not reopen the basic art-style decision without a reason.
3. **Reference and asset preparation:** Verify the chosen street section, obtain real logo assets and resolve their reuse/status records. Identify the exact missing items rather than guessing.
4. **Playable art proof:** Produce the short finished section with the real renderer, character and initial hazards. Capture real browser evidence.
5. **Owner visual approval:** Revise if needed. Do not extend the street until the result is acceptable.
6. **Complete route:** Add the remaining verified frontages, obstacle families, sound and platform/door finish using the accepted style.
7. **Acceptance and deployment:** Run behaviour, browser, access and regression checks; obtain release approval, deploy once and verify on the named custom domain.
8. **Rollback and records:** Retain the previous source revision and tested route rollback. Keep permission/access safeguards in force during rollback; do not expose private brand assets by restoring a public route.

Do not merge a series of cosmetic versions to production before viewing the actual new game. Development branches are not deployed releases. Run targeted checks during work, then the relevant full regression suite before release to avoid unnecessary repeated CI cost.

## 14. Risks and controls

**Artwork remains the main workload.** A renderer can be written without producing an attractive scene. Control: finished frontages and character sheets are acceptance items, and the art proof comes before route expansion.

**Pseudo-3D can distort frontage art.** Control: validate perspective mapping, near-view sign legibility and mobile cost on the short section. A fixed camera limits scope; it does not excuse visible warping errors.

**Wrong logos or wrong street order can look plausible.** Control: separate provenance/location/reuse records and explicit sign-off; never use the old generated layout as survey evidence.

**Private page, public assets.** Control: no restricted brand files in the public Git repository, public CI artifacts or unauthenticated R2 endpoints; test all delivery paths.

**The 90-second route may not fit the surveyed distance.** Control: balance speed and encounters against that measured route. Do not relocate the stop, fake metre counts or introduce a hidden timer extension.

**A future user interprets “only me” as rights clearance.** Control: record the reuse basis, keep uncertainty explicit, and require a fresh distribution review before any public release. This document is not legal clearance.

## 15. Current status and remaining evidence

This document sets the redesign, module boundaries, source requirements, acceptance tests and release gates. The source baseline and initial official address/stop pages have been checked. No new game artwork, logo pack, surveyed route, private-access configuration, runtime benchmark or replacement code is claimed complete.

The next evidence required is the short route/reference sheet, actual official logo files with review records, the configured owner identity for private access and a real playable art proof. These are defined deliverables for the approved plan, not details to fill with invented values.

Only this design document should be added on a documentation branch. Do not merge that branch into production or change live navigation during this review stage.

## 16. Sources

Repository evidence refers to the baseline commit above. Web pages were checked on 19 September 2026; a current page does not establish the date of every photograph or the scope of asset reuse.

- [R1 — Mango Canvas renderer](https://github.com/TCDCS/duck-bear-hq/blob/1cbfc60c52db4bdeb31d2b4ecadb8ce9dca87785/public/games/mango-mayhem/render/scene.mjs). Renderer and component organisation.
- [R2 — Existing Last Luas module](https://github.com/TCDCS/duck-bear-hq/blob/1cbfc60c52db4bdeb31d2b4ecadb8ce9dca87785/public/games/last-luas/game.mjs). Sign generation, rendering, input, clock and collision code.
- [R3 — ARKET Dawson Street](https://www.arket.com/en-eu/customer-service/store-locator/dublin-dawson-street/). Official address source; not reuse permission.
- [R4 — Hodges Figgis Find Us](https://www.hodgesfiggis.ie/help/find-us). Official address source; not reuse permission.
- [R5 — Cafe en Seine Contact](https://www.cafeenseine.ie/contact-faq/). Official address source; not reuse permission.
- [R6 — The Ivy Dawson Street](https://ivycollection.com/restaurants-near-me/the-ivy-ireland/the-ivy-dawson-street-dublin/). Official address source; not reuse permission.
- [R7 — Luas Dawson stop](https://www.luas.ie/stops/dawson/). Official stop source; platform geometry remains to be checked.
- [R8 — IPOI: copyright notice and permission](https://www.ipoi.gov.ie/en/types-of-ip/copyright1/understanding-copyright/the-copyright-notice-and-symbol/), and [copyright basics](https://www.ipoi.gov.ie/en/types-of-ip/copyright1/understanding-copyright/what-is-copyright/). General guidance, not a finding about a particular logo.
- [R9 — OpenStreetMap copyright/licence](https://www.openstreetmap.org/copyright). Data attribution and licensing requirements.
- [R10 — Google Maps additional terms](https://www.google.com/help/terms_maps/). Copying, product and bulk-download restrictions.
- [R11 — MDN: using images in Canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Using_images). Image loading, scaling, sprite frames and cross-origin issues.
- [R12 — MDN: Canvas transform](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/transform). Affine transformation model.
- [R13 — Current Worker configuration](https://github.com/TCDCS/duck-bear-hq/blob/1cbfc60c52db4bdeb31d2b4ecadb8ce9dca87785/wrangler.jsonc). Existing public asset routing and bindings.
- [R14 — Cloudflare Worker-first asset routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/). Selective Worker execution before static assets.
- [R15 — Existing authentication entry point](https://github.com/TCDCS/duck-bear-hq/blob/1cbfc60c52db4bdeb31d2b4ecadb8ce9dca87785/src/index.js). Existing session/authenticated API flow.
