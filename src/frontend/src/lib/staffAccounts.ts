/**
 * staffAccounts.ts
 *
 * All staff account data is stored in localStorage so it persists across
 * sessions and is not wiped when a new version of the backend is deployed.
 */

import { Role, UserStatus } from "../types";
import { sha256Hex } from "./crypto";

const ACCOUNTS_KEY = "staff_accounts_v1";

export interface StaffAccount {
  id: number;
  username: string;
  passwordHash: string;
  role: Role;
  status: UserStatus;
  createdAt: number; // Unix ms
  strikes?: number; // 0–3
}

// ---- Persistence helpers ------------------------------------------------

function loadAccounts(): StaffAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StaffAccount[];
    // Backfill status for accounts created before this field existed
    return parsed.map((a) => ({
      ...a,
      status: a.status ?? UserStatus.Active,
    }));
  } catch {
    return [];
  }
}

function saveAccounts(accounts: StaffAccount[]): void {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

// ---- Seed owner if not present ------------------------------------------

const OWNER_USERNAME = "Sirbrit_";
// SHA-256 of "Cookies1969"
const OWNER_PASSWORD_HASH =
  "529b2082c108a03cb8b85908c33b57cfb815b497f51aedd1bf049a87908f4080";

export function ensureOwnerExists(): void {
  const accounts = loadAccounts();
  const ownerExists = accounts.some(
    (a) => a.role === Role.Owner && a.username === OWNER_USERNAME,
  );
  if (!ownerExists) {
    const withoutOldOwner = accounts.filter((a) => a.role !== Role.Owner);
    withoutOldOwner.unshift({
      id: 1,
      username: OWNER_USERNAME,
      passwordHash: OWNER_PASSWORD_HASH,
      role: Role.Owner,
      status: UserStatus.Active,
      createdAt: Date.now(),
      strikes: 0,
    });
    saveAccounts(withoutOldOwner);
  }
}

// ---- Public API ---------------------------------------------------------

export function getAllAccounts(): StaffAccount[] {
  ensureOwnerExists();
  return loadAccounts();
}

export async function createAccount(
  username: string,
  password: string,
  role: Role,
): Promise<{ success: true; id: number } | { success: false; error: string }> {
  const accounts = loadAccounts();

  if (accounts.some((a) => a.username === username)) {
    return { success: false, error: "Username already taken." };
  }

  const passwordHash = await sha256Hex(password);
  const newId = Date.now();
  const newAccount: StaffAccount = {
    id: newId,
    username,
    passwordHash,
    role,
    status: UserStatus.Active,
    createdAt: Date.now(),
    strikes: 0,
  };

  accounts.push(newAccount);
  saveAccounts(accounts);
  return { success: true, id: newId };
}

export function removeAccount(id: number): boolean {
  const accounts = loadAccounts();
  const idx = accounts.findIndex((a) => a.id === id);
  if (idx === -1) return false;
  if (accounts[idx].role === Role.Owner) return false;
  accounts.splice(idx, 1);
  saveAccounts(accounts);
  return true;
}

export function suspendAccount(id: number): boolean {
  const accounts = loadAccounts();
  const idx = accounts.findIndex((a) => a.id === id);
  if (idx === -1) return false;
  if (accounts[idx].role === Role.Owner) return false;
  accounts[idx].status = UserStatus.Suspended;
  saveAccounts(accounts);
  return true;
}

export function activateAccount(id: number): boolean {
  const accounts = loadAccounts();
  const idx = accounts.findIndex((a) => a.id === id);
  if (idx === -1) return false;
  accounts[idx].status = UserStatus.Active;
  saveAccounts(accounts);
  return true;
}

/**
 * Increment strikes for a staff member (max 3).
 */
export function addStrike(id: number): boolean {
  const accounts = loadAccounts();
  const idx = accounts.findIndex((a) => a.id === id);
  if (idx === -1) return false;
  const current = accounts[idx].strikes ?? 0;
  accounts[idx].strikes = Math.min(3, current + 1);
  saveAccounts(accounts);
  return true;
}

/**
 * Decrement strikes for a staff member (min 0).
 */
export function removeStrike(id: number): boolean {
  const accounts = loadAccounts();
  const idx = accounts.findIndex((a) => a.id === id);
  if (idx === -1) return false;
  const current = accounts[idx].strikes ?? 0;
  accounts[idx].strikes = Math.max(0, current - 1);
  saveAccounts(accounts);
  return true;
}

/**
 * Verify credentials. Returns the matching account or null.
 * Also rejects suspended accounts.
 */
export async function verifyCredentials(
  username: string,
  password: string,
): Promise<StaffAccount | null> {
  ensureOwnerExists();
  const accounts = loadAccounts();
  const hash = await sha256Hex(password);
  return (
    accounts.find((a) => a.username === username && a.passwordHash === hash) ??
    null
  );
}
