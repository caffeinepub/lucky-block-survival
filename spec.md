# Lucky Block Survival Staff Portal

## Current State
A staff management portal for a Minecraft server. It has:
- Login page with local Owner credential check (username: Sirbrit_, password hash stored in frontend)
- Dashboard, Punishment Matrix, Command Vault, Staff Logs, Leave Requests, Staff Conduct, Admin Panel pages
- Backend with staff accounts, punishment logs, LOA requests, webhook config
- The backend uses non-stable Map storage, so all data resets on every deployment
- The backend's createStaffAccount requires both an AccessControl #admin role AND a User entry in the users map for the caller — the anonymous principal (used when Owner logs in locally) never has a User entry, causing "Connection error" when trying to create staff accounts
- Staff accounts created in the backend are lost on every redeploy because maps are not stable

## Requested Changes (Diff)

### Add
- Stable persistent storage for all data (staff accounts, punishment logs, LOA requests, webhook config) using `stable var` arrays
- A password-hash-based auth model: backend functions accept (username, passwordHash) to verify identity instead of relying on ICP principal/AccessControl
- Owner credentials stored in stable vars on the backend (username + password hash), seeded on first deploy

### Modify
- All backend endpoints to use credential-based auth (username + passwordHash params) instead of AccessControl principal checks
- createStaffAccount: takes ownerPasswordHash as proof of identity, no principal/AccessControl required
- getAllUsers: takes ownerPasswordHash for auth
- submitPunishmentLog, submitLOARequest, getAllPunishmentLogs, getAllLOARequests, deactivateLOA: take (username, passwordHash) for auth
- getWebhookConfig, setWebhookConfig: take ownerPasswordHash for auth
- login: no auth needed, just check username+hash against stored users and owner credentials
- Frontend (AdminPanelPage, LoginPage, StaffLogsPage, LeaveRequestsPage): pass credentials through to backend calls

### Remove
- AccessControl / MixinAuthorization dependency from main.mo
- The initializeBackend / seedOwnerAccount pattern (owner creds are seeded as stable vars)
- The non-stable Map-based storage
- The unused getUserProfile / saveCallerUserProfile / getCallerUserProfile / getCurrentUser / changePassword (old signature) / promoteUser endpoints

## Implementation Plan
1. Regenerate backend (main.mo) with:
   - stable var arrays for usersArray, punishmentLogsArr, loaRequestsArr
   - stable var ownerUsername and ownerPasswordHash
   - All functions use credential params for auth, no AccessControl
   - login(), createStaffAccount(ownerToken, username, passwordHash, role), getAllUsers(ownerToken), removeStaffAccount(ownerToken, userId), submitPunishmentLog(username, hash, ...), getAllPunishmentLogs(username, hash), submitLOARequest(username, hash, ...), getAllLOARequests(username, hash), deactivateLOA(username, hash, loaId), getWebhookConfig(ownerToken), setWebhookConfig(ownerToken, ...), getPunishmentLogCount(), getActiveLOACount()
2. Update frontend pages to pass currentUser credentials (username + raw password hash stored in session) to all backend calls
3. Store ownerPasswordHash in session so it can be passed to backend calls
