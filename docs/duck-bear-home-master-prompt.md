# Duck & Bear Home — master build prompt

## 1. Product
Duck & Bear is a colourful public games/menu site with a private shared Home behind the existing account system. Zach and Guannan are the primary owners. Invited users may be added later and receive only the private permissions explicitly granted to them.

Keep the working games, £0 Gift Shop, Orders, Yaya Points, Menu Room, Cloudflare Worker, D1, R2, registered-email login and password recovery.

Current private-home release: 6.2.0.

## 2. Visual design
Use the supplied hand-drawn illustrations as the visual direction across both the public website and private Home: vibrant colour, warm paper, visible ink-style outlines, imperfect card borders, doodles, stickers, tape-like details and expressive anime/scrapbook energy.

The two approved illustrations at `/assets/art/yaya-dog.webp` and `/assets/art/bear-goats.webp` are public design assets in GitHub. They can be selected from Appearance as Home artwork. Other personal photographs remain private unless explicitly published.

The design must remain readable and responsive. Decorative animation respects reduced-motion preferences.

## 3. Public website
Public:
- Games
- Current Menu and Menu Archive
- £0 Gift Shop catalogue
- Sign in

Private after sign-in:
- About
- Info Library
- Our Home
- Family Tree
- Scrapbook
- private menu planning and reviews
- Plans, notes and decisions
- settings/admin

Do not expose About or Info in the public navigation. Direct `/about/*`, `/info/*` and private `/hub/*` page requests must run through Worker authentication.

## 4. Real sublinks
Use proper URLs rather than one giant dashboard or hash-only UI. Direct links must survive refresh and work with browser Back/Forward.

Private Home:
- `/hub/home/`
  - Today
  - Quick Add
- `/hub/menus/`
  - Menu Library
  - This Week
  - Past Weeks
  - Meal Reviews
- `/hub/scrapbook/`
  - Timeline
  - Add Memory
- `/hub/family/`
  - Tree
  - People
  - Relationships
- `/hub/plans/`
  - Shared Board
  - Bucket List
  - Decisions
  - Little Notes
- `/hub/info/`
  - Library
  - individual page slugs
  - New Info Page for admin
- Apps & Games
- private About
- Settings
  - Profile
  - Email
  - Password
  - Appearance
  - Privacy
  - Data & Exports
- Admin
  - Users
  - Permissions

Use dialogs only for short confirmation/action flows.

## 5. Accounts and recovery
Use existing login/session management. A registered email:
- requires current-password confirmation to add/change
- is unique
- can be used to sign in
- supports lost-password recovery without revealing whether an email exists

Admin can create, edit, disable and safely delete users, reset member passwords and manage permissions. Never remove the last active admin or the current signed-in account. If historical data prevents safe deletion, disable the account instead.

## 6. Permission model
Permissions are enforced by Worker/API, not by hidden navigation.

For Family Tree, Scrapbook and Menus:
- none
- read
- contribute
- admin

The initial Zach/Guannan accounts receive access. New members receive none until granted. Admin accounts retain full private-home access.

The legacy private Menu Room and its review media must also respect Menus permissions. Legacy shared memory media must respect Scrapbook permissions.

## 7. Family Tree
Private Family Tree supports:
- person name
- relation label
- branch
- optional birth date
- notes
- photo
- relationships: parent, partner, sibling, relative, other
- creator and timestamps

Read access may view. Contributors add/edit permitted records. Admin-level users manage the entire tree and relationships. Family Tree access never grants Scrapbook or intimate Menu Review access.

## 8. Scrapbook
Private shared Scrapbook:
- title
- story/note
- date
- mood
- photo or short video
- creator/timestamps
- timeline view
- Quick Add
- On This Day surfaced in Our Home

Private media is never placed in the public GitHub repository.

## 9. Menus
Private planning layer:
- reusable Menu Library
- cuisine, tags, description, plating/reference photo
- weekly menus with day and meal slot
- Guannan can contribute ideas
- historical weeks retained
- legacy Menu Room remains available for per-serving reviews

Menu reviews:
- overall 1–6
- taste 1–5
- plating 1–5
- comments and private photos
- special 5/6 meanings remain visible only to permitted signed-in users

## 10. Info Library
Info is signed-in only and works as a useful private library rather than one hard-coded page.

Admin can create, edit and remove pages with:
- title
- category
- page slug
- summary
- body

Seed the previous washing-up-liquid/hand-wash irritation guide as:
`/hub/info/allergies-hand-wash/`

The library groups pages by category and each page has its own direct sublink.

## 11. Plans and interaction
Shared planning board supports:
- Little Notes
- Bucket List
- Decisions with voting
- completed/reopened bucket items
- Surprise Me from open bucket-list items
- Quick Add from Home
- Today view
- On This Day from Scrapbook

Keep these lightweight and connected rather than introducing a separate chat system.

## 12. Settings
Every setting is its own sublink:
- Profile
- Email
- Password
- Appearance
- Privacy
- Data & Exports

Appearance:
- colourful anime paper
- ink sketch
- night
- reduced motion
- normal/compact navigation
- select Home artwork from the supplied public illustrations or Duck & Bear mascots

## 13. Privacy and data handling
- same-origin writes only
- authenticated private routes
- section permissions checked by API
- R2 private media
- no private API response on public homepage
- private Hub/Info/About pages excluded from service-worker caches
- private page routes run Worker-first in Cloudflare static assets
- validate file size/type
- audit account, permission and private-home changes
- do not treat hiding UI as security
- public GitHub assets contain only material explicitly approved for public use

## 14. Release
Use runtime/additive schema bootstrap for new private-home tables so deployment does not depend on the repository token having D1 migration permissions. Do not edit old applied migrations.

Run source syntax, tests, repository checks and live route verification before release. Keep existing game regressions separate from the Home changes where possible.
