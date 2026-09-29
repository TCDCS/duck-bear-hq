# Site 1 and Site 2 — reconciliation and release record

## Scope and canonical implementation
Continue the previously approved website work; do not start a fourth independent product. Preserve live main `4df31885f973ff270ffb885532a297d097059108`, all games and their versions, existing account/session records, private Home tables, R2 originals and permanent menu URLs. Reuse the independently tested D1/R2 HQ modules from PR #80 (`850f3a25dc38dbac835d5a3924d5700622ac3797`), not a competing Durable Object or a replacement database.

The public website and `/our-space/` are the canonical surface. Legacy `/hub/` bookmarks resolve to the new real pages. Legacy Home write endpoints cannot create a second diverging dataset. Keep the old source tables intact for rollback; never force-push old branches over main.

## Required additions
- A genuine editable Info Library with nested page URLs, search, reference links, revision history and signed-in reading. The household pair can create/edit pages; unrelated signed-in accounts are readers.
- About and Info protected server-side, including direct `index.html` URLs. Remove personal guide text from public static HTML and exclude private routes from service-worker caching.
- Original household pair-only scrapbook; independently granted family permissions. Carry only deliberate owner-issued Home grants, not the old schema's blanket grant to all users. Section admin maps to content editing, not global ownership.
- Additive Home import preserving family metadata, relationships, author/date attribution, scrapbook media, meal ideas, weekly drafts, meals and original private R2 references. Missing media, invalid dates or parent cycles fail safely with source records unchanged.
- Allow a live Home draft to coexist with the immutable already-published menu for the same week. Publishing over an existing dated archive must be rejected.
- Protect both original household accounts against accidental deletion/disable. Keep owner-assisted password recovery when outbound mail is unconfigured.
- Website version 7.1.0 with a real Settings > Updates page. No game version changes.

## Files and verification
`src/hq/import-hub.mjs`: additive transaction and marker; `library.mjs`: starter useful-info page; `handler.mjs`: route/auth integration; `records/schema/auth/media/backup`: permissions, editable schema, portability and safe links. `public/hq/`: nested frontend, library forms/articles, About, settings log. `src/worker-games.js`: wrap the existing Worker without replacing main. `wrangler.jsonc`: union Worker-first routes. `tests/site-reconciliation.test.mjs` and `tests/site-browser.py`: focused regression/acceptance.

- [x] Audit live main and three overlapping PRs; preserve exact starting SHAs.
- [x] Baselines: main 274/274 and HQ 302/302 unit tests pass.
- [x] Write reconciliation regression tests and observe expected failures.
- [x] Implement migration, library, route protection and old-link consolidation.
- [x] Add and fix regressions for pair protection, restored executable URLs and earlier video attachment backup support.
- [x] Combined local suite: 318 tests pass, no skips.
- [ ] Actual Workers/D1/R2 dry-build and integration in GitHub Actions.
- [ ] Desktop/mobile Chromium journeys and screenshot inspection.
- [ ] Merge only reviewed/tested final commit, verify deployment, then supersede obsolete website PRs.

## Operational facts and limitations
No production data or photograph bytes are copied into source, tests or workflow artifacts. Browser tests use labelled synthetic records. No production session credentials are requested or fabricated. Private data imports occur in an authenticated original-household session; a public deployment check cannot verify that user's private production contents.

The current repository's deployment token previously lacked D1 migration permissions. Runtime schema setup uses the existing DB binding; deploy does not require a new remote SQL migration command. Existing GitHub/Cloudflare deployment secrets are reused, never printed.

Outbound verification/reset email requires an actual mail provider binding and authorised sender. Absence is reported honestly by the UI; owner-issued private invitation/reset links remain supported. No email delivery is claimed without a delivery test. Exact earlier user-supplied artwork/private photo attachments have not yet been positively identified; existing illustration and private upload/crop controls are retained, not falsely labelled as those exact images.

The earlier hand-care page is replaced with a general, editable note distinguishing irritation from a proven allergy. References: NHS contact dermatitis causes and overview, checked 29 September 2026. It does not diagnose the household member or claim sulfate-free means allergy-safe.
