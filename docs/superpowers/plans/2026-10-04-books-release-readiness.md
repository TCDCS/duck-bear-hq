# Books release readiness — continuation

Authority: approved `docs/superpowers/specs/2026-10-03-books-reader.md`. Continue from Books 0.1.4, not a new rebuild. Existing main must stay unchanged.

## 1. Dependency remediation
Resolve the vendor-patched Undici 7.29.1 through an npm override without upgrading the unrelated application dependencies. Generate the lockfile in the network-enabled CI candidate job; audit, test and compile it. Import only the verified package/lockfile diff. Make the normal Books audit a failure gate rather than suppressing it.

## 2. Books backup and restore
Add separate owner-only Books backup tools. Export a consistent D1 snapshot of the catalogue, file references, manifest ancestry, per-reader progress/annotations/collections/preferences, with checksummed private R2 uploads and covers. Never export tokens, password/session tables or OAuth states. Drive original bytes are not included: they stay in Drive and need the user's separate source backup.

Restore uses a read-only preview then explicit confirmation, staged checksum-verified files, original household user IDs and a single guarded database transaction. It requires empty Books records, not an empty main website. Reject other users, unsafe file types, malformed locators, duplicate IDs, missing links, wrong file hashes and concurrent new data. Never overwrite existing Books data or activate a restored Google connection. Do not label incomplete exports as full backups. Larger libraries use direct D1/R2 backups. Keep individual file size 32 MiB, manifest 8 MiB and complete browser archive under 180 MiB. Staging manifests live in R2 rather than an oversized D1 row.

Interfaces: `/api/hq/books/backup`, `/api/hq/books/restore/preview`, `/api/hq/books/restore/:id/files/:fileId`, `/api/hq/books/restore/:id/apply`. Reuse current auth and CSRF checks. Add a reader-ID hook from existing household membership. Add UI only to Books.

Tests first: complete upload/progress/notes round-trip with second-reader isolation; Drive references without Google token; expired session; wrong reader; nonempty target; missing/tampered bytes; invalid metadata/locators/foreign links; atomic rollback and a save arriving after preview; owner-only and bad-origin requests. Browser flow verifies export, preview and refusal to overwrite current records.

## 3. Google connection hardening and diagnosis
Prevent a delayed refresh or consumed OAuth callback from restoring access after disconnect/account change. Treat rate limit/server failures as retryable rather than always revoked credentials. Add an owner-only connection check that reports credential configuration, expected callback, refresh result, selected folder and sampled nested-file access honestly; a sample is never claimed as proof of recursive drive.file authority. Don't read siblings or follow shortcuts.

Tests first: delayed refresh during disconnect; stale failure after reconnection; consumed callback during disconnect; transient token failure versus invalid_grant; safe status fields; root missing/no children; nested selected-file limits. Existing real user consent remains a release gate outside synthetic tests.

## 4. Verification and publication
Run full existing suite, Books DOM/browser flows, audit and Worker dry run. Inspect screenshots and exact tested source. Review the final diff separately. Push feature branch only, retain no secrets/private ebooks in repository/artifacts. State remaining real-account/device gates and self-review limitation accurately.
