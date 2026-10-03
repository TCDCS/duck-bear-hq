# Family History Implementation Plan

**Goal:** Extend the existing private family tree and import the owner's sourced family history without publishing personal data.
**Architecture:** Add kinds to the generic revision-controlled record engine; use dedicated family views with existing forms/media/auth. Separate household-only details from shareable family records. A validated owner import reuses those permissions and revision history.
**Tech stack:** Existing JavaScript modules, Cloudflare Worker/D1/R2, Node tests; local SVG world map with Natural Earth public-domain geography, no new paid service.
**Spec:** docs/superpowers/specs/2026-10-03-family-history.md

## Constraints and review focus
No plaintext family seed in Git. Preserve old records and modules. Unknown dates, ambiguous names and disputed places remain explicit. No silent overwrites. No private data in shared exports, map URLs or CI artifacts. All input is escaped; source links accept HTTP(S) only. Parent cycles and stale revisions fail without partial saves.

## Tasks
- [ ] Add failing synthetic schema/permission tests; implement family record fields/kinds and backup-link validation. Verify partial dates, private denials and preserved portrait data.
- [ ] Add failing pure timeline/graph/map tests; implement family model, geographical overview, profile and section views. Extend routes/forms; keep history/photo workflows.
- [ ] Add failing import tests; implement preview/apply, deterministic keys, duplicate/conflict handling, all-or-nothing revision guards, and owner-only endpoint.
- [ ] Compile the owner's data outside the repository with source labels, unresolved questions and household-only addresses. Validate against synthetic DB. Never invent missing photos.
- [ ] Commit generic code; run existing CI, browser acceptance and deployment. Import privately only through a verified authorised route. Verify live code and import counts; retain a private downloadable backup.
