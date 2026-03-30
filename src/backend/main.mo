import Text "mo:core/Text";
import Int "mo:core/Int";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Order "mo:core/Order";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // ─── Migration Stubs ────────────────────────────────────────────────────────────
  // These declarations absorb stable memory from the previous canister version.
  // The old Discord data is loaded into them on upgrade and then silently discarded.
  // They can be removed after one further successful upgrade cycle.

  // Old Discord text constants (were implicit stable lets in previous version)
  let DISCORD_CLIENT_ID : Text = "";
  let DISCORD_CLIENT_SECRET : Text = "";
  let DISCORD_BOT_TOKEN : Text = "";
  let DISCORD_GUILD_ID : Text = "";
  let ROLE_OWNER_ID : Text = "";
  let ROLE_COOWNER_ID : Text = "";
  let ROLE_STAFF_ID : Text = "";
  let ROLE_BUILDER_ID : Text = "";

  // Legacy type definitions required to satisfy stable-type structural compatibility
  type _LegacyRole = { #Owner; #CoOwner; #StaffBuilder };
  type _LegacyUser = {
    id : Nat;
    username : Text;
    passwordHash : Text;
    role : _LegacyRole;
    createdAt : Int;
  };
  type _LegacyUserProfile = {
    username : Text;
    ign : Text;
    discordUsername : Text;
    role : _LegacyRole;
  };
  type _LegacyDiscordSession = {
    token : Text;
    discordId : Text;
    username : Text;
    avatar : Text;
    role : Text;
    createdAt : Int;
  };
  type _LegacyPunishmentLog = {
    id : Nat;
    ign : Text;
    rnd : Text;
    offenseNumber : Nat;
    proof : Text;
    submittedBy : Text;
    timestamp : Int;
  };

  // Old stable Maps — same names, legacy types, absorb old data on upgrade
  let users = Map.empty<Principal, _LegacyUser>();
  let userProfiles = Map.empty<Principal, _LegacyUserProfile>();
  let discordSessions = Map.empty<Text, _LegacyDiscordSession>();
  let punishmentLogs = Map.empty<Nat, _LegacyPunishmentLog>();

  // Old counters — same names, absorb old values on upgrade
  var punishmentLogCounter : Nat = 0;
  var loaRequestCounter : Nat = 0;

  // Old webhookConfig: kept with OLD struct (2 fields) to absorb M0216
  var webhookConfig : { punishmentWebhookUrl : Text; loaWebhookUrl : Text } = {
    punishmentWebhookUrl = "";
    loaWebhookUrl = "";
  };

  // ─── Constants ─────────────────────────────────────────────────────────────────
  // 7 days in nanoseconds
  let SESSION_EXPIRY_NS : Int = 604_800_000_000_000;

  // Owner bootstrap credentials (SHA-256 of "Cookies1969")
  // Change this via changePassword() after first login.
  let OWNER_USERNAME : Text = "Sirbrit_";
  let OWNER_PASSWORD_HASH : Text = "529b2082c108a03cb8b85908c33b57cfb815b497f51aedd1bf049a87908f4080";

  // ─── Types ───────────────────────────────────────────────────────────────────
  type UserId = Nat;

  // Role priority: Owner > CoOwner > Staff > Builder
  type Role = {
    #Owner;
    #CoOwner;
    #Staff;
    #Builder;
  };

  module Role {
    public func priority(role : Role) : Nat {
      switch (role) {
        case (#Owner) { 0 };
        case (#CoOwner) { 1 };
        case (#Staff) { 2 };
        case (#Builder) { 3 };
      };
    };

    public func compare(r1 : Role, r2 : Role) : Order.Order {
      Nat.compare(priority(r1), priority(r2));
    };
  };

  type UserStatus = {
    #Active;
    #Suspended;
  };

  type StaffUser = {
    id : UserId;
    username : Text;
    passwordHash : Text;
    role : Role;
    status : UserStatus;
    createdAt : Int;
  };

  type PublicUser = {
    id : UserId;
    username : Text;
    role : Role;
    status : UserStatus;
    createdAt : Int;
  };

  type SessionData = {
    token : Text;
    userId : UserId;
    username : Text;
    role : Role;
    createdAt : Int;
    expiresAt : Int;
  };

  type FailedLoginAttempt = {
    username : Text;
    timestamp : Int;
  };

  type AuditLogEntry = {
    id : Nat;
    action : Text;
    performedBy : Text;
    targetUser : ?Text;
    details : Text;
    timestamp : Int;
  };

  // ─── Stub Types for Future Systems ────────────────────────────────────────────

  type OffenseCategory = Text;

  type PunishmentRecord = {
    id : Nat;
    playerIGN : Text;
    altAccounts : [Text];
    category : OffenseCategory;
    offenseNumber : Nat;
    duration : Text;
    reason : Text;
    proofUrl : Text;
    issuedBy : Text;
    timestamp : Int;
    appealed : Bool;
    appealId : ?Nat;
  };

  type AppealStatus = { #Pending; #Accepted; #Denied };

  type Appeal = {
    id : Nat;
    punishmentId : Nat;
    playerIGN : Text;
    reason : Text;
    status : AppealStatus;
    reviewedBy : ?Text;
    reviewNote : ?Text;
    submittedAt : Int;
    reviewedAt : ?Int;
  };

  type Strike = {
    id : Nat;
    targetUsername : Text;
    issuedBy : Text;
    reason : Text;
    timestamp : Int;
  };

  type LOARequest = {
    id : Nat;
    ign : Text;
    discordUsername : Text;
    leaveDate : Text;
    returnDate : Text;
    submittedBy : Text;
    timestamp : Int;
    active : Bool;
  };

  type WebhookSettings = { punishmentWebhookUrl : Text };

  type Result<Ok, Err> = { #ok : Ok; #err : Err };

  // ─── New State (distinct names to avoid migration collisions) ────────────────────
  var userCounter : Nat = 0;
  var sessionCounter : Nat = 0;
  var auditCounter : Nat = 0;
  var failedAttemptCounter : Nat = 0;
  var punishmentCounter : Nat = 0;
  var loaCounter : Nat = 0;

  // staffUsers: username → StaffUser (new text-keyed store)
  let staffUsers = Map.empty<Text, StaffUser>();
  let sessions = Map.empty<Text, SessionData>();
  let failedLoginLog = Map.empty<Nat, FailedLoginAttempt>();
  let auditLogStore = Map.empty<Nat, AuditLogEntry>();

  // Future system containers
  let punishments = Map.empty<Nat, PunishmentRecord>();
  let appeals = Map.empty<Nat, Appeal>();
  let strikes = Map.empty<Nat, Strike>();
  let loaRequests = Map.empty<Nat, LOARequest>();

  // New webhook config (single field, different variable name)
  var webhookSettings : WebhookSettings = { punishmentWebhookUrl = "" };

  // ─── Owner Bootstrap ──────────────────────────────────────────────────────────
  func ensureOwnerExists() {
    if (not staffUsers.containsKey(OWNER_USERNAME)) {
      userCounter += 1;
      let owner : StaffUser = {
        id = userCounter;
        username = OWNER_USERNAME;
        passwordHash = OWNER_PASSWORD_HASH;
        role = #Owner;
        status = #Active;
        createdAt = Time.now();
      };
      staffUsers.add(OWNER_USERNAME, owner);
    };
  };

  // Seed owner on deployment
  ensureOwnerExists();

  // ─── Private Helpers ──────────────────────────────────────────────────────────
  func generateToken(username : Text) : Text {
    sessionCounter += 1;
    username # "_sess_" # Time.now().toText() # "_" # sessionCounter.toText();
  };

  func maskUser(u : StaffUser) : PublicUser {
    { id = u.id; username = u.username; role = u.role; status = u.status; createdAt = u.createdAt };
  };

  func isOwnerRole(role : Role) : Bool {
    switch (role) { case (#Owner) { true }; case (_) { false } };
  };

  func isCoOwnerOrAbove(role : Role) : Bool {
    switch (role) { case (#Owner) { true }; case (#CoOwner) { true }; case (_) { false } };
  };

  func roleToText(role : Role) : Text {
    switch (role) {
      case (#Owner) { "Owner" };
      case (#CoOwner) { "CoOwner" };
      case (#Staff) { "Staff" };
      case (#Builder) { "Builder" };
    };
  };

  func addAudit(action : Text, by : Text, target : ?Text, details : Text) {
    auditCounter += 1;
    auditLogStore.add(auditCounter, { id = auditCounter; action; performedBy = by; targetUser = target; details; timestamp = Time.now() });
  };

  func logFailedLogin(username : Text) {
    failedAttemptCounter += 1;
    failedLoginLog.add(failedAttemptCounter, { username; timestamp = Time.now() });
  };

  // Session validation for update calls — also cleans up expired/revoked sessions
  func requireSession(token : Text) : Result<StaffUser, Text> {
    switch (sessions.get(token)) {
      case (null) { #err("Authentication required. Please log in.") };
      case (?session) {
        if (Time.now() > session.expiresAt) {
          sessions.remove(token);
          #err("Session expired. Please log in again.");
        } else {
          switch (staffUsers.get(session.username)) {
            case (null) { #err("User account not found.") };
            case (?u) {
              switch (u.status) {
                case (#Suspended) {
                  sessions.remove(token);
                  #err("Your access has been revoked.");
                };
                case (#Active) { #ok(u) };
              };
            };
          };
        };
      };
    };
  };

  // ─── Authentication ──────────────────────────────────────────────────────────

  public shared func loginWithCredentials(username : Text, passwordHash : Text) : async Result<SessionData, Text> {
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
              let now = Time.now();
              let token = generateToken(username);
              let session : SessionData = {
                token;
                userId = u.id;
                username = u.username;
                role = u.role;
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

  public shared func validateSession(token : Text) : async Result<PublicUser, Text> {
    switch (requireSession(token)) {
      case (#err(e)) { #err(e) };
      case (#ok(u)) { #ok(maskUser(u)) };
    };
  };

  public shared func logoutSession(token : Text) : async () {
    sessions.remove(token);
  };

  // ─── User Management ──────────────────────────────────────────────────────────

  public shared func createUser(
    token : Text,
    username : Text,
    passwordHash : Text,
    role : Role,
  ) : async Result<UserId, Text> {
    switch (requireSession(token)) {
      case (#err(e)) { #err(e) };
      case (#ok(caller)) {
        if (not isOwnerRole(caller.role)) {
          #err("Only Owner can create accounts.");
        } else if (username.size() == 0) {
          #err("Username cannot be empty.");
        } else if (staffUsers.containsKey(username)) {
          #err("Username already taken.");
        } else {
          userCounter += 1;
          staffUsers.add(username, {
            id = userCounter;
            username;
            passwordHash;
            role;
            status = #Active;
            createdAt = Time.now();
          });
          addAudit("CREATE_USER", caller.username, ?username, "Role: " # roleToText(role));
          #ok(userCounter);
        };
      };
    };
  };

  public shared func removeUser(token : Text, targetUsername : Text) : async Result<(), Text> {
    switch (requireSession(token)) {
      case (#err(e)) { #err(e) };
      case (#ok(caller)) {
        if (not isOwnerRole(caller.role)) {
          #err("Only Owner can remove accounts.");
        } else {
          switch (staffUsers.get(targetUsername)) {
            case (null) { #err("User not found.") };
            case (?target) {
              if (isOwnerRole(target.role)) {
                #err("Cannot remove the Owner account.");
              } else {
                staffUsers.remove(targetUsername);
                addAudit("REMOVE_USER", caller.username, ?targetUsername, "");
                #ok(());
              };
            };
          };
        };
      };
    };
  };

  public shared func suspendUser(token : Text, targetUsername : Text) : async Result<(), Text> {
    switch (requireSession(token)) {
      case (#err(e)) { #err(e) };
      case (#ok(caller)) {
        if (not isOwnerRole(caller.role)) {
          #err("Only Owner can suspend users.");
        } else {
          switch (staffUsers.get(targetUsername)) {
            case (null) { #err("User not found.") };
            case (?target) {
              if (isOwnerRole(target.role)) {
                #err("Cannot suspend the Owner account.");
              } else {
                staffUsers.add(targetUsername, {
                  id = target.id;
                  username = target.username;
                  passwordHash = target.passwordHash;
                  role = target.role;
                  status = #Suspended;
                  createdAt = target.createdAt;
                });
                addAudit("SUSPEND_USER", caller.username, ?targetUsername, "User suspended");
                #ok(());
              };
            };
          };
        };
      };
    };
  };

  public shared func activateUser(token : Text, targetUsername : Text) : async Result<(), Text> {
    switch (requireSession(token)) {
      case (#err(e)) { #err(e) };
      case (#ok(caller)) {
        if (not isOwnerRole(caller.role)) {
          #err("Only Owner can activate users.");
        } else {
          switch (staffUsers.get(targetUsername)) {
            case (null) { #err("User not found.") };
            case (?target) {
              staffUsers.add(targetUsername, {
                id = target.id;
                username = target.username;
                passwordHash = target.passwordHash;
                role = target.role;
                status = #Active;
                createdAt = target.createdAt;
              });
              addAudit("ACTIVATE_USER", caller.username, ?targetUsername, "User reactivated");
              #ok(());
            };
          };
        };
      };
    };
  };

  public shared func updateUserRole(
    token : Text,
    targetUsername : Text,
    newRole : Role,
  ) : async Result<(), Text> {
    switch (requireSession(token)) {
      case (#err(e)) { #err(e) };
      case (#ok(caller)) {
        if (not isOwnerRole(caller.role)) {
          #err("Only Owner can change user roles.");
        } else {
          switch (staffUsers.get(targetUsername)) {
            case (null) { #err("User not found.") };
            case (?target) {
              staffUsers.add(targetUsername, {
                id = target.id;
                username = target.username;
                passwordHash = target.passwordHash;
                role = newRole;
                status = target.status;
                createdAt = target.createdAt;
              });
              addAudit("UPDATE_ROLE", caller.username, ?targetUsername, "New role: " # roleToText(newRole));
              #ok(());
            };
          };
        };
      };
    };
  };

  public shared func changePassword(
    token : Text,
    oldPasswordHash : Text,
    newPasswordHash : Text,
  ) : async Result<(), Text> {
    switch (requireSession(token)) {
      case (#err(e)) { #err(e) };
      case (#ok(caller)) {
        if (caller.passwordHash != oldPasswordHash) {
          #err("Incorrect current password.");
        } else {
          staffUsers.add(caller.username, {
            id = caller.id;
            username = caller.username;
            passwordHash = newPasswordHash;
            role = caller.role;
            status = caller.status;
            createdAt = caller.createdAt;
          });
          #ok(());
        };
      };
    };
  };

  public shared func getAllUsers(token : Text) : async Result<[PublicUser], Text> {
    switch (requireSession(token)) {
      case (#err(e)) { #err(e) };
      case (#ok(caller)) {
        if (not isCoOwnerOrAbove(caller.role)) {
          #err("Insufficient permissions.");
        } else {
          #ok(staffUsers.values().toArray().map(func(u : StaffUser) : PublicUser { maskUser(u) }));
        };
      };
    };
  };

  // ─── Audit & Security Logs ───────────────────────────────────────────────────────

  public shared func getAuditLog(token : Text) : async Result<[AuditLogEntry], Text> {
    switch (requireSession(token)) {
      case (#err(e)) { #err(e) };
      case (#ok(caller)) {
        if (not isCoOwnerOrAbove(caller.role)) {
          #err("Insufficient permissions.");
        } else {
          #ok(auditLogStore.values().toArray());
        };
      };
    };
  };

  public shared func getFailedLoginAttempts(token : Text) : async Result<[FailedLoginAttempt], Text> {
    switch (requireSession(token)) {
      case (#err(e)) { #err(e) };
      case (#ok(caller)) {
        if (not isOwnerRole(caller.role)) {
          #err("Only Owner can view failed login attempts.");
        } else {
          #ok(failedLoginLog.values().toArray());
        };
      };
    };
  };

  // ─── Webhook Config ───────────────────────────────────────────────────────────
  // Webhook URL is stored here; the frontend (discordWebhook.ts) sends the actual HTTP request.

  public shared func getWebhookConfig(token : Text) : async Result<WebhookSettings, Text> {
    switch (requireSession(token)) {
      case (#err(e)) { #err(e) };
      case (#ok(_)) { #ok(webhookSettings) };
    };
  };

  public shared func setWebhookConfig(token : Text, punishmentUrl : Text) : async Result<(), Text> {
    switch (requireSession(token)) {
      case (#err(e)) { #err(e) };
      case (#ok(caller)) {
        if (not isOwnerRole(caller.role)) {
          #err("Only Owner can configure webhooks.");
        } else {
          webhookSettings := { punishmentWebhookUrl = punishmentUrl };
          addAudit("SET_WEBHOOK", caller.username, null, "Webhook URL updated");
          #ok(());
        };
      };
    };
  };

  // ─── LOA Requests ─────────────────────────────────────────────────────────────

  public shared func submitLOARequest(
    token : Text,
    ign : Text,
    discordUsername : Text,
    leaveDate : Text,
    returnDate : Text,
  ) : async Result<Nat, Text> {
    switch (requireSession(token)) {
      case (#err(e)) { #err(e) };
      case (#ok(caller)) {
        loaCounter += 1;
        loaRequests.add(loaCounter, {
          id = loaCounter;
          ign;
          discordUsername;
          leaveDate;
          returnDate;
          submittedBy = caller.username;
          timestamp = Time.now();
          active = true;
        });
        #ok(loaCounter);
      };
    };
  };

  public shared func getAllLOARequests(token : Text) : async Result<[LOARequest], Text> {
    switch (requireSession(token)) {
      case (#err(e)) { #err(e) };
      case (#ok(_)) { #ok(loaRequests.values().toArray()) };
    };
  };

  public shared func deactivateLOA(token : Text, loaId : Nat) : async Result<(), Text> {
    switch (requireSession(token)) {
      case (#err(e)) { #err(e) };
      case (#ok(_)) {
        switch (loaRequests.get(loaId)) {
          case (null) { #err("LOA request not found.") };
          case (?existing) {
            loaRequests.add(loaId, {
              id = existing.id;
              ign = existing.ign;
              discordUsername = existing.discordUsername;
              leaveDate = existing.leaveDate;
              returnDate = existing.returnDate;
              submittedBy = existing.submittedBy;
              timestamp = existing.timestamp;
              active = false;
            });
            #ok(());
          };
        };
      };
    };
  };

  // ─── Punishment Logs ──────────────────────────────────────────────────────────
  // Backend punishment store (frontend also uses localStorage via portalData.ts — both coexist).

  public shared func submitPunishmentLog(
    token : Text,
    playerIGN : Text,
    category : Text,
    offenseNumber : Nat,
    duration : Text,
    reason : Text,
    proofUrl : Text,
    altAccounts : [Text],
  ) : async Result<Nat, Text> {
    switch (requireSession(token)) {
      case (#err(e)) { #err(e) };
      case (#ok(caller)) {
        punishmentCounter += 1;
        punishments.add(punishmentCounter, {
          id = punishmentCounter;
          playerIGN;
          altAccounts;
          category;
          offenseNumber;
          duration;
          reason;
          proofUrl;
          issuedBy = caller.username;
          timestamp = Time.now();
          appealed = false;
          appealId = null;
        });
        #ok(punishmentCounter);
      };
    };
  };

  public shared func getAllPunishmentLogs(token : Text) : async Result<[PunishmentRecord], Text> {
    switch (requireSession(token)) {
      case (#err(e)) { #err(e) };
      case (#ok(_)) { #ok(punishments.values().toArray()) };
    };
  };

  public shared func getPunishmentLogCount() : async Nat {
    punishmentCounter;
  };
};
