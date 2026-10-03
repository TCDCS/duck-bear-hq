# Extended family, private details and printable books

## User-visible behaviour

The Family layout has independent Extended family and Extended ancestry controls. Traversal uses recorded relationships, retains adoptive edges, avoids cycles and does not mutate family records. A profile can store name origin, original dictionary script, name meaning and sources, name-choice story, date uncertainty, ancestry notes and separately reviewed child-friendly story text. Original script is not guessed from a romanised name.

Books & PDF export is available from the tree management controls. It creates an authenticated local preview with three formats: a child family storybook, a complete adult family reference, and readable linked family sheets covering the entire tree. The Print / Save as PDF action opens the browser print dialog; this is not a server PDF download service. No external AI or PDF service receives records.

The child edition includes approved story text and safe profile fields, not raw notes, arbitrary events, research questions, household addresses, exact private birth details, allergies or property notes. Religion is opt-in and requires intimate export permission. The adult reference includes all active family records and can include an explicit confidential household appendix. These printable editions do not replace original-image and revision-history backups.

Religion, personal versus family-background context, allergies and household addresses remain in the existing household-only section. Unknown allergies are not represented as no allergies. Family background is not proof of individual observance. Former homes and rented property are not current-residence map pins. Story places have separately labelled links and are not inferred birth/death locations.

Sparse private import updates resolve stable keys against the existing namespace, can require an existing match, preserve images, and atomically apply only after preview. Exact text corrections are guarded against later edits. No actual family records belong in this public repository.

## Verification

The resumed source at d66b5a0f6702809df8cacfdb700fe1f9018ea2d6 was reconstructed from the retained source snapshot and hashed patch. Focused local model/import/export tests passed: 34 tests, zero failures. Saved browser run 37116278008 passed both family and book acceptance and produced a synthetic 21-page child PDF. Its rendered cover was visually inspected. The retained Family history acceptance workflow now includes both browser scripts, so exact-head verification can run before release.

Tests cover extended relatives, adoption/cycles, Unicode, print preview invalidation, child/reference separation, anonymous/unauthorised access, portrait preservation, sparse update identity, and idempotence. Fixtures and screenshots contain synthetic data only.

## Record-delivery boundary

Code deployment and private family-data import are separate. The deployment token previously had Workers permission but no D1 HTTP query permission. Do not bypass that boundary or publish private records in source. Deliver a targeted private JSON update through the existing owner import flow and report its live status accurately. Unverified dates, parentage, name spellings and biographical claims remain clearly marked; no exact dates are inferred from registration quarters.
