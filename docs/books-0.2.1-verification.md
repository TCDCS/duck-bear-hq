# Books 0.2.1 recovery verification

The backup and reader browser checks run against strict production-style CSP in Chromium and WebKit. Recovery uses a second loopback server with an independent empty database; the browser exports a synthetic library, refuses an overwrite on its existing source, restores to the empty target, and reopens the original PDF at its saved page. The test checks original download bytes and separate household notes. This is not a production restore or a Google-account test.

The longest note accepted by the reader (12,000 characters) can now pass the backup validator unchanged. New reading writes reject a content locator for the wrong book format before storing it. Starting a replacement Google connection invalidates older consent windows for that owner, including a callback still waiting on Google. Existing source files and other website modules remain untouched.

The test server explicitly serves the shared HQ ZIP codec used by the Books backup screen. WebKit checks use locator assertions rather than evaluating polling strings; no unsafe-eval exception or CSP bypass is added.
