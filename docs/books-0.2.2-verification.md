# Books 0.2.2 deployment and offline checks

The Books shell now fetches the canonical `/books/` asset directory. Cloudflare applies HTML canonicalisation inside the asset binding: requesting `/books/index.html` can return a redirect instead of HTML. A regression reproduced the empty 307 response and passes with the canonical path; no global asset settings or existing modules changed.

The Chromium test continues to use browser offline emulation. Playwright WebKit has a reported service-worker offline-emulation failure (microsoft/playwright#42775). Its Books test therefore closes the actual loopback HTTP listener, verifies that a direct API request fails, then reloads the cached reader. The test restores the listener while preserving the same in-memory database. It does not mock the service worker or disable content security policy. This exercises lost connectivity, not physical iPhone behaviour.

The independent-database backup round-trip and all existing Books recovery, Google lifecycle and privacy checks remain release gates. Source code, clean dependency audit, browser results and Worker dry-run output must match the final commit before release. Real Google consent and physical-device checks remain separate.
