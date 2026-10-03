# Books development / release notes

## Scope and isolation
New module routes are `/books/`, `/api/hq/books/`, and `/api/hq/integrations/google-drive/`. Existing logins and original household membership are authoritative. Enable only by setting `BOOKS_ENABLED=true` in the target environment; missing/false keeps the feature unavailable and hidden from the existing navigation. Do not reuse production D1/R2 bindings in a test Worker.

## Google credentials
Use existing `GOOGLE_DRIVE_CLIENT_ID` and encrypted `GOOGLE_DRIVE_CLIENT_SECRET`. The callback is `SITE_ORIGIN` plus `/api/hq/integrations/google-drive/callback`. Register a separate exact callback for a preview origin before testing there. Runtime secrets are not inherited by another Worker. Optional `BOOKS_TOKEN_ENCRYPTION_KEY` separates token encryption from client-secret rotation; otherwise a derived encryption key is used. Changing the encryption secret requires reconnecting Google.

Only the owner can connect, disconnect, select the library root, or run imports. `drive.file` is default and is NOT a recursive folder grant. The connection page explains this and reports the files actually visible. Optional account-wide `drive.readonly` requires explicit separate acknowledgement. Google Picker is optional and requires `GOOGLE_DRIVE_PICKER_API_KEY` and `GOOGLE_DRIVE_PROJECT_NUMBER`; enable/restrict its API key to the intended origin and API. A public folder scan does not verify private OAuth scope. Test actual Google consent and refresh with the library account before removing public-link access.

## Storage and import
Original Drive files, Calibre database and OPF files are read-only. Catalogue and individual reading records are in additive `books_*` D1 tables. New website uploads are stored under `books/uploads/` in private R2, not silently written to the Drive library. Books up to 32 MiB can be uploaded/opened. Other supported catalogue formats can still be downloaded from Drive. The scan checkpoints each folder/page and refuses shortcuts or ancestry outside the configured root.

## Reader and offline data
EPUB.js 0.3.93, PDF.js 6.3.289, DOMPurify 3.4.16, and the lockfile-pinned ZIP library. Generated reader code is copied with `npm run build:books`; no external font files are bundled. EPUB scripts, forms and external resource requests are removed from the reading copy. Original bytes are unchanged for downloads.

Reading state is per user/file/version. Stale revisions return a conflict rather than overwriting another device. Selected offline book copies, notes and pending positions are stored in that reader's browser storage. Offline files must be explicitly saved. Sign-out clears this browser's book data and signals other tabs; remote devices cannot be wiped while offline. Do not use offline mode on an untrusted shared device. Per-user records can be exported as JSON. The existing HQ backup remains unchanged. The separate owner-only Books backup now includes catalogue, file references, ancestry, reading records, collections, preferences and private uploaded bytes/covers. Drive originals are explicitly excluded; preserve their separate HDD/cloud backup. Restore is previewed, staged, checksummed and atomic, and requires an empty Books data set with the same household IDs; it cannot wipe an existing library. OAuth secrets are never exported or restored. Browser archives are limited to 180 MiB total / 8 MiB manifest. Use direct D1 export and private R2 backup for larger libraries. Incomplete restore staging is not active library data; retention/lifecycle cleanup can be added after production storage policy is agreed.

## Known limits / release gates
Actual Google consent, private nested-library access, refresh-token longevity, mobile OS storage eviction, and real Kobo transfer need user-account/device verification. OAuth Testing-mode refresh tokens can expire in seven days. Selected-folder access must never be reported as complete library authorisation. PDF selected passages are saved as page-linked notes, not painted highlights. Read-aloud, dictionary/translation, native apps, Kobo progress sync, DRM-protected books, and global format conversion are not implemented in this release. Steam, music and Escape are separate later modules.

## Rollback
Set `BOOKS_ENABLED=false`; the existing website remains functional. Existing reader code is lazy-loaded only on book routes. Do not drop new tables or remove original files during rollback. Reverting the integration commit retains the separate book data until a deliberate migration/cleanup is approved.

## Books 0.2.0 changes and checks
`Library connection` now contains `Check Google connection` and `Book backups`. The diagnostic checks configured credentials, actual token refresh, folder access and at most eight sampled folders; it reads only a short prefix of one supported book. A successful sample is not full-library authority, especially under `drive.file`. No provider secrets appear in diagnostics.

Delayed refresh/callback work cannot restore tokens after disconnect. Retryable Google errors no longer imply revoked consent. Local disconnect completes before the remote revocation call; provider revocation may still require review in the Google account if it fails.

The Undici security override is pinned to vendor-patched 7.29.1. The candidate lockfile was generated by npm, its tarball integrity checked, and its complete audit was clean. The normal CI audit is now a mandatory success gate, with unit, DOM, end-to-end browser and Worker dry-run checks. No automatic production deployment is added.

### Recovery procedure
As Zachary, open Books > Library connection > Book backups. Download the Books ZIP and keep it privately. Recovery first previews that ZIP and refuses a nonempty Books target; it never deletes existing data to make room. In an empty Books target using the original household accounts, type `RESTORE BOOKS`; the browser checks/uploads the archived private files, then the server commits the records together. Reconnect Google and explicitly select the eBooks folder for original cloud files. Restored state cannot grant another account access, change website roles or modify original Drive books. Large libraries need a direct D1/R2 backup outside this bounded browser tool.
