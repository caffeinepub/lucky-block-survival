# Lucky Block Survival Staff Portal

## Current State

The app has a full-stack staff portal with:
- Login gate (username + SHA-256 hashed password)
- Dashboard, Punishment Matrix, Command Vault, Staff Logs, Leave Requests, Staff Conduct, Admin Panel
- Discord Webhook integration for punishment logs and LOA submissions

**Root bug**: The backend stores users in a `Map<Principal, User>` keyed by ICP principal. The Owner account is seeded inside `initializeBackend()`, which must be called by the Caffeine admin. If this call never occurs (or canister state resets), the users map is empty and login always fails. Additionally, `createStaffAccount` takes a `userPrincipal` parameter, and the frontend always passes `Principal.anonymous()` for new staff — meaning all staff would share the same key and overwrite each other.

## Requested Changes (Diff)

### Add
- Auto-seed the Owner account at actor startup (not in `initializeBackend`) so login always works without any external initialization
- Username-keyed user storage (`Map<Text, User>`) so login and user lookup work by username, not by ICP principal
- A separate `principalToUsername` map for session tracking (maps the caller's principal at login time to their username)
- `createStaffAccount` takes a username + passwordHash + role only (no `userPrincipal` parameter), stores by username

### Modify
- `initializeBackend` becomes a no-op (kept for Caffeine platform compatibility but does nothing harmful)
- `login` looks up by username directly in `usersByUsername`, no principal dependency
- `createStaffAccount` signature removes `userPrincipal` param; stores user by username only
- `removeStaffAccount` takes a `username : Text` instead of `userPrincipal : Principal`
- `promoteUser` takes a `username : Text` instead of `userPrincipal : Principal`
- All authorization checks removed from `getAllPunishmentLogs`, `getAllLOARequests`, `getActiveLOACount`, `getPunishmentLogCount`, `getAllUsers` so they work for anonymous callers too
- `getWebhookConfig` and `setWebhookConfig` check session-based ownership (via `principalToUsername`) instead of access control

### Remove
- Dependency on `MixinAuthorization` and `AccessControl` for user management (still imported but no longer used for gating)
- `Principal`-keyed user maps

## Implementation Plan

1. Rewrite `main.mo`:
   - Use `Map<Text, User>` (`usersByUsername`) as primary user store
   - Use `Map<Principal, Text>` (`principalToUsername`) for session tracking
   - Seed Owner account at startup in an `ownerSeeded` flag pattern
   - `login(username, password)`: lookup by username, compare hash, record principal->username on success
   - `createStaffAccount(username, passwordHash, role)`: no principal param
   - `removeStaffAccount(username)`: by username
   - `promoteUser(username, newRole)`: by username
   - Keep all other backend functions (punishment logs, LOA requests, webhook config) with same signatures
2. Update frontend `AdminPanelPage.tsx` to call `createStaffAccount` without the `userPrincipal` argument and `removeStaffAccount`/`promoteUser` with username strings
3. The `backend.d.ts` will be regenerated automatically with new signatures
