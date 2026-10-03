# Private family history extension

Extend the existing authenticated family tree, not a replacement application. The owner can maintain people, pets, biological/adoptive/step relationships, life events, stories, sources, research questions and places. Existing photos, revisions, access grants and recycle-bin behaviour remain intact. Root is a selectable person; no personal information is bundled in public source.

## Data and privacy
- Person profiles contain alternate names, dates (including partial/unknown dates), birth/death/current broad places, biography, portrait and cover/gallery.
- Existing confidence values remain compatible. Evidence distinguishes family confirmation, primary/source support, recollection, unresolved and excluded leads. Unconfirmed ancestors stay in research, not automatically linked as parents.
- Relationship records retain type, period, ending (separation/divorce/death), explanatory notes and source references.
- Events include career, birth, death, marriage, separation, divorce, adoption, registration, migration, residence, funeral, achievement and pet-arrival. A registration period is never silently used as an exact birth date.
- Exact home addresses and children’s full date details go in a separate `familyPrivate` record in the existing household-only `intimate` section. Family guests cannot fetch, search, export or view those records/media. No address is sent to an external service until a household member deliberately opens a map link.
- Places contain broad localities/public venues and optional verified coordinates. Unknown localities remain unpinned. Global map works without paid APIs or automatic geocoding.
- No real person’s face is generated or guessed. Portrait, cover, event/story photos use existing authenticated image storage and crop controls.

## Views and editing
Overview, graphical tree (pan/zoom/focus, distinct adoptive/biological lines), directory, person profile, chronological timeline, events, global map, places, sources, research, stories, import and recycle. Add/edit/remove all supported records; removal uses existing safe soft-delete/history/restore. Household private data has a clearly labelled profile panel.

## Import and integrity
Owner-only versioned JSON preview/apply with deterministic source IDs, conservative alias matching and conflict reporting. Preserve existing photos and filled fields; differing values require explicit overwrite choice or remain a reported conflict. Validate all links, permissions, dates and ancestor cycles before writing. Apply transactionally with revision guards, preserve history and record an import summary. Repeated import does not duplicate records. Never put unencrypted personal data in repository, CI logs or public artifacts. Production import, if available, uses encrypted transport and existing deployment credentials without creating a public bypass.

## Verification
Synthetic-only tests cover validators, evidence, partial dates, relationship cycles, import idempotency/concurrency/rollback, private-section denials and backups. Browser tests cover navigation, forms, tree, map, timeline and responsive layouts. Run existing unit/build checks. State deployment and private import outcomes separately and accurately.
