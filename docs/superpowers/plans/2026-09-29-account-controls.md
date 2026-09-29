# Account controls implementation and release record

Goal: working owner account administration and optional passkey login in the existing HQ.
Spec: ../specs/2026-09-29-account-controls.md
Execution: inline continuation of the user's requested implementation.

- [x] Add failing API tests for direct creation, email/username editing, password reset, preferences, permissions and mail-state messages.
- [x] Add additive account schema and owner actions; retain existing accounts, private data and legacy interfaces.
- [x] Add real-crypto passkey tests for registration/login, browser binding, replay/expiry, signatures/origins/user verification, session binding, revocation and account disable.
- [x] Add server passkey verification and browser UI with password fallback.
- [x] Add separate Details, Email, Security, Settings and Permissions pages, direct user creation and email diagnostics. Website 7.2.0, build 2026.09.29-accounts.1.
- [x] Run unit tests, actual Worker and browser tests, inspect desktop/mobile screenshots and self-review.
- [ ] Merge the final checked head and verify the deployed source; final release result belongs in the pull request record.

## Evidence
Baseline main: 8cc14f2069f98b8855dd73aea77f2c17d3c6399a. Live auth status confirmed emailConfigured=false; no private production accounts were read or modified.

Initial account API regressions: four failed before implementation. Initial passkey regressions: nine failed before implementation, while the existing cross-origin rejection already passed. Further review tests cover stale password-update side effects, forged signatures, revoked credentials during verification, password changes during registration and initialized D1 upgrades.

Latest full local suite: 341 passed, zero failures or skips. Focused account/passkey tests: 26 passed. A dropdown accessible-name regression was observed failing, corrected, and verified in both unit and actual browser tests.

GitHub Actions run 36592412554, job 109488603766 completed successfully: checksummed assembly; npm ci; full unit suite; repository/game source checks; actual Wrangler dry build; local Cloudflare Workers/D1/R2 initialization; real cryptographic registration/sign-in/replay denial; Chromium CTAP2 virtual-authenticator registration, passkey-only login, owner revocation and password fallback; cancellation handling; 390px user screens; both existing HQ/site desktop/mobile browser suites; tested-source push. Tested implementation commit: d185549adf725ba9c8c6400b769afef2401e73eb. Artifact account-browser-report contains synthetic test records only and no private passkey bytes.

Browser reports have no page errors. Reviewed the actual passkeys and account-email screenshots. An earlier cancellation test incorrectly returned the stub function to Playwright, which invoked it during evaluate; the harness was corrected without weakening production verification or removing the test.

## Review decisions and boundaries
- Owner-set email is usable immediately but explicitly unverified. Normal self-service replacements still preserve the current address until verification. Cost: automated mailbox recovery remains unavailable until sending and verification are configured.
- Owner password resets revoke sessions and passkeys by default; ordinary self-service password changes retain passkeys. The UI makes the owner's revocation choice explicit. Cost: the reset user may need to register a passkey again.
- Passkeys are bound to the configured website origin and use password fallback. They are not remotely enrolled for the user and must not be represented as device enrollment already completed.
- Original household accounts cannot be disabled/deleted. Changing names, credentials or preferences never shares a private section or changes household ownership.
- No production passwords, registered addresses, grants, private photographs or game sources were changed by this development/testing work. No paid email provider was enrolled.
- Automatic outbound email remains unconfigured. Code supports an authorized Cloudflare EMAIL sender or explicit RESEND_API_KEY and PASSWORD_RESET_FROM secrets, plus an owner-only diagnostic/test page. No inbox delivery is claimed.
- Final review was self-review plus automated tests, not an independent security audit. No further identified code defect is knowingly left open in this scope. Physical-device enrollment and actual email delivery require the user's device/provider and are not established by virtual-authenticator tests.
