import Text "mo:core/Text";
import Int "mo:core/Int";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Order "mo:core/Order";
import Array "mo:core/Array";
import Blob "mo:core/Blob";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import VarArray "mo:core/VarArray";
import OutCall "http-outcalls/outcall";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  // Initialize the user system state
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Types
  type UserId = Nat;

  type Role = {
    #Owner;
    #CoOwner;
    #StaffBuilder;
  };

  module Role {
    public func compare(role1 : Role, role2 : Role) : Order.Order {
      switch (role1, role2) {
        case (#Owner, #Owner) { #equal };
        case (#Owner, _) { #less };
        case (#CoOwner, #Owner) { #greater };
        case (#CoOwner, #CoOwner) { #equal };
        case (#CoOwner, #StaffBuilder) { #less };
        case (#StaffBuilder, #StaffBuilder) { #equal };
        case (#StaffBuilder, _) { #greater };
      };
    };
  };

  type User = {
    id : UserId;
    username : Text;
    passwordHash : Text;
    role : Role;
    createdAt : Int;
  };

  module User {
    public func compareByUsername(user1 : User, user2 : User) : Order.Order {
      Text.compare(user1.username, user2.username);
    };
  };

  type PublicUser = {
    id : UserId;
    username : Text;
    role : Role;
    createdAt : Int;
  };

  type PunishmentLog = {
    id : Nat;
    ign : Text;
    rnd : Text;
    offenseNumber : Nat;
    proof : Text;
    submittedBy : Text;
    timestamp : Int;
  };

  module PunishmentLog {
    public func compareByTimestamp(p1 : PunishmentLog, p2 : PunishmentLog) : Order.Order {
      Int.compare(p1.timestamp, p2.timestamp);
    };
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

  module LOARequest {
    public func compareByTimestamp(l1 : LOARequest, l2 : LOARequest) : Order.Order {
      Int.compare(l1.timestamp, l2.timestamp);
    };
  };

  type WebhookConfig = {
    punishmentWebhookUrl : Text;
    loaWebhookUrl : Text;
  };

  type UserProfile = {
    username : Text;
    ign : Text;
    discordUsername : Text;
    role : Role;
  };

  type Result<Ok, Err> = {
    #ok : Ok;
    #err : Err;
  };

  // State
  let users = Map.empty<Principal, User>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  let punishmentLogs = Map.empty<Nat, PunishmentLog>();
  let loaRequests = Map.empty<Nat, LOARequest>();
  var punishmentLogCounter = 0;
  var loaRequestCounter = 0;
  var userCounter = 0;
  var webhookConfig : WebhookConfig = {
    punishmentWebhookUrl = "";
    loaWebhookUrl = "";
  };

  // Backend Initialization
  public shared ({ caller }) func initializeBackend(didSeed : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can initialize backend");
    };
    switch (didSeed) {
      case ("") { Runtime.trap("Seed must not be empty") };
      case (_) {
        seedOwnerAccount(caller, didSeed);
      };
    };
  };

  func seedOwnerAccount(principal : Principal, didSeed : Text) {
    let ownerId = generateSeededId(0, didSeed.concat("0"));
    let owner : User = {
      id = ownerId;
      username = "Owner";
      passwordHash = "d9b5f58f0b38198293971865a14074f59eba3e82595becbe86ae51f1d9f1f65e";
      role = #Owner;
      createdAt = Time.now();
    };
    users.add(principal, owner);

    let ownerProfile : UserProfile = {
      username = "Owner";
      ign = "Owner";
      discordUsername = "Owner";
      role = #Owner;
    };
    userProfiles.add(principal, ownerProfile);

    userCounter += 1;
  };

  func generateSeededId(counter : Nat, seed : Text) : Nat {
    let tokens = 2415919104 / 256;
    let extra = 241591910 / 1000;
    counter * 2415919104 + tokens + extra;
  };

  // User Profile Management (Required by instructions)
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Helper functions
  func getUserByCaller(caller : Principal) : Result<User, Text> {
    switch (users.get(caller)) {
      case (null) { #err("User not found") };
      case (?user) { #ok(user) };
    };
  };

  func maskPassword(user : User) : PublicUser {
    let { id; username; role; createdAt } = user;
    { id; username; role; createdAt };
  };

  func isOwner(user : User) : Bool {
    switch (user.role) {
      case (#Owner) { true };
      case (_) { false };
    };
  };

  func isCoOwnerOrAbove(user : User) : Bool {
    switch (user.role) {
      case (#Owner) { true };
      case (#CoOwner) { true };
      case (_) { false };
    };
  };

  // Authentication
  // Login is accessible to anyone (no authorization check needed)
  // This is the entry point for authentication
  public shared ({ caller }) func login(username : Text, password : Text) : async Result<PublicUser, Text> {
    let passwordHash = password;
    let usersMap = users.toVarArray();
    for (i in Nat.range(0, usersMap.size())) {
      switch (usersMap[i]) {
        case ((principal, user)) {
          if (user.username == username and user.passwordHash == passwordHash) {
            return #ok(maskPassword(user));
          };
        };
      };
    };
    #err("Invalid username or password");
  };

  // Logout is accessible to anyone (no authorization check needed)
  public shared ({ caller }) func logout() : async Result<(), Text> {
    #ok(());
  };

  public query ({ caller }) func getCurrentUser() : async Result<PublicUser, Text> {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      return #err("Unauthorized: Authentication required");
    };
    switch (getUserByCaller(caller)) {
      case (#ok(user)) { #ok(maskPassword(user)) };
      case (#err(e)) { #err(e) };
    };
  };

  public shared ({ caller }) func changePassword(oldPassword : Text, newPassword : Text) : async Result<(), Text> {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can change password");
    };

    let oldPasswordHash = oldPassword;

    switch (getUserByCaller(caller)) {
      case (#ok(user)) {
        if (user.passwordHash != oldPasswordHash) {
          #err("Incorrect old password");
        } else {
          let updatedUser = {
            id = user.id;
            username = user.username;
            passwordHash = newPassword;
            role = user.role;
            createdAt = user.createdAt;
          };
          users.add(caller, updatedUser);
          #ok(());
        };
      };
      case (#err(e)) { #err(e) };
    };
  };

  // User Management (Owner-only)
  public shared ({ caller }) func createStaffAccount(userPrincipal : Principal, username : Text, passwordHash : Text, role : Role) : async Result<UserId, Text> {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can create staff accounts");
    };

    switch (getUserByCaller(caller)) {
      case (#ok(user)) {
        if (not isOwner(user)) { 
          Runtime.trap("Unauthorized: Only Owner can create staff accounts");
        };

        let existingUsers = users.toVarArray();
        for (i in Nat.range(0, existingUsers.size())) {
          switch (existingUsers[i]) {
            case ((_, existingUser)) {
              if (existingUser.username == username) {
                return #err("Username taken: ".concat(username));
              };
            };
          };
        };

        let newUserId = generateSeededId(user.id, username.concat(passwordHash));
        let newUser : User = {
          id = newUserId;
          username;
          passwordHash;
          role;
          createdAt = Time.now();
        };

        users.add(userPrincipal, newUser);

        // Assign appropriate AccessControl role
        let acRole = switch (role) {
          case (#Owner) { #admin };
          case (#CoOwner) { #user };
          case (#StaffBuilder) { #user };
        };
        AccessControl.assignRole(accessControlState, caller, userPrincipal, acRole);

        userCounter += 1;
        #ok(newUserId);
      };
      case (#err(e)) { #err(e) };
    };
  };

  public shared ({ caller }) func removeStaffAccount(userPrincipal : Principal) : async Result<(), Text> {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can remove staff accounts");
    };

    switch (getUserByCaller(caller)) {
      case (#ok(user)) {
        if (not isOwner(user)) { 
          Runtime.trap("Unauthorized: Only Owner can remove staff accounts");
        };

        if (users.containsKey(userPrincipal)) {
          users.remove(userPrincipal);
          userProfiles.remove(userPrincipal);
          #ok(());
        } else {
          #err("User not found");
        };
      };
      case (#err(e)) { #err(e) };
    };
  };

  public shared ({ caller }) func promoteUser(userPrincipal : Principal, newRole : Role) : async Result<(), Text> {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can promote users");
    };

    switch (getUserByCaller(caller)) {
      case (#ok(user)) {
        if (not isOwner(user)) { 
          Runtime.trap("Unauthorized: Only Owner can promote users");
        };

        switch (users.get(userPrincipal)) {
          case (null) { #err("User not found") };
          case (?targetUser) {
            let updatedUser = {
              id = targetUser.id;
              username = targetUser.username;
              passwordHash = targetUser.passwordHash;
              role = newRole;
              createdAt = targetUser.createdAt;
            };
            users.add(userPrincipal, updatedUser);

            // Update AccessControl role
            let acRole = switch (newRole) {
              case (#Owner) { #admin };
              case (#CoOwner) { #user };
              case (#StaffBuilder) { #user };
            };
            AccessControl.assignRole(accessControlState, caller, userPrincipal, acRole);

            #ok(());
          };
        };
      };
      case (#err(e)) { #err(e) };
    };
  };

  public query ({ caller }) func getAllUsers() : async Result<[PublicUser], Text> {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can view all users");
    };

    #ok(users.values().toArray().map(func(u) { maskPassword(u) }));
  };

  // Punishment Logs
  public shared ({ caller }) func submitPunishmentLog(ign : Text, rnd : Text, offenseNumber : Nat, proof : Text) : async Result<Nat, Text> {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated staff can submit punishment logs");
    };

    switch (getUserByCaller(caller)) {
      case (#ok(user)) {
        let newLogId = generateSeededId(user.id, ign.concat(rnd));
        let newLog : PunishmentLog = {
          id = newLogId;
          ign;
          rnd;
          offenseNumber;
          proof;
          submittedBy = user.username;
          timestamp = Time.now();
        };

        punishmentLogs.add(newLogId, newLog);
        punishmentLogCounter += 1;

        // Trigger Discord webhook
        if (webhookConfig.punishmentWebhookUrl.size() > 0) {
          ignore sendDiscordPunishmentWebhook(newLogId);
        };

        #ok(newLogId);
      };
      case (#err(e)) { #err(e) };
    };
  };

  public shared query ({ caller }) func dummyTransform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  func sendDiscordPunishmentWebhook(punishmentLogId : Nat) : async () {
    let punishmentLog = switch (punishmentLogs.get(punishmentLogId)) {
      case (null) { Runtime.trap("Punishment log not found") };
      case (?log) { log };
    };

    let payload = "{ \"content\": \"New Punishment Log submitted\", \"embeds\": [{ \"title\": \"Punishment Log\", \"fields\": [ { \"name\": \"IGN\", \"value\": \"".concat(punishmentLog.ign).concat("\" }, { \"name\": \"Reason and Date\", \"value\": \"").concat(punishmentLog.rnd).concat("\" }, { \"name\": \"Offense Number\", \"value\": \"").concat(punishmentLog.offenseNumber.toText()).concat("\" }, { \"name\": \"Proof\", \"value\": \"").concat(punishmentLog.proof).concat("\" }, { \"name\": \"Submitted By\", \"value\": \"").concat(punishmentLog.submittedBy).concat("\" }, { \"name\": \"Timestamp\", \"value\": \"").concat(punishmentLog.timestamp.toText()).concat("\" } ] }] }");

    ignore (await OutCall.httpPostRequest(
      webhookConfig.punishmentWebhookUrl,
      [{ name = "Content-Type"; value = "application/json" }],
      payload,
      dummyTransform,
    ));
  };

  public query ({ caller }) func getAllPunishmentLogs() : async Result<[PunishmentLog], Text> {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated staff can view punishment logs");
    };

    let logsArray = punishmentLogs.values().toArray();
    #ok(logsArray.sort(PunishmentLog.compareByTimestamp));
  };

  public query ({ caller }) func getPunishmentLogCount() : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated staff can view punishment log count");
    };
    punishmentLogCounter;
  };

  // LOA Requests
  public shared ({ caller }) func submitLOARequest(ign : Text, discordUsername : Text, leaveDate : Text, returnDate : Text) : async Result<Nat, Text> {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated staff can submit LOA requests");
    };

    switch (getUserByCaller(caller)) {
      case (#ok(user)) {
        let newLoaId = generateSeededId(user.id, ign.concat(discordUsername));
        let newLoaRequest : LOARequest = {
          id = newLoaId;
          ign;
          discordUsername;
          leaveDate;
          returnDate;
          submittedBy = user.username;
          timestamp = Time.now();
          active = true;
        };

        loaRequests.add(newLoaId, newLoaRequest);
        loaRequestCounter += 1;

        // Trigger Discord webhook
        if (webhookConfig.loaWebhookUrl.size() > 0) {
          ignore sendDiscordLOAWebhook(newLoaId);
        };

        #ok(newLoaId);
      };
      case (#err(e)) { #err(e) };
    };
  };

  func sendDiscordLOAWebhook(loaRequestId : Nat) : async () {
    let loaRequest = switch (loaRequests.get(loaRequestId)) {
      case (null) { Runtime.trap("LOA request not found") };
      case (?request) { request };
    };

    let payload = "{ \"content\": \"New LOA Request submitted\", \"embeds\": [{ \"title\": \"LOA Request\", \"fields\": [ { \"name\": \"IGN\", \"value\": \"".concat(loaRequest.ign).concat("\" }, { \"name\": \"Discord Username\", \"value\": \"").concat(loaRequest.discordUsername).concat("\" }, { \"name\": \"Leave Date\", \"value\": \"").concat(loaRequest.leaveDate).concat("\" }, { \"name\": \"Return Date\", \"value\": \"").concat(loaRequest.returnDate).concat("\" }, { \"name\": \"Submitted By\", \"value\": \"").concat(loaRequest.submittedBy).concat("\" }, { \"name\": \"Timestamp\", \"value\": \"").concat(loaRequest.timestamp.toText()).concat("\" } ] }] }");

    ignore (await OutCall.httpPostRequest(
      webhookConfig.loaWebhookUrl,
      [{ name = "Content-Type"; value = "application/json" }],
      payload,
      dummyTransform,
    ));
  };

  public query ({ caller }) func getAllLOARequests() : async Result<[LOARequest], Text> {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated staff can view LOA requests");
    };

    let requestsArray = loaRequests.values().toArray();
    #ok(requestsArray.sort(LOARequest.compareByTimestamp));
  };

  public query ({ caller }) func getActiveLOACount() : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated staff can view active LOA count");
    };
    loaRequests.values().toArray().filter(func(loa : LOARequest) : Bool { loa.active }).size();
  };

  public shared ({ caller }) func deactivateLOA(loaId : Nat) : async Result<(), Text> {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated staff can deactivate LOA requests");
    };

    switch (getUserByCaller(caller)) {
      case (#ok(user)) {
        if (not isCoOwnerOrAbove(user)) { 
          Runtime.trap("Unauthorized: Only CoOwner and above can deactivate LOA requests");
        };

        switch (loaRequests.get(loaId)) {
          case (null) { #err("LOA request not found") };
          case (?existingLoa) {
            let updatedLoa = {
              id = existingLoa.id;
              ign = existingLoa.ign;
              discordUsername = existingLoa.discordUsername;
              leaveDate = existingLoa.leaveDate;
              returnDate = existingLoa.returnDate;
              submittedBy = existingLoa.submittedBy;
              timestamp = existingLoa.timestamp;
              active = false;
            };
            loaRequests.add(loaId, updatedLoa);
            #ok(());
          };
        };
      };
      case (#err(e)) { #err(e) };
    };
  };

  // Webhook Config (Owner-only)
  public query ({ caller }) func getWebhookConfig() : async Result<WebhookConfig, Text> {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can view webhook config");
    };

    switch (getUserByCaller(caller)) {
      case (#ok(user)) {
        if (not isOwner(user)) { 
          Runtime.trap("Unauthorized: Only Owner can view webhook config");
        };
        #ok(webhookConfig);
      };
      case (#err(e)) { #err(e) };
    };
  };

  public shared ({ caller }) func setWebhookConfig(punishmentUrl : Text, loaUrl : Text) : async Result<(), Text> {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can update webhook config");
    };

    switch (getUserByCaller(caller)) {
      case (#ok(user)) {
        if (not isOwner(user)) { 
          Runtime.trap("Unauthorized: Only Owner can update webhook config");
        };

        webhookConfig := {
          punishmentWebhookUrl = punishmentUrl;
          loaWebhookUrl = loaUrl;
        };
        #ok(());
      };
      case (#err(e)) { #err(e) };
    };
  };
};

