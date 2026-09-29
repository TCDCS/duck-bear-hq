# Guannan.party and site-wide sketch design

Continuation of the approved illustrated website work. Baseline main b1d2745dd279d3dd1bbe1c663884074e3ebf5d1e. Preserve the current Worker, D1, R2, accounts, private-section boundaries, records and all gameplay. No replacement account system.

## Implemented candidate
One colourful ink-and-paper skin covers public home, sign-in/recovery/invitations, private chapters, settings/admin, menu/archive presentation and the games listing. Body text and controls stay readable. Original reusable chapter SVG illustrations accompany the existing yellow rubber duck and brown bear; this is an anime-inspired illustrated website treatment, not licensed anime imagery. Night mode, focus, reduced motion and 390/768/1440px layouts are acceptance requirements. Private record text and private photographs must never be put in public assets.

Guannan.party is the main passkey and account-link origin. A separately configured explicit legacy origin keeps existing infrastructure-domain passkeys usable there. Each ceremony verifies its own host/RP ID; no wildcard trust, cross-domain session transfer or migration of a private key. Website 7.3.0, build 2026.09.29-sketch.1. Existing game versions remain unchanged.

## Verification ledger
Baseline: 341 tests passed. Four custom-domain regressions failed before the fix, then 17 combined domain/passkey tests passed. Three initial theme tests failed before implementation. A mobile-sidebar CSS test caught the actual is-open class mismatch and passed after correction. Review caught an accidental dependency-version replacement: the new regression failed, the lockfile was restored except for root website versions, and the regression passed. Latest full local suite: 349 tests passed, zero failed or skipped. Repository checks and actual Wrangler dry build passed; offline Chromium CSS checks passed. Real Worker/browser acceptance and visual inspection must pass before release; the pull request will record their results and live verification.

## Email boundary
Read-only checks confirmed guannan.party serves 7.2.0 and the live application has no EMAIL binding, RESEND_API_KEY or PASSWORD_RESET_FROM. The existing deployment token can read the site/zone but Email Sending and Email Routing reads returned HTTP 403, error 10000. Do not bypass that denial or alter existing DNS. An authorized mail connection/sender configuration and a real delivery test are still required. No paid subscription, sending identity, successful delivery or change to an actual user email is claimed.

## Release checks
Run all unit and privacy regressions, actual Workers/D1/R2 account tests and Chromium browser journeys. Check all shared sections, fonts/art loading, SPA chapter changes, mobile navigation, night mode and reduced motion. Inspect real browser screenshots, not only offline examples. Verify released hashes/version and private boundaries on guannan.party after deployment. Self-review is not an independent security audit. Public menu dates/meals and private record contents must remain unchanged; only their page styling is altered.
