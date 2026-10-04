# Books 0.3.0 — reliable scans and recovery retry

This continuation is based on Books 0.2.2 (`bbbb9e356186d43c957e9ff0655ef399e4a915dc`) and preserves its canonical asset routing, recovery validation, OAuth supersession and WebKit transport-outage tests. It is isolated on `feature/books-reliable-scans-2026-10-04`; main and production are not changed.

## Implemented
- Atomic, source- and lease-guarded scan-page commits; retry cannot double-count a failed page.
- Server-persisted pause/resume, current-root active-job reuse and visible folder counts/warnings.
- Tests for lost/expired leases, disconnect/root/pause races, SQL rollback, concurrent starts, moved OPF metadata, empty provider pages and the scan item limit.
- Restore ZIP selection stays locked during an attempt. Interrupted staging is retryable without partially restoring records.
- Full browser recovery exercises an independent in-memory target, complete catalogue, original byte identity, separate reader progress/notes and reopening a PDF at its saved page.

## Verification record
The integrated local source passed 509 Node tests, all five standalone Chromium DOM/publication checks, repository checks and syntax checks. The environment blocks Chromium HTTP navigation, so full browser validation must use the normal clean-install GitHub Actions matrix, not a weakened browser policy. That matrix requires a clean dependency audit and tests Chromium and WebKit with synthetic books only. Inspect the final commit's artifacts for the exact tested SHA and results before release.

The connected Drive connector returned 404 for the previously supplied folder during this continuation. That does not establish that the folder was deleted, or that website OAuth is broken; real-account access remains unverified. Real Google consent, refresh longevity, nested-library permissions and physical Kobo/mobile-device behaviour remain explicit release gates. No private book files, Google credentials or source-library identifiers were added to Git.
