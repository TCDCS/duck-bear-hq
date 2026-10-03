# Complete family chart correction

## Scope and diagnosis
The extended-family layout previously sorted individual ancestors independently, separated co-parent pairs, and reused a single horizontal connector lane. It also limited ancestry to the focus person's branch. Display labels reduced complete birth dates to years. Some children's exact dates existed only as household free text.

The correction keeps separate Ancestors, Family, and Entire family modes. Family retains the optional expansion controls and now follows the ancestry of displayed co-parents. Entire family includes every active saved person, pet and associate once; unlinked records are explicitly labelled, not assigned fabricated relatives. Biological, adoptive, partner and other edges retain their recorded types. A layout group is not a marriage declaration.

## Layout
Group actual partners and matching parent sets before rank assignment; order complete groups with deterministic barycentric sweeps. Constrain recorded siblings/cousins to compatible visual generations without grouping their cards as a couple. Detect conflicting placement constraints, retain the original edge and flag a review warning. Use separate orthogonal connector tracks and outside gutters for long edges. Selecting a person highlights only their recorded connections. Use readable initial zoom; Fit is a deliberate overview of the entire larger chart.

## Dates and privacy
Display complete recorded birth/death dates without increasing unknown-date precision. Canonical household birthDate is separately validated and projected into an authorised display copy only. Family guests neither request these records nor receive the exact household date. Free-text dates are never parsed by guesswork. Rendering does not rewrite database fields. Partner is not labelled spouse unless a separate marriage fact establishes it.

## Data boundary
This public change contains no actual family records, addresses, portraits, religious or health information. A separately delivered private update resolves the supplied date and name corrections and recovers omitted evidence-backed relatives. Deployment is not an import. Existing photographs, revisions, privacy grants, genealogy-only timelines, location filters and printable books remain intact.

## Verification
Added focused regressions for full dates, complete-record coverage, co-parent ancestry, partner adjacency, stable positions, no unrelated card crossings, explicit relationship types, cycles, sibling generations and private date validation. Browser coverage compares the entire chart's count with the actual synthetic API records, checks household-versus-guest date precision, and exercises connection selection and the existing PDF export. Test fixtures and CI screenshots are synthetic only.
