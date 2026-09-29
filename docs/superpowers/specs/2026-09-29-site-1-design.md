# Duck & Bear — Site 1 complete build prompt

Continue the existing TCDCS/duck-bear-hq website, not a replacement project. Build a joyful, personal home for Zach and Guannan (Yaya), bringing together their games, menus, rewards, family history and memories. Treat the instructions below as the product brief and acceptance criteria, not a claim that every item has already shipped.

## Intent and non-negotiables

The user has approved implementation of Site 1 and asked for the full prompt plus continued implementation. Make sensible decisions and carry the work through without repeatedly asking for permission. Preserve existing accounts, orders, points, games, menu archives and media. Do not bootstrap production accounts again. Do not expose private material merely because the repository is public. No new paid provider or subscription is authorised.

## Visual direction

Use a vibrant, hand-drawn, anime/storybook-inspired identity: warm paper surfaces, inky outlines, playful layered cards, expressive illustrations, sunny yellows, coral, turquoise, leafy greens and lilac. Duck is a yellow rubber duck, not a green mallard. Bear is a friendly brown bear. Include subtle Chinese lantern and Indian marigold/pattern accents without stereotypes. Keep copy warm, funny and personal, never corporate. Illustrations should support useful navigation rather than replace it.

Reuse verified project artwork. Earlier attached images must only be described as installed after the actual corresponding files are located. Do not silently substitute unrelated Library photos. Make designated cover images replaceable through settings with preview, alternative text and explicit publication controls. Never commit private scrapbook/family photos into the public repository. New artwork may need a separate illustration pass; label the implemented design honestly.

Use clear typography, generous whitespace, visible keyboard focus, labelled inputs, adequate contrast, reduced-motion support, and touch targets of at least 44px. No autoplay music, excessive animation or hover-only menus. Pages must work at 390px and 1440px without horizontal document overflow.

## Information architecture

Maintain the public homepage, Games, Gift Shop, existing weekly menu and dated archives, and Info. Add a signed-in Our Space area with direct URLs. Every major feature and every setting must have its own sublink, heading, breadcrumb and back navigation. Do not put the entire application in one long settings screen.

Required new routes:
- /our-space/ — private shortcuts and capability-aware cards.
- /menus/planner/ — weekly planning and publishing.
- /menus/library/ — reusable meal ideas and plating photos.
- /family/ — private family graph.
- /scrapbook/ — private memories timeline.
- /settings/ — settings directory, not an enormous form.
- /settings/profile/, /settings/security/, /settings/users/, /settings/permissions/, /settings/artwork/, /settings/updates/ — separate settings pages.
- /signin/ and /forgot-password/ — accessible account entry/recovery.

Preserve /account and its current rewards, orders and administration functions. New navigation must link to these functions until any later dedicated-page replacement is complete. Preserve game version numbers separately from the website version.

## Accounts and security

Reuse the current secure session cookie and password hashing. Guannan must be able to register her email from her signed-in security page, sign in with it, and reach a lost-password form. A recovery screen must not promise an email was sent when the configured sender is unavailable. Preserve the existing owner-assisted reset path and state the email configuration limitation plainly.

Zach must be able to add, edit, disable, restore and delete users. New users start with no private-section grants. User deletion revokes sessions and grants immediately and anonymises the account while retaining referential order/audit history; explain this in the confirmation. Do not silently destroy order/points records. Protect the owner and partner accounts from this deletion flow. Do not allow new users to choose administrator status or private permissions through registration or profile fields.

Record grants separately for menus and family tree, with none/read/contribute levels. Both original owners have full access. Other accounts do not inherit access simply by signing in. Scrapbook is restricted to Zach and Guannan; do not grant third-party scrapbook access as a side effect of a family-tree invitation. Preserve the original legacy-user boundary so new accounts cannot reach older shared-private APIs or media by typing URLs. Check permissions in the Worker on every request, not only the frontend.

Pin the original owner identity at migration. Automatically recognise the partner only when the existing account set is exactly the original one-admin/one-member pair. Otherwise require the owner to select the partner explicitly. Never infer private access from a display name. Use additive migrations, prepared SQL, auditable writes, strict input validation and conflict detection. Private responses/media must be no-store. No passwords, reset tokens or private records in client storage, public source or logs.

