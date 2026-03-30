import Text "mo:core/Text";
import Int "mo:core/Int";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // ─── Migration Stubs — Version 17 (Discord era) ────────────────────────────────────────
  // Absorb old stable variables. Safe to remove after one successful upgrade
  // beyond the version that first runs this code.
  let DISCORD_CLIENT_ID : Text = "";
  let DISCORD_CLIENT_SECRET : Text = "";
  let DISCORD_BOT_TOKEN : Text = "";
  let DISCORD_GUILD_ID : Text = "";
  let ROLE_OWNER_ID : Text = "";
  let ROLE_COOWNER_ID : Text = "";
  let ROLE_STAFF_ID : Text = "";
  let ROLE_BUILDER_ID : Text = "";

  type _LegacyRole = { #Owner; #CoOwner; #StaffBuilder };
  type _LegacyUser = {
    id : Nat; username : Text; passwordHash : Text;
    role : _LegacyRole; createdAt : Int;
  };
  type _LegacyUserProfile = {
    username : Text; ign : Text; discordUsername : Text; role : _LegacyRole;
  };
  type _LegacyDiscordSession = {
    token : Text; discordId : Text; username : Text;
    avatar : Text; role : Text; createdAt : Int;
  };
  type _LegacyPunishmentLog = {
    id : Nat; ign : Text; rnd : Text; offenseNumber : Nat;
    proof : Text; submittedBy : Text; timestamp : Int;
  };

  let users = Map.empty<Principal, _LegacyUser>();
  let userProfiles = Map.empty<Principal, _LegacyUserProfile>();
  let discordSessions = Map.empty<Text, _LegacyDiscordSession>();
  let punishmentLogs = Map.empty<Nat, _LegacyPunishmentLog>();
  var punishmentLogCounter : Nat = 0;
  var loaRequestCounter : Nat = 0;
  var webhookConfig : { punishmentWebhookUrl : Text; loaWebhookUrl : Text } = {
    punishmentWebhookUrl = ""; loaWebhookUrl = "";
  };

  // ─── Migration Stubs — Version 31 (audit schema change) ───────────────────────────
  // AuditLogEntry gained actorId in this version. Old entries are absorbed
  // under the v31 schema and discarded; new entries go into `auditLog`.
  type _V31AuditLogEntry = {
    id : Nat; action : Text; performedBy : Text;
    targetUser : ?Text; details : Text; timestamp : Int;
  };
  let auditLogStore = Map.empty<Nat, _V31AuditLogEntry>();
  var auditCounter : Nat = 0;

  // ─── Constants ─────────────────────────────────────────────────────────────
  let SESSION_EXPIRY_NS : Int = 604_800_000_000_000; // 7 days in nanoseconds
  let OWNER_USERNAME : Text = "Sirbrit_";
  // SHA-256 of "Cookies1969" — change via changePassword() after first login
  let OWNER_PASSWORD_HASH : Text = "529b2082c108a03cb8b85908c33b57cfb815b497f51aedd1bf049a87908f4080";

  // ─── Types ──────────────────────────────────────────────────────────────────
  type UserId = Nat;

  // Role hierarchy: Owner > CoOwner > Staff = Builder
  // Staff and Builder are intentional peers (equal power level).
  type Role = { #Owner; #CoOwner; #Staff; #Builder };

  type UserStatus = { #Active; #Suspended };

  type StaffUser = {
    id      : UserId;
    username     : Text;
    passwordHash : Text;
    role         : Role;
    status       : UserStatus;
    createdAt    : Int;
  };

  type PublicUser = {
    id        : UserId;
    username  : Text;
    role      : Role;
    status    : UserStatus;
    createdAt : Int;
  };

  type SessionData = {
    token     : Text;
    userId    : UserId;
    username  : Text;
    role      : Role;
    createdAt : Int;
    expiresAt : Int;
  };

  type FailedLoginAttempt = { username : Text; timestamp : Int };

  // AuditLogEntry — includes actorId so every log entry is traceable by user ID.
  type AuditLogEntry = {
    id          : Nat;
    actorId     : UserId;   // numeric ID of the user who performed the action
    action      : Text;     // e.g. "CREATE_USER", "SUSPEND_USER"
    performedBy : Text;     // username of the actor (human-readable)
    targetUser  : ?Text;    // username of the affected user, if applicable
    details     : Text;     // free-form context
    timestamp   : Int;
  };

  // ─── Stub types for future systems (architecture ready, not yet exposed) ───
  type PunishmentRecord = {
    id           : Nat;
    playerIGN    : Text;
    altAccounts  : [Text];
    category     : Text;
    offenseNumber : Nat;
    duration     : Text;
    reason       : Text;
    proofUrl     : Text;
    issuedBy     : Text;
    timestamp    : Int;
    appealed     : Bool;
    appealId     : ?Nat;
  };

  type AppealStatus = { #Pending; #Accepted; #Denied };

  type Appeal = {
    id           : Nat;
    punishmentId : Nat;
    playerIGN    : Text;
    reason       : Text;
    status       : AppealStatus;
    reviewedBy   : ?Text;
    reviewNote   : ?Text;
    submittedAt  : Int;
    reviewedAt   : ?Int;
  };

  type Strike = {
    id             : Nat;
    targetUsername : Text;
    issuedBy       : Text;
    reason         : Text;
    timestamp      : Int;
  };

  type LOARequest = {
    id              : Nat;
    ign             : Text;
    discordUsername : Text;
    leaveDate       : Text;
    returnDate      : Text;
    submittedBy     : Text;
    timestamp       : Int;
    active          : Bool;
  };

  type WebhookSettings = { punishmentWebhookUrl : Text };

  type Result<Ok, Err> = { #ok : Ok; #err : Err };

  // ─── Stable State ───────────────────────────────────────────────────────────
  var userCounter         : Nat = 0;
  var sessionCounter      : Nat = 0;
  var auditId             : Nat = 0;  // new audit counter (v31+ schema)
  var failedAttemptCounter : Nat = 0;
  var punishmentCounter   : Nat = 0;
  var loaCounter          : Nat = 0;

  let staffUsers    = Map.empty<Text, StaffUser>();
  let sessions      = Map.empty<Text, SessionData>();
  let failedLoginLog = Map.empty<Nat, FailedLoginAttempt>();
  let auditLog      = Map.empty<Nat, AuditLogEntry>(); // new schema
  let punishments   = Map.empty<Nat, PunishmentRecord>();
  let appeals       = Map.empty<Nat, Appeal>();
  let strikes       = Map.empty<Nat, Strike>();
  let loaRequests   = Map.empty<Nat, LOARequest>();

  // Default webhook pre-seeded; Owner can update via setWebhookConfig.
  var webhookSettings : WebhookSettings = {
    punishmentWebhookUrl = "https://discord.com/api/webhooks/1487211030282108938/4zE0nRI-E7WyoPv9e83iqBbwlFJVGlZUNRXoI8r2xsQezn2u4hbrj0gEY7C_6GqP3cSV";
  };

  // ─── Owner Bootstrap ─────────────────────────────────────────────────────────
  func ensureOwnerExists() {
    if (not staffUsers.containsKey(OWNER_USERNAME)) {
      userCounter += 1;
      staffUsers.add(OWNER_USERNAME, {
        id           = userCounter;
        username     = OWNER_USERNAME;
        passwordHash = OWNER_PASSWORD_HASH;
        role         = #Owner;
        status       = #Active;
        createdAt    = Time.now();
      });
    };
  };

  ensureOwnerExists();

  // ─── Private Utilities ──────────────────────────────────────────────────────
  func generateToken(username : Text) : Text {
    sessionCounter += 1;
    username # "_sess_" # Time.now().toText() # "_" # sessionCounter.toText();
  };

  func maskUser(u : StaffUser) : PublicUser {
    {
      id = u.id; username = u.username; role = u.role;
      status = u.status; createdAt = u.createdAt;
    };
  };

  func roleToText(role : Role) : Text {
    switch (role) {
      case (#Owner)   { "Owner"   };
      case (#CoOwner) { "CoOwner" };
      case (#Staff)   { "Staff"   };
      case (#Builder) { "Builder" };
    };
  };

  // ─── RBAC Core ────────────────────────────────────────────────────────────

  // Numeric power level for role comparisons.
  // Owner=100, CoOwner=75, Staff=50, Builder=50 (Staff and Builder are peers).
  func rolePower(role : Role) : Nat {
    switch (role) {
      case (#Owner)   { 100 };
      case (#CoOwner) { 75  };
      case (#Staff)   { 50  };
      case (#Builder) { 50  };
    };
  };

  // Returns #ok(()) when user.role power meets or exceeds requiredRole power.
  // Use for capability gates: "this action requires at least CoOwner."
  func requireRole(user : StaffUser, requiredRole : Role) : Result<(), Text> {
    if (rolePower(user.role) >= rolePower(requiredRole)) {
      #ok(());
    } else {
      #err("Insufficient permissions. Requires " # roleToText(requiredRole) # " or above.");
    };
  };

  // True when caller strictly outranks target.
  // Prevents peer-on-peer and upward modification (e.g. CoOwner cannot act on another CoOwner).
  func canActOn(caller : StaffUser, target : StaffUser) : Bool {
    rolePower(caller.role) > rolePower(target.role);
  };

  // True when the requested role is strictly below caller's power level.
  // Prevents assigning roles equal to or above the caller's own (no self-promotion path).
  func canAssignRole(caller : StaffUser, newRole : Role) : Bool {
    rolePower(caller.role) > rolePower(newRole);
  };

  // ─── Session Core ───────────────────────────────────────────────────────────

  // Scan every session in stable memory and evict all expired entries.
  // Called at the start of every requireAuth invocation so no stale session
  // can ever be validated, even if it somehow survived an earlier pass.
  func purgeExpiredSessions() {
    let now      = Time.now();
    let snapshot = sessions.entries().toArray();
    for ((key, session) in snapshot.vals()) {
      if (now > session.expiresAt) {
        sessions.remove(key);
      };
    };
  };

  // Revoke ALL active sessions for a given username.
  // Called when: (1) user is suspended, (2) role changes, (3) account deleted,
  // (4) password changed, (5) session rotation on new login.
  func revokeUserSessions(username : Text) {
    let snapshot = sessions.entries().toArray();
    for ((token, session) in snapshot.vals()) {
      if (session.username == username) {
        sessions.remove(token);
      };
    };
  };

  // ╔════════════════════════════════════════════════════════════════╗
  // ║  requireAuth — THE single auth gate for this backend.           ║
  // ║  EVERY protected public function calls this as its first step.   ║
  // ║                                                                  ║
  // ║  1. Purge all expired sessions from stable memory.              ║
  // ║  2. Check token exists (missing after purge = invalid/expired).  ║
  // ║  3. Fetch the LIVE user record from stable memory (not cache).   ║
  // ║  4. Reject suspended users and revoke their sessions eagerly.    ║
  // ║  Returns Result<StaffUser, Text>.                               ║
  // ╚════════════════════════════════════════════════════════════════╝
  func requireAuth(token : Text) : Result<StaffUser, Text> {
    purgeExpiredSessions();
    switch (sessions.get(token)) {
      case (null) {
        #err("Authentication required. Please log in.");
      };
      case (?session) {
        switch (staffUsers.get(session.username)) {
          case (null) {
            // Session references a deleted account — clean up and reject.
            sessions.remove(token);
            #err("User account not found.");
          };
          case (?u) {
            switch (u.status) {
              case (#Suspended) {
                // Eagerly revoke every session for this user, not just this token.
                revokeUserSessions(u.username);
                #err("Your access has been revoked.");
              };
              case (#Active) { #ok(u) };
            };
          };
        };
      };
    };
  };

  // ─── Audit ────────────────────────────────────────────────────────────────────

  // Central audit recorder.
  // actorId  — numeric UserId of the performing user
  // action   — ALL_CAPS action code (e.g. "CREATE_USER")
  // by       — username of the performer (human-readable)
  // target   — affected username, null for non-user actions
  // details  — free-form context string
  func addAudit(
    actorId : UserId,
    action  : Text,
    by      : Text,
    target  : ?Text,
    details : Text,
  ) {
    auditId += 1;
    auditLog.add(auditId, {
      id          = auditId;
      actorId;
      action;
      performedBy = by;
      targetUser  = target;
      details;
      timestamp   = Time.now();
    });
  };

  func logFailedLogin(username : Text) {
    failedAttemptCounter += 1;
    failedLoginLog.add(failedAttemptCounter, {
      username; timestamp = Time.now();
    });
  };

  // ────────────────────────────────────────────────────────────────────
  //  PUBLIC API
  //
  //  Each protected function follows the strict pattern:
  //    1. requireAuth(token)     — validate session, fetch live user
  //    2. requireRole(user, X)   — enforce minimum role
  //    3. Business logic          — hierarchy checks, input validation
  //    4. addAudit(...)          — immutable audit record
  // ────────────────────────────────────────────────────────────────────

  // ─── Authentication ─────────────────────────────────────────────────────────
  // These three functions are the auth entry points.
  // They do NOT call requireAuth because they ARE the gate.

  // Session rotation: any existing sessions for the user are revoked before
  // a new token is issued. This prevents session fixation and ensures a
  // suspended-then-reactivated user gets a clean token.
  public shared func loginWithCredentials(
    username     : Text,
    passwordHash : Text,
  ) : async Result<SessionData, Text> {
    ensureOwnerExists();
    switch (staffUsers.get(username)) {
      case (null) {
        logFailedLogin(username);
        #err("Invalid username or password.");
      };
      case (?u) {
        if (u.passwordHash != passwordHash) {
          logFailedLogin(username);
          #err("Invalid username or password.");
        } else {
          switch (u.status) {
            case (#Suspended) { #err("Your access has been revoked.") };
            case (#Active) {
              // Session rotation: revoke all prior sessions before issuing new token.
              revokeUserSessions(username);
              let now   = Time.now();
              let token = generateToken(username);
              let session : SessionData = {
                token;
                userId    = u.id;
                username  = u.username;
                role      = u.role;
                createdAt = now;
                expiresAt = now + SESSION_EXPIRY_NS;
              };
              sessions.add(token, session);
              #ok(session);
            };
          };
        };
      };
    };
  };

  // Validates a stored token and returns the live user profile.
  public shared func validateSession(token : Text) : async Result<PublicUser, Text> {
    switch (requireAuth(token)) {
      case (#err(e)) { #err(e) };
      case (#ok(u))  { #ok(maskUser(u)) };
    };
  };

  // Removes the token from stable memory.
  // Does not require auth — even an expired token should be cleanable.
  public shared func logoutSession(token : Text) : async () {
    sessions.remove(token);
  };

  // ─── User Management ────────────────────────────────────────────────────────

  public shared func createUser(
    token        : Text,
    username     : Text,
    passwordHash : Text,
    role         : Role,
  ) : async Result<UserId, Text> {
    switch (requireAuth(token)) {
      case (#err(e)) { #err(e) };
      case (#ok(caller)) {
        switch (requireRole(caller, #Owner)) {
          case (#err(e)) { #err(e) };
          case (#ok(_)) {
            // RBAC: caller cannot mint a role equal to or above their own.
            if (not canAssignRole(caller, role)) {
              return #err("Cannot create an account with role " # roleToText(role) #
                ". You may only assign roles below your own level.");
            };
            if (username.size() == 0) {
              return #err("Username cannot be empty.");
            };
            if (staffUsers.containsKey(username)) {
              return #err("Username already taken.");
            };
            userCounter += 1;
            staffUsers.add(username, {
              id           = userCounter;
              username;
              passwordHash;
              role;
              status       = #Active;
              createdAt    = Time.now();
            });
            addAudit(caller.id, "CREATE_USER", caller.username, ?username,
              "Role: " # roleToText(role));
            #ok(userCounter);
          };
        };
      };
    };
  };

  public shared func removeUser(
    token          : Text,
    targetUsername : Text,
  ) : async Result<(), Text> {
    switch (requireAuth(token)) {
      case (#err(e)) { #err(e) };
      case (#ok(caller)) {
        switch (requireRole(caller, #Owner)) {
          case (#err(e)) { #err(e) };
          case (#ok(_)) {
            switch (staffUsers.get(targetUsername)) {
              case (null)     { #err("User not found.") };
              case (?target) {
                // RBAC: cannot remove a user of equal or higher rank.
                if (not canActOn(caller, target)) {
                  return #err("Cannot remove a user with equal or higher rank.");
                };
                revokeUserSessions(targetUsername);
                staffUsers.remove(targetUsername);
                addAudit(caller.id, "REMOVE_USER", caller.username,
                  ?targetUsername, "Account deleted");
                #ok(());
              };
            };
          };
        };
      };
    };
  };

  public shared func suspendUser(
    token          : Text,
    targetUsername : Text,
  ) : async Result<(), Text> {
    switch (requireAuth(token)) {
      case (#err(e)) { #err(e) };
      case (#ok(caller)) {
        // CoOwner and above can suspend — but only users they strictly outrank.
        switch (requireRole(caller, #CoOwner)) {
          case (#err(e)) { #err(e) };
          case (#ok(_)) {
            switch (staffUsers.get(targetUsername)) {
              case (null)    { #err("User not found.") };
              case (?target) {
                if (not canActOn(caller, target)) {
                  return #err("Cannot suspend a user with equal or higher rank.");
                };
                staffUsers.add(targetUsername, {
                  id           = target.id;
                  username     = target.username;
                  passwordHash = target.passwordHash;
                  role         = target.role;
                  status       = #Suspended;
                  createdAt    = target.createdAt;
                });
                // Immediately terminate all active sessions — suspended user
                // must not be able to continue working on open tabs.
                revokeUserSessions(targetUsername);
                addAudit(caller.id, "SUSPEND_USER", caller.username,
                  ?targetUsername, "User suspended");
                #ok(());
              };
            };
          };
        };
      };
    };
  };

  public shared func activateUser(
    token          : Text,
    targetUsername : Text,
  ) : async Result<(), Text> {
    switch (requireAuth(token)) {
      case (#err(e)) { #err(e) };
      case (#ok(caller)) {
        switch (requireRole(caller, #CoOwner)) {
          case (#err(e)) { #err(e) };
          case (#ok(_)) {
            switch (staffUsers.get(targetUsername)) {
              case (null)    { #err("User not found.") };
              case (?target) {
                if (not canActOn(caller, target)) {
                  return #err("Cannot activate a user with equal or higher rank.");
                };
                staffUsers.add(targetUsername, {
                  id           = target.id;
                  username     = target.username;
                  passwordHash = target.passwordHash;
                  role         = target.role;
                  status       = #Active;
                  createdAt    = target.createdAt;
                });
                addAudit(caller.id, "ACTIVATE_USER", caller.username,
                  ?targetUsername, "User reactivated");
                #ok(());
              };
            };
          };
        };
      };
    };
  };

  public shared func updateUserRole(
    token          : Text,
    targetUsername : Text,
    newRole        : Role,
  ) : async Result<(), Text> {
    switch (requireAuth(token)) {
      case (#err(e)) { #err(e) };
      case (#ok(caller)) {
        switch (requireRole(caller, #Owner)) {
          case (#err(e)) { #err(e) };
          case (#ok(_)) {
            // Self-escalation guard.
            if (caller.username == targetUsername) {
              return #err("Cannot change your own role.");
            };
            switch (staffUsers.get(targetUsername)) {
              case (null)    { #err("User not found.") };
              case (?target) {
                // Cannot modify a user of equal or higher rank.
                if (not canActOn(caller, target)) {
                  return #err(
                    "Cannot change the role of a user with equal or higher rank.");
                };
                // Cannot assign a role equal to or above caller's own power.
                if (not canAssignRole(caller, newRole)) {
                  return #err(
                    "Cannot assign role " # roleToText(newRole) #
                    ". You may only assign roles below your own level.");
                };
                let prevRole = roleToText(target.role);
                staffUsers.add(targetUsername, {
                  id           = target.id;
                  username     = target.username;
                  passwordHash = target.passwordHash;
                  role         = newRole;
                  status       = target.status;
                  createdAt    = target.createdAt;
                });
                // Force re-login so the new role is reflected in the session.
                revokeUserSessions(targetUsername);
                addAudit(caller.id, "UPDATE_ROLE", caller.username, ?targetUsername,
                  prevRole # " → " # roleToText(newRole));
                #ok(());
              };
            };
          };
        };
      };
    };
  };

  public shared func changePassword(
    token           : Text,
    oldPasswordHash : Text,
    newPasswordHash : Text,
  ) : async Result<(), Text> {
    switch (requireAuth(token)) {
      case (#err(e)) { #err(e) };
      case (#ok(caller)) {
        if (caller.passwordHash != oldPasswordHash) {
          return #err("Incorrect current password.");
        };
        staffUsers.add(caller.username, {
          id           = caller.id;
          username     = caller.username;
          passwordHash = newPasswordHash;
          role         = caller.role;
          status       = caller.status;
          createdAt    = caller.createdAt;
        });
        // Revoke all sessions so the user re-authenticates with the new credentials.
        revokeUserSessions(caller.username);
        addAudit(caller.id, "CHANGE_PASSWORD", caller.username, null, "Password updated");
        #ok(());
      };
    };
  };

  public shared func getAllUsers(token : Text) : async Result<[PublicUser], Text> {
    switch (requireAuth(token)) {
      case (#err(e)) { #err(e) };
      case (#ok(caller)) {
        switch (requireRole(caller, #CoOwner)) {
          case (#err(e)) { #err(e) };
          case (#ok(_)) {
            #ok(staffUsers.values().toArray().map(
              func(u : StaffUser) : PublicUser { maskUser(u) }));
          };
        };
      };
    };
  };

  // ─── Audit & Security Logs ────────────────────────────────────────────────────

  public shared func getAuditLog(token : Text) : async Result<[AuditLogEntry], Text> {
    switch (requireAuth(token)) {
      case (#err(e)) { #err(e) };
      case (#ok(caller)) {
        switch (requireRole(caller, #CoOwner)) {
          case (#err(e)) { #err(e) };
          case (#ok(_))  { #ok(auditLog.values().toArray()) };
        };
      };
    };
  };

  public shared func getFailedLoginAttempts(token : Text) : async Result<[FailedLoginAttempt], Text> {
    switch (requireAuth(token)) {
      case (#err(e)) { #err(e) };
      case (#ok(caller)) {
        switch (requireRole(caller, #Owner)) {
          case (#err(e)) { #err(e) };
          case (#ok(_))  { #ok(failedLoginLog.values().toArray()) };
        };
      };
    };
  };

  // ─── Webhook Config ─────────────────────────────────────────────────────────
  // The webhook URL is stored here; the frontend discordWebhook.ts sends
  // the actual HTTP request (Motoko HTTP outcalls not needed for webhooks).

  public shared func getWebhookConfig(token : Text) : async Result<WebhookSettings, Text> {
    switch (requireAuth(token)) {
      case (#err(e)) { #err(e) };
      case (#ok(_))  { #ok(webhookSettings) };
    };
  };

  public shared func setWebhookConfig(
    token          : Text,
    punishmentUrl  : Text,
  ) : async Result<(), Text> {
    switch (requireAuth(token)) {
      case (#err(e)) { #err(e) };
      case (#ok(caller)) {
        switch (requireRole(caller, #Owner)) {
          case (#err(e)) { #err(e) };
          case (#ok(_)) {
            webhookSettings := { punishmentWebhookUrl = punishmentUrl };
            addAudit(caller.id, "SET_WEBHOOK", caller.username, null, "Webhook URL updated");
            #ok(());
          };
        };
      };
    };
  };

  // ─── LOA Requests ───────────────────────────────────────────────────────────

  public shared func submitLOARequest(
    token           : Text,
    ign             : Text,
    discordUsername : Text,
    leaveDate       : Text,
    returnDate      : Text,
  ) : async Result<Nat, Text> {
    switch (requireAuth(token)) {
      case (#err(e)) { #err(e) };
      case (#ok(caller)) {
        loaCounter += 1;
        loaRequests.add(loaCounter, {
          id = loaCounter; ign; discordUsername; leaveDate; returnDate;
          submittedBy = caller.username; timestamp = Time.now(); active = true;
        });
        addAudit(caller.id, "SUBMIT_LOA", caller.username, null,
          "IGN: " # ign # " | Leave: " # leaveDate # " | Return: " # returnDate);
        #ok(loaCounter);
      };
    };
  };

  public shared func getAllLOARequests(token : Text) : async Result<[LOARequest], Text> {
    switch (requireAuth(token)) {
      case (#err(e)) { #err(e) };
      case (#ok(_))  { #ok(loaRequests.values().toArray()) };
    };
  };

  public shared func deactivateLOA(
    token : Text,
    loaId : Nat,
  ) : async Result<(), Text> {
    switch (requireAuth(token)) {
      case (#err(e)) { #err(e) };
      case (#ok(caller)) {
        switch (loaRequests.get(loaId)) {
          case (null) { #err("LOA request not found.") };
          case (?existing) {
            loaRequests.add(loaId, {
              id              = existing.id;
              ign             = existing.ign;
              discordUsername = existing.discordUsername;
              leaveDate       = existing.leaveDate;
              returnDate      = existing.returnDate;
              submittedBy     = existing.submittedBy;
              timestamp       = existing.timestamp;
              active          = false;
            });
            addAudit(caller.id, "DEACTIVATE_LOA", caller.username, null,
              "LOA #" # loaId.toText());
            #ok(());
          };
        };
      };
    };
  };

  // ─── Punishment Logs ─────────────────────────────────────────────────────────

  public shared func submitPunishmentLog(
    token         : Text,
    playerIGN     : Text,
    category      : Text,
    offenseNumber : Nat,
    duration      : Text,
    reason        : Text,
    proofUrl      : Text,
    altAccounts   : [Text],
  ) : async Result<Nat, Text> {
    switch (requireAuth(token)) {
      case (#err(e)) { #err(e) };
      case (#ok(caller)) {
        // Staff (50) and Builder (50) are equal peers; both can submit punishments.
        // All four roles have power >= 50 so this check passes for every authenticated user.
        // It is kept explicit to document the minimum required access level.
        switch (requireRole(caller, #Staff)) {
          case (#err(e)) { #err(e) };
          case (#ok(_)) {
            punishmentCounter += 1;
            punishments.add(punishmentCounter, {
              id            = punishmentCounter;
              playerIGN;
              altAccounts;
              category;
              offenseNumber;
              duration;
              reason;
              proofUrl;
              issuedBy      = caller.username;
              timestamp     = Time.now();
              appealed      = false;
              appealId      = null;
            });
            addAudit(caller.id, "SUBMIT_PUNISHMENT", caller.username, ?playerIGN,
              "Category: " # category #
              " | Offense #" # offenseNumber.toText() #
              " | Duration: " # duration);
            #ok(punishmentCounter);
          };
        };
      };
    };
  };

  public shared func getAllPunishmentLogs(token : Text) : async Result<[PunishmentRecord], Text> {
    switch (requireAuth(token)) {
      case (#err(e)) { #err(e) };
      case (#ok(_))  { #ok(punishments.values().toArray()) };
    };
  };

  // Intentionally unauthenticated — used for public dashboard stat cards.
  public shared func getPunishmentLogCount() : async Nat {
    punishmentCounter;
  };
};
