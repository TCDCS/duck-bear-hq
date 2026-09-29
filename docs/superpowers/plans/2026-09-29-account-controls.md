# Account controls implementation plan

Goal: working owner account administration and optional passkey login in the existing HQ.
Spec: ../specs/2026-09-29-account-controls.md
Execution: inline, as a continuation of the user's requested implementation.

- [ ] Add failing API tests covering direct creation, email/username editing, password reset, preferences, permissions and mail-state messages.
- [ ] Add additive account schema and owner actions; retain all old account routes.
- [ ] Add real-crypto passkey tests: registration/login, browser binding, replay/expiry, signature/origin/UV, session binding, revocation and account disable.
- [ ] Add server passkey verification and browser UI with password fallback.
- [ ] Add separate user/settings routes and email diagnostics; update version to 7.2.0.
- [ ] Run all unit, actual Worker and browser tests, inspect screenshots, self-review and deploy the tested head.

Review focus: owner setting their own credentials; concurrent credential revocation; unverified mailbox changes; reused invitations after password reset; migrating an already initialized D1 database. No passkey private material or live account data enters GitHub.

## Execution evidence
- Original-source snapshot: upstream 8cc14f2; live auth status confirmed emailConfigured=false.
- Account API regressions: 4 failed before implementation, all passed afterwards.
- Passkey regressions: 9 failed before implementation, then all 10 passed (the existing cross-origin rejection already passed).
- Existing plus new suite: 334 passed, zero skipped locally.
- Email sending remains an external configuration requirement; do not claim it enabled from code changes alone.
- Review is self-review, not an independent security audit.
