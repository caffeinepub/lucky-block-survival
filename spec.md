# Lucky Block Survival 4 — Backend Hardening

## Current State

- `main.mo` has a `requireSession(token)` private helper that validates sessions but is structurally inconsistent: some functions call it via nested `switch`, some functions (like `logoutSession`) skip it entirely, audit logging is missing from most functions, and role checks use ad-hoc `isOwnerRole`/`isCoOwnerOrAbove` helpers instead of a systematic hierarchy.
- `AuditLogEntry` type lacks `actorId` (who performed the action by ID).
- Expired sessions are only removed one-at-a-time on access, not batch-purged.
- No session rotation on login (old tokens stay alive when a new login occurs).
- Sessions are NOT invalidated when a user is suspended or their role changes.
- `backend.did.d.ts`, `backend.d.ts`, and `backend.ts` are completely stale — generated from the Discord-era codebase (v17). They declare methods like `login`, `logout`, `discordCallback`, `createStaffAccount`, `promoteUser`, `removeStaffAccount` that do not exist in the current backend, and are missing all the real current methods.
- `Role` enum in `backend.did.d.ts` uses `StaffBuilder` instead of the correct `Staff`/`Builder` variants.
- `PublicUser` in bindings lacks the `status` field.
- `WebhookConfig` in bindings has 2 fields (`loaWebhookUrl`) but the current backend only has 1 (`punishmentWebhookUrl`).
- Frontend `AuthContext.tsx` already uses `as any` casts to call the real backend methods (`loginWithCredentials`, `validateSession`, `logoutSession`) as a workaround for the stale bindings.
- Frontend `useActor.ts` still calls `actor._initializeAccessControlWithSecret` on every actor creation.

## Requested Changes (Diff)

### Add
- `rolePower(role)` — maps Role to Nat power level: Owner=100, CoOwner=75, Staff=50, Builder=50. Staff and Builder are peers (equal power).
- `requireRole(user, requiredRole)` — returns `Result<(), Text>`. Checks if `rolePower(user.role) >= rolePower(requiredRole)`. Used in every protected function.
- `canActOn(caller, target)` — returns Bool. True only when `rolePower(caller) > rolePower(target)`. Prevents peer-on-peer and upward modification.
- `canAssignRole(caller, newRole)` — returns Bool. True only when `rolePower(caller) > rolePower(newRole)`. Prevents self-promotion and assigning equal roles.
- `purgeExpiredSessions()` — scans all sessions in stable memory and removes every expired entry. Called at the top of `requireAuth`.
- `revokeUserSessions(username)` — removes all sessions belonging to a specific username. Called on suspend, role change, account removal, and password change.
- `requireAuth(token)` — the single, centralized auth gate (replaces `requireSession`). Steps: (1) purge expired sessions, (2) validate token existence, (3) fetch live user from stable memory, (4) reject suspended users and revoke their sessions. Returns `Result<StaffUser, Text>`.
- `addAudit(actorId, action, by, target, details)` — central audit recorder with `actorId : UserId` included. Every mutating function calls this as its last step.
- Session rotation on login: `loginWithCredentials` revokes all prior sessions for the user before issuing a new token.
- Migration stub for `AuditLogEntry` v31 (old schema without `actorId`) — absorbs stable data under old variable names `auditLogStore`/`auditCounter`.
- New `auditLog : Map<Nat, AuditLogEntry>` and `auditId : Nat` with the updated schema.
- `statusToText(status)` utility.

### Modify
- `AuditLogEntry` — add `actorId : UserId` field.
- `createUser` — enforces `requireRole(caller, #Owner)` + `canAssignRole` check. No Owner-level accounts can be created.
- `removeUser` — enforces `requireRole(caller, #Owner)` + `canActOn`. Revokes target's sessions before removal.
- `suspendUser` — relaxed to `requireRole(caller, #CoOwner)` + `canActOn`. Revokes all sessions for suspended user immediately.
- `activateUser` — relaxed to `requireRole(caller, #CoOwner)` + `canActOn`.
- `updateUserRole` — enforces `requireRole(caller, #Owner)` + self-change prevention + `canActOn` + `canAssignRole`. Revokes target's sessions after role change (forces re-login).
- `changePassword` — after successful change, revokes all sessions for the user (forces re-login with new credentials).
- `getAllUsers` — uses `requireRole(caller, #CoOwner)` instead of ad-hoc check.
- `getAuditLog` — uses `requireRole(caller, #CoOwner)`.
- `getFailedLoginAttempts` — uses `requireRole(caller, #Owner)`.
- `setWebhookConfig` — uses `requireRole(caller, #Owner)`.
- `submitPunishmentLog` — adds `requireRole(caller, #Staff)` check and full audit log entry.
- `deactivateLOA` — adds audit log entry.
- `submitLOARequest` — adds audit log entry.
- All mutating public functions: strict pattern — requireAuth → requireRole → validate → execute → audit.

### Remove
- `isOwnerRole(role)` helper (replaced by `requireRole`).
- `isCoOwnerOrAbove(role)` helper (replaced by `requireRole`).
- `requireSession(token)` (renamed/replaced by `requireAuth`).
- `import Order` (no longer needed — `Role.compare`/`Role.priority` module removed).
- `import Runtime` from main.mo (only used in MixinAuthorization.mo).
- `module Role { priority, compare }` block (replaced by `rolePower`).

## Implementation Plan

1. **main.mo** — Full structured rewrite:
   - Move `auditLogStore`/`auditCounter` into migration stubs section (type becomes `_V31AuditLogEntry` to absorb old stable data).
   - Add new `auditLog : Map<Nat, AuditLogEntry>` and `auditId : Nat` in new state section.
   - Remove `module Role`, `isOwnerRole`, `isCoOwnerOrAbove`.
   - Add `rolePower`, `requireRole`, `canActOn`, `canAssignRole` in new RBAC Core section.
   - Add `purgeExpiredSessions`, `revokeUserSessions`, `requireAuth` in Session Core section.
   - Update `addAudit` signature to include `actorId`.
   - Update `loginWithCredentials` to call `revokeUserSessions` before issuing new token.
   - Update all 14 protected public functions to follow the strict pattern.

2. **Frontend bindings (delegated to frontend agent)**:
   - Rewrite `backend.d.ts` to declare the real current API (token-based, correct types, correct Role enum).
   - Remove dead method stubs from `backendInterface` and `Backend` class that reference non-existent backend functions.
   - Update `useActor.ts` to remove the Internet Identity + `_initializeAccessControlWithSecret` initialization.
   - Ensure any page-level backend calls pass the session token correctly.
