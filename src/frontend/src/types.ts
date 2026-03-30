/**
 * types.ts — Canonical app-level types.
 * These match the new backend API (post Motoko rebuild).
 * All pages should import Role, PublicUser, UserStatus from here
 * instead of from backend.d.
 */

export enum Role {
  Owner = "Owner",
  CoOwner = "CoOwner",
  Staff = "Staff",
  Builder = "Builder",
}

export enum UserStatus {
  Active = "Active",
  Suspended = "Suspended",
}

export interface PublicUser {
  id: bigint;
  username: string;
  role: Role;
  status: UserStatus;
  createdAt: bigint;
}

export interface SessionData {
  token: string;
  userId: bigint;
  username: string;
  role: Role;
  createdAt: bigint;
  expiresAt: bigint;
}
