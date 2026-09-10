# Duck & Bear HQ

Private two-person PWA for the £0 Shop, Yaya Points, order tracking, room service, memories, reviews, complaints, adventures and unnecessary Bear administration.

## Easiest deployment

This package is set up for **browser-only deployment**. You do not need Node.js, npm, Git or Wrangler installed on your PC.

Read `BROWSER-DEPLOY.txt`.

The flow is:

**GitHub private repository → Cloudflare Workers Builds → Worker + static PWA → D1 + R2**

Cloudflare's build system runs Node/Wrangler in the cloud. The app configuration automatically provisions the D1 and R2 bindings on first deployment. The deploy script then applies the included D1 migrations and redeploys after the database is ready.

## First login

`FIRST-LOGIN.txt` contains the one-time bootstrap key. Keep the repository private. The key only works while the database has no users; after the Bear Admin and Duck Member accounts are created, the setup endpoint refuses to run again.

## What is included

- £0 Shop with search, categories, favourites and shared cart
- checkout and unique order references
- order history, reordering and status timeline
- Bear-admin fulfilment updates
- Yaya Points transaction ledger
- earn rules, redemptions, rewards, tiers and badges
- admin credit/debit adjustments with reason and audit history
- CSV exports and JSON backup
- password change and admin member-password reset
- Date Roulette and saved dates
- Breakfast Room Service
- shared Memories backed by private R2 objects
- monthly reviews and Complaints Department
- Adventure suggestions and completion rewards
- Easter eggs and secret badges
- installable responsive PWA
- light, dark and system themes

## Data/security design

Private records are served through the Worker API. The browser does not receive D1 or R2 credentials. Passwords are hashed with PBKDF2-SHA256 and session tokens are stored server-side as hashes in secure HttpOnly cookies.

Private R2 media is delivered only through authenticated `/media/*` routes. API and media responses are excluded from the service-worker cache.

This is designed for two trusted users, not public ecommerce. Keep the repository private and use strong account passwords.

## Existing Tally points

After setup, sign in as Bear Admin and use the loyalty adjustment screen to add Guannan's existing Tally balance using a reason such as:

`Opening balance imported from Tally`

This creates a clean opening ledger entry rather than inventing old transactions.
