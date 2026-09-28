# Our Space 7.0.0

## Structure

The existing Worker now wraps its original game and account handlers with a private workspace. The original game files, D1 database and R2 bucket are retained. A new SQLite Durable Object (`PORTAL`, class `PortalStore`) stores workspace records, revisions, grants, invitations, email-verification challenges and immutable published menus. This requires the additive `our-space-v7-sqlite` Durable Object migration, not new D1 tables.

Navigation is defined in `public/portal/routes.mjs`. Our Space, Menus, Family Tree, Scrapbook, Plans, Games, Images, Settings and Admin have individual paths and nested record pages. Existing `/menus/archive/2026-09-28/` continues to serve the original layout. Existing games keep their URLs and release numbers.

## Access and migration

The original owner and companion are established from the `setup.complete` audit entry, never by assuming a display name or granting all members access. First successful original-user access imports the existing weekly menu, private review/idea data, and image memories. Original data and files are not deleted. Legacy registered emails are imported as unverified; old reset tokens are not accepted by the new flow.

New accounts are invitation-only and receive no private sections automatically. Only the owner manages access. Family, menu planning and plans support Read, Contribute (own records), and Edit. Specific-record grants override section settings. Scrapbook, notes, the private image library, personal meal reviews and meal photos remain restricted to the original pair. Direct media requests, search, revisions and legacy shared account endpoints are checked server-side.

Deleting an added account anonymises and disables its login, revokes sessions and invitations, and removes its grants and email binding. Shared contributions remain with their history. Original accounts cannot be deleted through this interface.

## Menus and records

Draft weeks can be copied, meals moved through day selectors or desktop drag and drop, and recipes/ideas linked. Only the owner publishes. A published snapshot contains meal names, dates, types, descriptions and served flags, never private photographs or reviews. Publishing does not overwrite an earlier dated week. Reviews attach to individual servings. Concurrent record edits require the current revision, returning a conflict instead of replacing another device's work.

Family relationships support parent, adoptive parent, step-parent, partner and sibling. Parent loops are rejected. Dates and alternate spellings are optional. The focused tree shows two generations each way and has a list alternative. Scrapbook pages have photo/story, postcard, two-photo and full-photo layouts. Display crops leave original images intact.

## Images

Personal images must not be placed in this public repository. The supplied four-image import package is delivered separately to the owner, who imports it while signed in at `/image-library/import/`. The package creates private uploads and an initial scrapbook album. The package is deliberately not hosted as a public asset. Uploaded files have content-type/signature checks, an 8 MB per-file cap, and record permission checks on every read.

The public `friends.svg` is original generic duck-and-bear artwork, not a personal photograph. Owners can edit public heading/introduction/theme. Personal page covers are selected separately and stay private.

## Backups

Owner ZIP backups include workspace records, revision history, published weeks and original image bytes. They exclude passwords, live sessions, reset tokens and permissions. The ZIP format is bounded to 256 MB and checks names, lengths and CRCs. Restore previews record counts and revisions, remaps uploaded image references, preserves existing history and refuses to rewrite published menus. Treat downloaded backups as private. Legacy non-image attachments remain in the original D1/R2 records; this image-focused workspace backup does not export those videos/documents.

## Account email dependency

Email verification and reset endpoints require an actual sender. Configure `EMAIL_FROM` and a restricted `RESEND_API_KEY` as a Worker secret, or supply a compatible `MAILER` service binding. Configure `SITE_ORIGIN` when changing the public hostname. Do not put secrets in Git. Verify sender/domain setup and a real delivered message before claiming email delivery is active. Until connected, the UI states that no verification or reset email was sent. Existing password login and owner-assisted resets remain available.

Reset links last one hour, invitations 48 hours. Tokens are hashed, purpose-bound, consumed transactionally and bound to the current password fingerprint. Link fragments are removed from the address bar by the client. Only verified email addresses receive self-service recovery messages.

## Verification and operation

Run `node --test tests/portal*.test.mjs`. The `Our Space acceptance` workflow also runs the repository regression suite, Wrangler dry bundle, and native Chromium against a fresh local Workers runtime with disposable accounts. It covers deep links/refresh, original image import, family creation/editing, polls, menu publication, reviews, invitations/read-only access, private photo denial, ZIP download/restore and mobile overflow. No production account credentials or private user images are used in CI artifacts.

Navigation has optional Chinese labels; detailed forms remain English. Optional map views, audio memories, external email/push notifications and a free-position scrapbook canvas are not part of this release. The existing games are not redesigned here.

Rollback must preserve the new Durable Object class and migration history. Do not delete the class or data to roll back the UI. Keep private API guards when adding future accounts or legacy entry points.
