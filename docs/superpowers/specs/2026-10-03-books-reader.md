# Duck & Bear Books and Reader

## Approved outcome
Add a private ebook library to the existing website rather than replacing any existing module. Zachary manages the shared Google connection; the original household pair can read, download, upload and maintain their own reading records. Keep the interface intuitive and low-maintenance.

## Existing source library
A separate Google account holds an eBooks folder with a Calibre library inside it. Books are arranged by author/title with OPF metadata, covers and original files. Catalogue this structure in place. Do not rename, move, remove or write to source files or metadata.db. Never include personal Drive IDs, library exports or book content in source control.

## Library and reader
Search covers, titles, authors and series; personal reading shelves, favourites, ratings and named collections. Built-in EPUB and PDF opening, downloads of original files for Kobo, EPUB typography/layout/theme controls, chapter/page navigation, search, bookmarks, notes and EPUB highlights. Per-user, per-file-version progress with portable EPUB content fragments or PDF page locators. Explicit offline copies and queued changes; detect conflicting saves rather than silently overwriting a newer device. Browser offline storage must be clearly explained and removable. A future app can consume the same JSON API.

## Access boundaries
Reuse current sessions and actual household/owner roles. OAuth credentials are server-side secrets; encrypt tokens, validate expiring state/cookie/session and use PKCE. Selected-file access is default and must not be misrepresented as recursive folder access. Any optional broader read permission requires explicit acknowledgement. Application indexing and downloads stay inside the configured root; shortcuts and moved files cannot bypass it. The existing Drive connection in chat is not the website's OAuth connection.

## Delivery boundaries
Separate development branch and database for testing. New routes and additive books_* tables, independent feature switch, lazy-loaded reader assets. Preserve all existing games, menus, family, scrapbook, plans, shop and account security. Run the existing tests as well as new unit and browser tests. Do not publish a claim of live OAuth testing without completing an actual consent, refresh and authorised file-read cycle.

## Explicit exclusions and known limits
Spotify setup deferred; YouTube Music, Steam and Escape are separate modules. The kids' activity generator is excluded. Google Photos stays primary. Escape requirements remain Dublin only, nonstop both directions, two adults. Kobo file delivery does not imply Kobo progress sync. DRM-protected books, native app binaries, text-to-speech, dictionary/translation, PDF painted highlights and unrestricted format conversion are not part of this initial reader release. The existing HQ backup is not silently redefined; new Books data needs its documented D1/R2 backup and per-user record export until integrated backup is implemented.