## Menus and meal library

Let Guannan add and edit reusable meals with name, description, meal type, ingredients and plating/reference photo. Support archiving/removing ideas and selecting them in later weeks. Allow a Monday-based week picker; create a draft, add breakfast/lunch/dinner/other slots, select an existing meal or enter a custom choice, add notes, save and publish. Copy a week to a new Monday without overwriting an existing target week. Publishing preserves older weeks; do not replace a single JSON blob containing every week or mutate the original HTML menu archive.

Draft and published new planner data are members-only in this release. Publishing means visible to authorised menu readers, not public on the internet; label it accordingly. Preserve the existing authored public weekly menu and archive as independent historical pages. Include empty, loading, permission-denied, failed-save and stale-revision states. Keep draft text on a failed save.

## Family tree

Allow authorised contributors to create, edit and remove family-person records, with name, optional birth/death dates, notes and a private portrait. Add parent-child and partner relationships, display connections and allow navigation between linked people. Never invent family members or relationships. Reject self-links, duplicate/reversed partner links, nonexistent people, impossible dates and parent cycles. Removing a person removes only their links; confirm first. Provide search and a readable grouped tree/list on phones. Read-only grants must not permit writes, uploads or direct API modifications.

## Scrapbook

Give only Zach and Guannan a shared private timeline with title, date, location, story, tags, favourite marker and photograph. Support creating, editing, favouriting, searching and deleting memories, with confirmation and a private image viewer. Use real persistence across devices, not localStorage as a database. Do not manufacture example personal events. Keep other users' access denied even when they know an entry or attachment ID.

## Media and replaceable artwork

Use the existing private R2 bucket plus D1 metadata. Accept bounded JPEG, PNG and WebP uploads only for this release; validate file signatures, not only filenames/content-type. Limit each upload to 8 MiB. Optimise photos in the browser before upload where possible. Authorise upload and retrieval by module. Store generated keys rather than user-supplied paths. Never serve user SVG or HTML as images.

Provide cover slots for public home, menus, family and scrapbook. Private uploads cannot be recycled into a public cover. Public homepage artwork needs a separate artwork upload and an explicit publish checkbox; the permission change must be intentional and auditable. Private covers stay authenticated. Support alternative text, preview, replacement and resetting to the built-in illustration. Do not assert missing historical attachments have been added.

## Interactive details

Add meaningful interactions already supported by the above data: searchable meal cards, copy-week controls, family relationship navigation, favourite memories, image previews and a version/changelog page. Preserve all games and multiplayer. Avoid expanding into chat, location tracking, social feeds or unrelated services. Treat additional calendar, quizzes and anniversary notifications as future extensions, not pretend-complete buttons.

## Implementation boundaries

Keep the existing Cloudflare Worker, D1, R2 and static frontend. Add focused modules for permissions, records, media and user administration. Reuse existing authentication helpers rather than maintaining incompatible cookies. Existing game Worker routing and Durable Object bindings stay unchanged. Update the website version from 6.0.0 to 7.0.0, expose it on the home/settings surfaces, and retain a build marker/changelog. Do not bump unrelated game versions.

## Verification and release

Start from a clean baseline; the retrieved baseline has 268 passing tests. Write new behavioural tests before implementation. Exercise owner, partner, contributor, reader, unrelated account and anonymous cases; include direct-media denial and immediate revocation. Verify real SQLite migrations and persistence, published-week conflicts, copy-week collisions, family-cycle rejection and invalid uploads. Run the entire original suite, syntax/migration checks and a Worker dry build. Capture actual browser screenshots at desktop/mobile sizes and exercise actual controls. A screenshot alone does not establish persistence or authorisation.

Commit tested work to the isolated development branch first. Main triggers production deployment. Do not merge broken tests or an unbuilt Worker. Apply the additive migration before deployment; verify the actual deployed version and routes before saying live. If release verification cannot finish, report exactly what is implemented, tested, committed and not deployed. Never equate a branch push, a mockup or a queued workflow with a live release.
