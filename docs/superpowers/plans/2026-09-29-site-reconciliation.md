# Site 1 and Site 2 — reconciliation and release record

## Scope and canonical implementation
Continue the previously approved website work; do not start a fourth independent product. Preserve live main `4df31885f973ff270ffb885532a297d097059108`, all games and their versions, existing account/session records, private Home tables, R2 originals and permanent menu URLs. Reuse the baseline-tested D1/R2 HQ modules from PR #80 (`850f3a25dc38dbac835d5a3924d5700622ac3797`), not a competing Durable Object or a replacement database.

The public website and `/our-space/` are the canonical surface. Legacy `/hub/` bookmarks resolve to the new real pages, including family, menus, scrapbook, settings and admin subsections. Legacy Home write endpoints cannot create a second diverging dataset. Keep the old source tables intact for rollback; never force-push old branches over main.

## Completed additions
- A genuine editable Info Library with nested page URLs, search, reference links, revision history and signed-in reading. The household pair can create/edit pages; unrelated signed-in accounts are readers.
- About and Info protected server-side, including direct `index.html` URLs. Personal guide text is removed from public static HTML; private routes are excluded from service-worker caching.
- Original household pair-only scrapbook; independently granted family permissions. Carry only deliberate owner-issued Home grants, not the old schema's blanket grant to all users. Section admin maps to content editing, not global ownership.
- Additive Home import preserving family metadata, relationships, author/date attribution, scrapbook media, meal ideas, weekly drafts, meals and original private R2 references. Missing media, invalid dates or parent cycles fail safely with source records unchanged.
- A live Home draft can coexist with the immutable already-published menu for the same week. Publishing over an existing dated archive is rejected.
- Both original household accounts are protected against accidental deletion/disable. Pair identity is anchored to original setup audit IDs, not mutable account roles. Owner-assisted password recovery remains available when outbound mail is unconfigured.
- Website version 7.1.0, build `2026.09.29-reconciled.1`, and a real Settings > Updates page. No game version changes.

## Verification evidence
`src/hq/import-hub.mjs`: additive transaction and marker; `library.mjs`: starter useful-info page; `handler.mjs`: route/auth integration; `records/schema/auth/media/backup`: permissions, editable schema, portability and safe links. `public/hq/`: nested frontend, library forms/articles, About, settings log. `src/worker-games.js`: wraps the existing Worker without replacing main. `wrangler.jsonc`: union Worker-first routes.

- [x] Audit main and three overlapping PRs; preserve exact starting SHAs.
- [x] Baselines: main 274/274 and HQ 302/302 unit tests pass.
- [x] Write reconciliation regression tests and observe expected failures before implementation.
- [x] Implement migration, library, route protection and old-link consolidation.
- [x] Fix regressions for pair protection, restored executable URLs, video backups, role changes and exact legacy subsection bookmarks.
- [x] Combined suite: 320 tests pass, no skips.
- [x] Repository checks and actual Wrangler Worker dry-build pass.
- [x] Actual local Cloudflare Workers/D1/R2 integration passes, including existing account setup/login, legacy import, invitations, grants, concurrent-save rejection and dated menu archives.
- [x] Chromium desktop/mobile journeys pass with no browser errors; screenshots inspected for homepage, private navigation, family and Info pages. Width checks include 390px and 768px.
- [x] Tested source pushed to the isolated reconciliation branch; assembly workflow run `36584544946` passed all steps. Generated game bundles are excluded from the commit.
- [x] Permanent acceptance workflow includes both browser suites and real Worker integration.
- [ ] Merge the exact reviewed/tested final commit; verify Site Deploy and its read-only live checks; then close superseded website PRs #79, #80 and #84.

Self-review, not an independent human review, found the role-change lockout and legacy bookmark issues. Browser testing initially exposed a missing public gateway in the test fixture; the fixture now uses the same `createGameHandler` composition as production. No browser security controls were disabled to bypass this environment's blocked local browsing; acceptance ran on the authorised GitHub Actions runner.

Deployment verification is recorded separately by the Site Deploy workflow. It compares the deployed application SHA-256 with released source, checks the homepage version, verifies signed-out Info/About redirects and private API denial, and checks public menu/archive/game pages. These checks do not sign in or access private production records.

## Operational facts and limitations
No production data or photograph bytes are copied into source, tests or workflow artifacts. Browser tests use labelled synthetic records. No production session credentials are requested or fabricated. Private data imports occur in an authenticated original-household session; a public deployment check cannot verify that user's private production contents.

The current repository's deployment token previously lacked D1 migration permissions. Runtime schema setup uses the existing DB binding; deploy does not require a new remote SQL migration command. Existing GitHub/Cloudflare deployment secrets are reused, never printed.

Outbound verification/reset email requires an actual mail provider binding and authorised sender. Absence is reported honestly by the UI; owner-issued private invitation/reset links remain supported. No email delivery is claimed without a delivery test. Exact earlier user-supplied artwork/private photo attachments have not yet been positively identified; existing illustration and private upload/crop controls are retained, not falsely labelled as those exact images.

The earlier hand-care page is replaced with a general, editable note distinguishing irritation from a proven allergy. References: NHS contact dermatitis causes and overview, checked 29 September 2026. It does not diagnose the household member or claim sulfate-free means allergy-safe.
