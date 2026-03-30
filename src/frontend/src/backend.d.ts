/**
 * backend.d.ts — Manual type declarations for the LBS4 Motoko backend.
 *
 * This file documents the ACTUAL current API exposed by main.mo.
 * It is NOT auto-generated. Keep it in sync with the Motoko canister.
 *
 * NOTE: The auto-generated backend.ts uses @ts-nocheck and may lag behind
 * this file during development. AuthContext and other callers use
 * `createActorWithConfig() as any` to bypass the stale generated types.
 *
 * Pages and lib files MUST import Role, PublicUser, UserStatus from
 * '../types' (not from this file) to avoid duplicate enum conflicts.
 */

import type { Principal } from "@icp-sdk/core/principal";

// ============================================================
// Enums
// ============================================================

/**
 * Staff role hierarchy: Owner > CoOwner > Staff > Builder
 * Canonical source of truth is ../types.ts — import from there in pages.
 */
export enum Role {
  Owner = "Owner",
  CoOwner = "CoOwner",
  Staff = "Staff",
  Builder = "Builder",
}

/** User account status. Canonical source of truth is ../types.ts. */
export enum UserStatus {
  Active = "Active",
  Suspended = "Suspended",
}

/** Internal Caffeine framework role (separate from staff Role above). */
export enum UserRole {
  admin = "admin",
  user = "user",
  guest = "guest",
}

// ============================================================
// Result type (as returned by the Backend wrapper in backend.ts)
// ============================================================

/** Successful result variant. */
export interface ResultOk<T> {
  __kind__: "ok";
  ok: T;
}

/** Error result variant. */
export interface ResultErr {
  __kind__: "err";
  err: string;
}

export type Result<T> = ResultOk<T> | ResultErr;

// ============================================================
// Domain types
// ============================================================

/** Public-facing user record (no password hash). */
export interface PublicUser {
  id: bigint;
  username: string;
  role: Role;
  status: UserStatus;
  createdAt: bigint;
}

/** Session data returned on successful login. */
export interface SessionData {
  token: string;
  userId: bigint;
  username: string;
  role: Role;
  createdAt: bigint;
  expiresAt: bigint;
}

/** Immutable audit log entry. */
export interface AuditLogEntry {
  id: bigint;
  actorId: bigint;
  action: string;
  performedBy: string;
  targetUser: string | null;
  details: string;
  timestamp: bigint;
}

/** A failed login attempt record. */
export interface FailedLoginAttempt {
  username: string;
  timestamp: bigint;
}

/** Webhook configuration (single punishment webhook URL). */
export interface WebhookSettings {
  punishmentWebhookUrl: string;
}

/** Leave-of-absence request. */
export interface LOARequest {
  id: bigint;
  ign: string;
  discordUsername: string;
  leaveDate: string;
  returnDate: string;
  submittedBy: string;
  timestamp: bigint;
  active: boolean;
}

/** Full punishment record (replaces legacy PunishmentLog). */
export interface PunishmentRecord {
  id: bigint;
  playerIGN: string;
  altAccounts: string[];
  category: string;
  offenseNumber: bigint;
  duration: string;
  reason: string;
  proofUrl: string;
  issuedBy: string;
  timestamp: bigint;
  appealed: boolean;
  appealId: bigint | null;
}

// ============================================================
// Backend interface — all methods on the Motoko canister
// ============================================================

export interface backendInterface {
  // ── Authentication (no session token required) ─────────────────────────

  /** Hash the password with SHA-256 before calling. Returns a session token. */
  loginWithCredentials(
    username: string,
    passwordHash: string
  ): Promise<Result<SessionData>>;

  /** Validate a stored session token and return the associated user. */
  validateSession(token: string): Promise<Result<PublicUser>>;

  /** Invalidate a session token server-side. */
  logoutSession(token: string): Promise<void>;

  // ── User management (session token required as first arg) ──────────────

  /** Owner/CoOwner only: create a new staff account. Returns the new user ID. */
  createUser(
    token: string,
    username: string,
    passwordHash: string,
    role: Role
  ): Promise<Result<bigint>>;

  /** Owner only: permanently remove a staff account. */
  removeUser(token: string, targetUsername: string): Promise<Result<null>>;

  /** Owner only: suspend a staff account. Suspended users cannot log in. */
  suspendUser(token: string, targetUsername: string): Promise<Result<null>>;

  /** Owner only: reactivate a suspended staff account. */
  activateUser(token: string, targetUsername: string): Promise<Result<null>>;

  /** Owner only: change the role of a staff member. */
  updateUserRole(
    token: string,
    targetUsername: string,
    newRole: Role
  ): Promise<Result<null>>;

  /** Any authenticated user: change own password. */
  changePassword(
    token: string,
    oldPasswordHash: string,
    newPasswordHash: string
  ): Promise<Result<null>>;

  /** Owner/CoOwner: list all staff accounts. */
  getAllUsers(token: string): Promise<Result<PublicUser[]>>;

  // ── Audit log ──────────────────────────────────────────────────────────

  /** Owner only: retrieve the full audit log. */
  getAuditLog(token: string): Promise<Result<AuditLogEntry[]>>;

  /** Owner only: retrieve all failed login attempts. */
  getFailedLoginAttempts(token: string): Promise<Result<FailedLoginAttempt[]>>;

  // ── Webhook configuration ──────────────────────────────────────────────

  /** Owner only: read current webhook settings. */
  getWebhookConfig(token: string): Promise<Result<WebhookSettings>>;

  /** Owner only: set the punishment webhook URL. */
  setWebhookConfig(
    token: string,
    punishmentUrl: string
  ): Promise<Result<null>>;

  // ── Leave-of-absence ───────────────────────────────────────────────────

  /** Any authenticated user: submit an LOA request. Returns the new LOA ID. */
  submitLOARequest(
    token: string,
    ign: string,
    discordUsername: string,
    leaveDate: string,
    returnDate: string
  ): Promise<Result<bigint>>;

  /** Owner/CoOwner: retrieve all LOA requests. */
  getAllLOARequests(token: string): Promise<Result<LOARequest[]>>;

  /** Owner/CoOwner: mark an LOA as deactivated (staff returned). */
  deactivateLOA(token: string, loaId: bigint): Promise<Result<null>>;

  // ── Punishments ────────────────────────────────────────────────────────

  /** Any authenticated user: submit a punishment log. Returns the new record ID. */
  submitPunishmentLog(
    token: string,
    playerIGN: string,
    category: string,
    offenseNumber: bigint,
    duration: string,
    reason: string,
    proofUrl: string,
    altAccounts: string[]
  ): Promise<Result<bigint>>;

  /** Any authenticated user: retrieve all punishment records. */
  getAllPunishmentLogs(token: string): Promise<Result<PunishmentRecord[]>>;

  /** Public: total count of punishment records (no auth required). */
  getPunishmentLogCount(): Promise<bigint>;

  // ── Caffeine MixinAuthorization framework ──────────────────────────────

  /** Called once during canister initialization with the admin secret. */
  _initializeAccessControlWithSecret(secret: string): Promise<void>;

  /** Return the Caffeine UserRole of the current Internet Identity caller. */
  getCallerUserRole(): Promise<UserRole>;

  /** Assign a Caffeine UserRole to a principal (admin only). */
  assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;

  /** Return true if the current Internet Identity caller has admin access. */
  isCallerAdmin(): Promise<boolean>;
}
