# Lucky Block Survival

## Current State
Full-stack staff portal with Motoko backend (authorization + http-outcalls) and React frontend. The backend seeds an Owner account with a password stored as a SHA-256 hash string (`88ee2d3af88ad3409dda62cd2b5eec2dd3f27b681899c8fee5421fc758ec655f`). The frontend hashes user input with SHA-256 before calling `login()`. The computed SHA-256 of "LuckyBlock2026!" is actually `3d9266fd...`, not `88ee2d3a...`, so login has never worked.

## Requested Changes (Diff)

### Add
- Nothing new to add

### Modify
- **Frontend LoginPage**: Remove SHA-256 hashing on login submit -- send the raw plain-text password directly to `actor.login(username, password)`. Remove import of `sha256Hex` from login flow.
- **Frontend AdminPanelPage**: Remove SHA-256 hashing on account creation -- send the raw plain-text password directly to `actor.createStaffAccount(...)`. Remove import of `sha256Hex` from admin panel.
- **Backend seed**: Change the Owner account's stored password from the wrong hash `"88ee2d3af88ad3409dda62cd2b5eec2dd3f27b681899c8fee5421fc758ec655f"` to plain-text `"LuckyBlock2026!"` so it matches what the frontend now sends.

### Remove
- SHA-256 hashing on the frontend (login and account creation)

## Implementation Plan
1. Edit `LoginPage.tsx`: remove `sha256Hex` call, send raw password to `actor.login()`
2. Edit `AdminPanelPage.tsx`: remove `sha256Hex` call, send raw password to `actor.createStaffAccount()`
3. Regenerate backend with plain-text password `"LuckyBlock2026!"` stored for Owner
4. Validate and deploy
