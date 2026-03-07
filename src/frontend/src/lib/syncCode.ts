/**
 * syncCode.ts
 *
 * Export/import all portal data (accounts, logs, LOAs) as a single base64
 * encoded JSON string. Allows the Owner to share data with staff on other devices.
 */

import {
  type LocalLOARequest,
  type LocalPunishmentLog,
  getAllLOARequestsRaw,
  getAllPunishmentLogs,
} from "./portalData";
import { type StaffAccount, getAllAccounts } from "./staffAccounts";

const ACCOUNTS_KEY = "staff_accounts_v1";
const PUNISHMENT_LOGS_KEY = "portal_punishment_logs_v1";
const LOA_REQUESTS_KEY = "portal_loa_requests_v1";

interface SyncData {
  version: 1;
  accounts: StaffAccount[];
  punishmentLogs: LocalPunishmentLog[];
  loaRequests: LocalLOARequest[];
  exportedAt: number;
}

/**
 * Exports all localStorage data as a base64 JSON string.
 */
export function generateSyncCode(): string {
  const data: SyncData = {
    version: 1,
    accounts: getAllAccounts(),
    punishmentLogs: getAllPunishmentLogs(),
    loaRequests: getAllLOARequestsRaw(),
    exportedAt: Date.now(),
  };
  const json = JSON.stringify(data);
  return btoa(unescape(encodeURIComponent(json)));
}

/**
 * Imports data from a sync code.
 * Merges — does NOT overwrite existing items with the same id.
 * Returns counts of newly added items.
 */
export function importSyncCode(code: string): {
  success: boolean;
  error?: string;
  accountsAdded: number;
  logsAdded: number;
  loasAdded: number;
} {
  let data: SyncData;
  try {
    const json = decodeURIComponent(escape(atob(code.trim())));
    data = JSON.parse(json) as SyncData;
  } catch {
    return {
      success: false,
      error: "Invalid sync code. Make sure you pasted the full code.",
      accountsAdded: 0,
      logsAdded: 0,
      loasAdded: 0,
    };
  }

  if (!data || data.version !== 1) {
    return {
      success: false,
      error: "Unsupported sync code version.",
      accountsAdded: 0,
      logsAdded: 0,
      loasAdded: 0,
    };
  }

  // --- Merge accounts -------------------------------------------------------
  let accountsAdded = 0;
  try {
    const existingRaw = localStorage.getItem(ACCOUNTS_KEY);
    const existing: StaffAccount[] = existingRaw
      ? (JSON.parse(existingRaw) as StaffAccount[])
      : [];
    const existingIds = new Set(existing.map((a) => a.id));
    const toAdd = (data.accounts ?? []).filter((a) => !existingIds.has(a.id));
    const merged = [...existing, ...toAdd];
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(merged));
    accountsAdded = toAdd.length;
  } catch {
    // ignore merge errors
  }

  // --- Merge punishment logs ------------------------------------------------
  let logsAdded = 0;
  try {
    const existingRaw = localStorage.getItem(PUNISHMENT_LOGS_KEY);
    const existing: LocalPunishmentLog[] = existingRaw
      ? (JSON.parse(existingRaw) as LocalPunishmentLog[])
      : [];
    const existingIds = new Set(existing.map((l) => l.id));
    const toAdd = (data.punishmentLogs ?? []).filter(
      (l) => !existingIds.has(l.id),
    );
    const merged = [...existing, ...toAdd];
    localStorage.setItem(PUNISHMENT_LOGS_KEY, JSON.stringify(merged));
    logsAdded = toAdd.length;
  } catch {
    // ignore merge errors
  }

  // --- Merge LOA requests ---------------------------------------------------
  let loasAdded = 0;
  try {
    const existingRaw = localStorage.getItem(LOA_REQUESTS_KEY);
    const existing: LocalLOARequest[] = existingRaw
      ? (JSON.parse(existingRaw) as LocalLOARequest[])
      : [];
    const existingIds = new Set(existing.map((r) => r.id));
    const toAdd = (data.loaRequests ?? []).filter(
      (r) => !existingIds.has(r.id),
    );
    const merged = [...existing, ...toAdd];
    localStorage.setItem(LOA_REQUESTS_KEY, JSON.stringify(merged));
    loasAdded = toAdd.length;
  } catch {
    // ignore merge errors
  }

  return { success: true, accountsAdded, logsAdded, loasAdded };
}
