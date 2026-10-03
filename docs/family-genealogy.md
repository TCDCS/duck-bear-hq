# Family genealogy module

The family landing page is `/family-tree/tree/`. Navigation contains Tree, People, Timeline, Locations, Stories and Sources. Administrative actions are under Manage tree.

## Presentation rules

- The ancestor chart uses separate occurrences for shared ancestors, clear generation spacing and distinct adoptive connections. The family view shows recorded parents, partners, co-parents and children; it never invents parentage from a partnership.
- Charts start with readable cards, centre the complete diagram when it fits and otherwise keep the focus person visible. Fit gives a whole-chart overview. Search, preview, recenter, Home, keyboard pan and touch/mouse controls do not change records.
- Global and person timelines show genealogy facts, not careers, achievements, pet arrivals or miscellaneous events.
- Locations show only recorded birth, death and explicit current residence. Birth/death fallback uses the event's subject, not participants. Old residence events cannot establish current residence. Deceased people have no current-residence pin. Unmapped text stays unpinned.
- Removed navigation sections are not database deletions. Preserve existing portraits, stories, evidence, historical facts and household-only access. No new family import is required.

## Regression coverage

`family-genealogy.test.mjs` covers filtering, placement, incomplete data and safe model behaviour. `family-redesign-regression.test.mjs` covers legacy entry links and full-chart centring. `family-browser.py` exercises real browser navigation, diagram controls, portraits, editing, remove/restore, location filtering, 390px/768px layouts and access boundaries using synthetic records only. Existing `site-browser.py` checks the canonical legacy-family destination. Run the retained Family history acceptance, site-performance, HQ and account workflows before release.
