# Account controls and passkeys

Continue the existing 7.1.0 application. The owner asked to resolve the email warning, create and edit users including email/password/settings, and enable passkeys. Keep the current accounts, household identity, private grants and games.

## Design
Owner user management gets a direct-create option (username, name, optional email, password) alongside invitations. Accounts start without private grants. Each account has Details, Email, Security, Settings and Permissions links. Email and credential changes require the acting owner's current password. Passwords are set/reset, never retrieved. The original pair cannot be disabled/deleted; neither changing username nor password changes household identity.

Owner-set email takes effect as the registered address without pretending mailbox ownership is verified. Self-service replacements still use verification and preserve an existing address until confirmed. Distinguish no sender from provider failure and keep owner-issued links working. Support native EMAIL binding or an explicitly supplied Resend credential; never invent a sender, enroll in a paid service, publish secrets, or report inbox delivery from an API acceptance response.

Passkeys use pinned SimpleWebAuthn verification. Store only public keys, opaque credential IDs and metadata in additive D1 tables. Registration requires a signed-in account and password confirmation. Challenges expire after five minutes, are single-use, and bind to the current session/password (registration) or HttpOnly browser cookie (login). Verify origin, relying-party ID, signature and user verification. Login must still check account active/removal state and update counter/session atomically. Keep password login/recovery. Allow each user to name/remove their own keys, and owner to revoke another user's keys. Admin password recovery revokes sessions and keys by default with explicit UI. Each device must complete its own browser prompt; no remote enrolment is claimed.

## Acceptance
Real cryptographic tests and virtual-authenticator browser registration/login, replay/expiry/origin/UV rejection, wrong-user mutation denial, disabled/deleted account denial, owner credential checks, duplicate emails/usernames, pending email visibility, safe preferences, original-pair safeguards, legacy tests, mobile overflow, Worker build and deployment source check. Use synthetic identities only. Preserve production data and credentials.
