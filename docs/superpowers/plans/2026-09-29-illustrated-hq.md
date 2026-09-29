# Illustrated HQ Implementation Plan

**Goal:** Add the approved illustrated, linked, private household platform without losing existing games or records.
**Architecture:** A small Worker wrapper routes the new pages/APIs and protects legacy private endpoints. Typed D1 rows store content/revisions/access and private R2 stores files. Vanilla browser modules provide an accessible path-based interface.
**Tech Stack:** JavaScript ES modules, HTML/CSS, Cloudflare Worker/D1/R2, node:test, SQLite and Playwright.
**Spec:** `docs/superpowers/specs/2026-09-29-illustrated-hq.md`

## Global constraints
Preserve games, existing account data, resource bindings and archive URLs. Private originals never enter git. Existing owner/member identity must be evidenced. All private operations deny by default. Do not fabricate email delivery or deployment verification.

## Review focus
1. A new user must not read old photos/reviews via legacy endpoints.
2. Two edits to one record must result in one success and a conflict, never silent overwrite.
3. A family grant must not leak scrapbook links, thumbnails or private ratings.
4. Password recovery must reject replay and survive concurrent requests.
5. Backup/restore must retain original files and leave permissions private.

## Task 1 — Storage, identity and permissions
- [ ] Add failing SQLite integration tests for schema, pair derivation, permissions and revision conflicts.
- [ ] Implement `src/hq/core.mjs`, `schema.mjs`, `records.mjs` and `auth.mjs`.
- [ ] Verify migrations, session compatibility, cross-origin rejection and read/contribute/edit/owner access.

## Task 2 — Content, files and backups
- [ ] Add failing domain tests for family relationships, menus, media, votes, archive preservation and ZIP restore.
- [ ] Implement typed record validation/actions, private media and backup/restore modules.
- [ ] Import legacy menu/security JSON without modifying its source; preserve errors instead of resetting corrupt data.
- [ ] Verify private originals, snapshot preservation and round-trip backup.

## Task 3 — Linked interface and illustrated design
- [ ] Add browser acceptance assertions for every section URL, navigation/back, permissions and mobile overflow.
- [ ] Implement the shared HTML/CSS/router, content views, forms and individual settings/admin pages.
- [ ] Rework public homepage; keep the game entry points and existing menus/archives reachable.
- [ ] Verify keyboard controls, drafts, uploads and browser console; capture screenshots.

## Task 4 — Integration and release
- [ ] Wire wrapper and Worker-first route rules; block old private bypasses and token caching.
- [ ] Add documented runtime additive initialization and email readiness checks; keep sender dependencies explicit.
- [ ] Run the 268-test baseline plus new suites and Worker dry build.
- [ ] Commit on the isolated feature branch, review the diff and deploy only after acceptance.
- [ ] Recheck live public paths and signed-out guards; report any unverified authenticated setup honestly.
