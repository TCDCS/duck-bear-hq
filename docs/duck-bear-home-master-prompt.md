# Duck & Bear Home — master build prompt

## 1. Product
Build Duck & Bear Home as the private, personal layer of the existing Duck & Bear website. It is for Zach and Guannan first, with optional invited users later. Keep the existing public homepage, games, shop, orders, Yaya Points, Cloudflare Worker, D1, R2, login/session system, registered email login and password recovery working.

Do not rebuild working systems for the sake of it. Add the private home as an isolated layer with its own routes, database tables and permission checks.

## 2. Design
The private home should look like a colourful hand-drawn anime scrapbook rather than a corporate dashboard. Use warm paper backgrounds, imperfect ink-style borders, sticker-like cards, doodles, tape, stamps, expressive headings, soft animation and strong colour. It must still be readable, responsive and usable on a phone.

Avoid a single giant page. Use clear pages and sub-links throughout. Desktop uses a left navigation rail; mobile uses a compact bottom navigation and page tabs.

## 3. Main navigation
Private Home:
- Home
- Our Menus
  - Menu Library
  - This Week
  - Past Weeks
- Scrapbook
  - Timeline
  - Add Memory
- Family Tree
  - Tree
  - People
  - Relationships
- Apps
  - Games
  - Gift Shop
  - Yaya Points
  - Orders
  - Legacy Menu Room
- Settings
  - Profile
  - Security
  - Appearance
  - Privacy
- Admin (admin only)
  - Users
  - Permissions

Every settings area must be a separate link/state, not one long mixed settings page.

## 4. Accounts
Use the existing Duck & Bear login. Guannan must be able to register an email address, sign in using that email and use the existing lost-password flow. Do not expose whether an email exists during password recovery.

Admin can add users, edit username/display name/role/status, disable accounts, delete accounts when safe, reset passwords using the existing admin endpoint, and grant private-home permissions.

A user with historical records that prevent safe deletion should be disabled rather than having records silently destroyed.

## 5. Permission model
Permissions must be enforced in the Worker/API, not only hidden in the browser.

For Family Tree, Scrapbook and Menus use:
- none
- read
- contribute
- admin

The two accounts already present when the private-home migration is installed receive access. New non-admin accounts receive no private-home access until granted. Admin accounts keep full access.

Family Tree and Scrapbook are private. Do not expose their data through public routes, service-worker caches or public catalogue APIs.

## 6. Family Tree
Zach and Guannan can add family members. Store:
- name
- relation label
- branch
- date of birth if wanted
- notes
- optional photo
- who created the entry
- timestamps

Allow relationships between entries, including parent, partner, sibling, relative and other.

Users with read permission can view. Contributors can add and edit their own entries. Admin-level users can manage all entries and relationships.

## 7. Scrapbook
Create a private shared scrapbook for Zach and Guannan. A scrapbook item can contain:
- title
- note/story
- date
- mood/emoji
- optional photo or short video
- created by
- timestamps

The view should feel like a scrapbook wall/timeline, not a file list. Media is private and served through authenticated permission-checked routes.

## 8. Menus
Guannan must be able to add her own menu ideas and plating/reference photos.

Create:
- a reusable menu library
- cuisine
- tags
- description
- optional photo
- weekly menus
- day
- meal slot
- menu library item or custom title
- week notes

A library item should be reusable in future weeks. Both Zach and Guannan can build and change weekly menus when they have contribute access.

Keep the existing public/legacy menu area working. The new private menu home is the editable planning layer.

## 9. Settings
Profile:
- current account details

Security:
- register/change recovery email using current password
- change password
- link to recovery where appropriate

Appearance:
- light/ink/night themes
- reduce motion
- compact navigation
- save preferences locally

Privacy:
- explain who can see Family Tree, Scrapbook and Menus
- show the user's current permission levels
- state that private media is not public

## 10. Existing apps
Do not remove Games, Gift Shop, Yaya Points, Orders or the existing Menu Room. The new Home should act as the personal front door and link to those systems.

## 11. Safety and data handling
- same-origin writes only
- authenticated private routes
- R2 media kept private
- no private API response in public homepage code
- no service-worker caching of private API/media
- validate file type and size
- keep audit entries for admin/user/permission changes and private-home mutations
- prevent deletion/demotion of the last active admin
- prevent deleting the account currently in use

## 12. Release
Use additive D1 migrations. Do not edit old migrations that may already be applied in production. Update the build/version marker on release. Run existing tests/checks and add regression coverage for the private home. Deploy through the existing GitHub main → Cloudflare workflow after checks pass.

Current private-home release: 6.1.0.
