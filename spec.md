# Lucky Block Survival 4 — Staff Portal

## Current State

The app is a Minecraft staff management dashboard with:
- Discord OAuth2 authentication (broken — `actor.discordCallback is not a function` error persisting across 10+ fix attempts)
- Role system using 3 roles: `Owner`, `CoOwner`, `StaffBuilder` (Staff and Builder merged — incorrect)
- Frontend-only auth via `staffAccounts.ts` localStorage (the actual working auth layer)
- Backend contains Discord constants (CLIENT_SECRET, BOT_TOKEN) stored in plain code
- HTTP outcalls used for Discord OAuth and webhook APIs
- No suspension system
- No session system — no server-side session validation
- localStorage-based punishment logs, LOA, and appeals (portalData.ts)
- Webhook sending done from frontend (discordWebhook.ts)

## Requested Changes (Diff)

### Add
- Custom authentication: `loginWithCredentials(username, passwordHash)` → backend session token
- Session system: `sessions` Map (token → SessionData), 7-day expiry, validated on every request
- `validateSession(token)` → PublicUser (called on every app load)
- `logoutSession(token)` → removes session
- `UserStatus` type: `#Active | #Suspended`
- `suspendUser(token, username)` — Owner only, logged in audit log
- `activateUser(token, username)` — Owner only, logged in audit log
- Failed login logging: username + timestamp stored in backend
- Audit log: action, performedBy, targetUser, details, timestamp
- Stub types for future systems: PunishmentRecord, Appeal, Strike (with per-category + escalation fields)
- 4-role enum: `Owner > CoOwner > Staff > Builder`
- `createUser`, `removeUser`, `updateUserRole`, `changePassword` — session-token authenticated
- Username/password login form in frontend
- Session token stored in localStorage, validated against backend on app load

### Modify
- `Role` enum: split `#StaffBuilder` into `#Staff` and `#Builder`
- `PublicUser` type: add `status: UserStatus` field
- `users` Map: change key from `Principal` to `Text` (username)
- `submitLOARequest`, `getAllLOARequests`, `deactivateLOA` — add `token` param for session auth
- `submitPunishmentLog` — add `token` param, expand fields to match enhanced PunishmentRecord model
- All pages: fix `Role.StaffBuilder` references to check `Role.Staff` and `Role.Builder` separately
- `AdminPanelPage`: add suspend/activate UI, show status badges, fix role names
- `Layout.tsx`: remove Discord avatar URL, replace with initials avatar
- `AuthContext.tsx`: replace Discord session logic with backend session token logic
- `LoginPage.tsx`: replace Discord OAuth button with username/password form
- `App.tsx`: remove callback page detection

### Remove
- `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, role ID constants
- `DiscordSessionData` type and all Discord session functions
- `discordCallback`, `getDiscordSession`, `discordLogout` backend functions
- `discordSessions` Map state
- `OutCall` import (http-outcalls — only used for Discord API calls)
- `sendDiscordPunishmentWebhook`, `sendDiscordLOAWebhook` backend functions (frontend handles webhooks)
- `CallbackPage.tsx` (Discord OAuth callback handler)
- `SiDiscord` icon and `react-icons/si` Discord import in LoginPage
- `getDiscordAvatarUrl`, `discordUserToPublicUser`, Discord session helpers in AuthContext
- `discordUser` state and Discord-specific session types in AuthContext

## Implementation Plan

1. **Rewrite `src/backend/main.mo`**: Remove all Discord code, fix Role enum (4 roles), add UserStatus, rewrite auth with session tokens, add suspension + audit log, add stub types for future systems, update all function signatures to use `token: Text` param.

2. **Rewrite `src/frontend/src/contexts/AuthContext.tsx`**: Replace Discord session logic with backend session token pattern. `login()` calls `actor.loginWithCredentials()`, stores token. On mount: calls `actor.validateSession(token)`. `logout()` calls `actor.logoutSession(token)`.

3. **Rewrite `src/frontend/src/pages/LoginPage.tsx`**: Replace Discord OAuth button with username/password form. Keep staff rules scroll box and agreement checkbox. Professional white/yellow theme.

4. **Update `src/frontend/src/App.tsx`**: Remove Discord callback URL detection, simplify to just check if user is authenticated.

5. **Delete `src/frontend/src/pages/CallbackPage.tsx`**: No longer needed.

6. **Update all pages using `Role.StaffBuilder`**: Replace with checks for `Role.Staff` or `Role.Builder` where appropriate. Update display names and badge classes.

7. **Update `src/frontend/src/components/Layout.tsx`**: Remove `getDiscordAvatarUrl`, replace with initials avatar component.

8. **Update `src/frontend/src/pages/AdminPanelPage.tsx`**: Fix role display (4 roles), add suspend/activate user buttons (Owner only), show status badges.

9. **Update `src/frontend/src/lib/staffAccounts.ts`**: Fix Role enum to use 4-role system, keep as local cache layer.
