# Wacky Races v4 release

The homepage is public. Games and the zero-price gift catalogue do not require login. Sign in is at the top right. The existing private application is retained at `/account`; orders, memories, points, admin functions, exports and media retain their original backend authorisation. The original `src/index.js` and `public/app.js` are unchanged. The repository remains private.

## Play

`/games/wacky-races/?play=1` launches solo. `?friends=1` opens the friends lobby. `?room=0123` pre-fills an invitation. Old Proper Karted URLs remain supported. Return links go to `/#games`.

Five London circuits and Dublin - Liffey Lunacy remain, with kart/police/Garda/ambulance/bus choices, physics, recovery, food pickups and hazards, original music and optional credited recordings. Eight square illustrated cartoon drivers replace the original photographs in both renderers. Original photograph bytes are no longer served by the public game. Local photo choices get a graphic filter and are not sent to online rooms.

## Online rooms

Up to eight human players, four-digit codes (including leading zero), host circuit selection, ready checks, lock-new-joins, shared countdown, server-owned simulation and results, reconnect, host transfer, and return to the lobby for another circuit. Spare places have computer drivers. Online mode is a single-circuit race; the Wacky Cup remains solo.

The server owns progress, speed, collisions, pickups, recovery and classification. Clients send bounded inputs only. Simulation is 30 ticks/second with shared-core 120Hz substeps, snapshots target 15/second. A disconnected car becomes AI after a grace period; stale inputs brake. Opening an online menu does not pause friends. Solo pause remains separate.

Share invite is in Settings and the lobby. Native share is used where available, then clipboard or a visible selectable link. Invite links contain the code, never the individual seat pass. The code is a convenient invitation, not a password: share it only with the intended group and lock the lobby once they join. Rooms expire after an hour. No photo, account, email or chat payloads are shared.

## Hosting

Existing Cloudflare Worker, D1 and R2 identifiers are retained. Two SQLite Durable Objects provide the room directory and game server. No separate multiplayer provider or paid plan is selected. Hosting quotas still apply; idle simulation loops stop and room/message attempts are rate limited.

## Verification

`npm test` covers core physics, room rules, input validation, guest routing, private-route delegation, SVG portraits, tilt, audio, geometry and regressions. `npm run check` covers original account handlers, SQL migrations and syntax. Wrangler dry-run checks the deployable bundle. `tests/browser_clients.py` uses native Chromium HTTP and WebSocket clients against Wrangler or the deployed site, including full race completion and reconnect. Browser evidence is saved in workflow artifacts and the verified release report.

Long networking checks disable drawing after collecting a rendered frame. They do not measure sustained graphics performance on a handset. Share-sheet calls are captured in automated tests; actual device permission dialogues and physical gyroscope feel cannot be exercised by a desktop browser test. The game is a stylised arcade racer, not an Unreal renderer. The promotional homepage illustration is not a gameplay screenshot.
