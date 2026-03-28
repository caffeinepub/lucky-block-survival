/**
 * portalData.ts
 *
 * localStorage-based store for punishment logs, LOA requests, and appeals.
 * All data persists locally and survives backend redeployments.
 */

import { sendPunishmentWebhook } from "./discordWebhook";

const PUNISHMENT_LOGS_KEY_V1 = "portal_punishment_logs_v1";
const PUNISHMENT_LOGS_KEY = "portal_punishment_logs_v2";
const LOA_REQUESTS_KEY = "portal_loa_requests_v1";
const APPEALS_KEY = "portal_appeals_v1";

// ---- Types ------------------------------------------------------------------

export interface LocalPunishmentLog {
  id: number;
  ign: string;
  rnd: string;
  offenseNumber: number;
  proof: string;
  submittedBy: string;
  timestamp: number; // ms
  // v2 enhanced fields
  category?: string;
  offenseLevel?: number;
  duration?: string;
  alts?: string[];
  proofBase64?: string;
  proofFileName?: string;
  proofMimeType?: string;
}

export interface LocalLOARequest {
  id: number;
  ign: string;
  discordUsername: string;
  leaveDate: string;
  returnDate: string;
  submittedBy: string;
  timestamp: number; // ms
  active: boolean;
  returnedAt?: number; // ms, set when staff marks returned
}

export type AppealStatus = "Pending" | "Accepted" | "Denied";

export interface LocalAppeal {
  id: number;
  punishmentId: number; // references LocalPunishmentLog.id
  playerIgn: string;
  discordUsername: string;
  reason: string;
  status: AppealStatus;
  submittedBy: string; // staff who logged the appeal
  reviewedBy?: string; // staff who accepted/denied
  reviewNote?: string;
  timestamp: number; // ms
  reviewedAt?: number; // ms
  // snapshot of punishment for display
  category?: string;
  duration?: string;
  offenseNumber?: number;
}

// ---- Persistence helpers ----------------------------------------------------

function migrateFromV1(): LocalPunishmentLog[] {
  try {
    const raw = localStorage.getItem(PUNISHMENT_LOGS_KEY_V1);
    if (!raw) return [];
    const v1Logs = JSON.parse(raw) as LocalPunishmentLog[];
    return v1Logs.map((log) => ({
      ...log,
      category: "Unknown",
      alts: [],
      offenseLevel: log.offenseNumber,
      duration: "",
    }));
  } catch {
    return [];
  }
}

function loadPunishmentLogs(): LocalPunishmentLog[] {
  try {
    const raw = localStorage.getItem(PUNISHMENT_LOGS_KEY);
    if (raw) return JSON.parse(raw) as LocalPunishmentLog[];
    const migrated = migrateFromV1();
    if (migrated.length > 0) {
      localStorage.setItem(PUNISHMENT_LOGS_KEY, JSON.stringify(migrated));
    }
    return migrated;
  } catch {
    return [];
  }
}

function savePunishmentLogs(logs: LocalPunishmentLog[]): void {
  localStorage.setItem(PUNISHMENT_LOGS_KEY, JSON.stringify(logs));
}

function loadLOARequests(): LocalLOARequest[] {
  try {
    const raw = localStorage.getItem(LOA_REQUESTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LocalLOARequest[];
  } catch {
    return [];
  }
}

function saveLOARequests(requests: LocalLOARequest[]): void {
  localStorage.setItem(LOA_REQUESTS_KEY, JSON.stringify(requests));
}

function loadAppeals(): LocalAppeal[] {
  try {
    const raw = localStorage.getItem(APPEALS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LocalAppeal[];
  } catch {
    return [];
  }
}

function saveAppeals(appeals: LocalAppeal[]): void {
  localStorage.setItem(APPEALS_KEY, JSON.stringify(appeals));
}

// ---- Appeals API ------------------------------------------------------------

/** Returns all appeals sorted by timestamp descending */
export function getAllAppeals(): LocalAppeal[] {
  return loadAppeals().sort((a, b) => b.timestamp - a.timestamp);
}

/** Returns appeals filtered by status */
export function getAppealsByStatus(status: AppealStatus): LocalAppeal[] {
  return loadAppeals()
    .filter((a) => a.status === status)
    .sort((a, b) => b.timestamp - a.timestamp);
}

/** Returns a set of punishment IDs whose appeals have been Accepted */
export function getAcceptedAppealPunishmentIds(): Set<number> {
  const appeals = loadAppeals().filter((a) => a.status === "Accepted");
  return new Set(appeals.map((a) => a.punishmentId));
}

/** Adds a new appeal */
export function addAppeal(
  appeal: Omit<LocalAppeal, "id" | "timestamp" | "status">,
): LocalAppeal {
  const appeals = loadAppeals();
  const newAppeal: LocalAppeal = {
    ...appeal,
    id: Date.now(),
    timestamp: Date.now(),
    status: "Pending",
  };
  appeals.push(newAppeal);
  saveAppeals(appeals);
  return newAppeal;
}

/** Update an appeal's status (Accept or Deny) */
export function reviewAppeal(
  id: number,
  status: "Accepted" | "Denied",
  reviewedBy: string,
  reviewNote?: string,
): boolean {
  const appeals = loadAppeals();
  const idx = appeals.findIndex((a) => a.id === id);
  if (idx === -1) return false;
  appeals[idx].status = status;
  appeals[idx].reviewedBy = reviewedBy;
  appeals[idx].reviewNote = reviewNote;
  appeals[idx].reviewedAt = Date.now();
  saveAppeals(appeals);
  return true;
}

/** Count pending appeals */
export function getPendingAppealsCount(): number {
  return loadAppeals().filter((a) => a.status === "Pending").length;
}

// ---- Punishment Logs API ----------------------------------------------------

/** Returns all punishment logs sorted by timestamp descending */
export function getAllPunishmentLogs(): LocalPunishmentLog[] {
  return loadPunishmentLogs().sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Returns all logs where ign OR any of the alts match log.ign or any of log.alts.
 * Case-insensitive.
 */
export function getPlayerHistory(
  ign: string,
  alts?: string[],
): LocalPunishmentLog[] {
  if (!ign.trim()) return [];
  const allAlts = [
    ign.toLowerCase(),
    ...(alts ?? []).map((a) => a.toLowerCase()),
  ];
  return loadPunishmentLogs()
    .filter((log) => {
      const logIgn = log.ign.toLowerCase();
      const logAlts = (log.alts ?? []).map((a) => a.toLowerCase());
      return (
        allAlts.includes(logIgn) ||
        logAlts.some((a) => allAlts.includes(a)) ||
        allAlts.some((a) => logAlts.includes(a))
      );
    })
    .sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Returns count of prior logs matching player+alts for a specific category.
 * Excludes punishments whose appeals have been Accepted.
 */
export function getOffenseCount(
  ign: string,
  category: string,
  alts?: string[],
): number {
  if (!ign.trim() || !category) return 0;
  const acceptedIds = getAcceptedAppealPunishmentIds();
  return getPlayerHistory(ign, alts).filter(
    (log) => (log.category ?? "") === category && !acceptedIds.has(log.id),
  ).length;
}

/** Adds a new enhanced punishment log and returns the created entry */
export function addEnhancedPunishmentLog(
  log: Omit<LocalPunishmentLog, "id" | "timestamp">,
): LocalPunishmentLog {
  const logs = loadPunishmentLogs();
  const newLog: LocalPunishmentLog = {
    ...log,
    id: Date.now(),
    timestamp: Date.now(),
  };
  logs.push(newLog);
  savePunishmentLogs(logs);
  sendPunishmentWebhook(newLog).catch(() => {});
  return newLog;
}

/** Adds a new punishment log and returns the created entry (backwards compat) */
export function addPunishmentLog(
  log: Omit<LocalPunishmentLog, "id" | "timestamp">,
): LocalPunishmentLog {
  return addEnhancedPunishmentLog({
    ...log,
    category: log.category ?? "Unknown",
    alts: log.alts ?? [],
    offenseLevel: log.offenseLevel ?? log.offenseNumber,
    duration: log.duration ?? "",
  });
}

/** Returns count of all punishment logs */
export function getPunishmentLogCount(): number {
  return loadPunishmentLogs().length;
}

// ---- LOA Requests API -------------------------------------------------------

/** Returns active LOA requests sorted by timestamp descending */
export function getAllLOARequests(): LocalLOARequest[] {
  return loadLOARequests()
    .filter((r) => r.active)
    .sort((a, b) => b.timestamp - a.timestamp);
}

/** Returns all LOA requests (including inactive), sorted by timestamp descending */
export function getAllLOARequestsRaw(): LocalLOARequest[] {
  return loadLOARequests().sort((a, b) => b.timestamp - a.timestamp);
}

/** Adds a new LOA request and returns the created entry */
export function addLOARequest(
  req: Omit<LocalLOARequest, "id" | "timestamp" | "active">,
): LocalLOARequest {
  const requests = loadLOARequests();
  const newReq: LocalLOARequest = {
    ...req,
    id: Date.now(),
    timestamp: Date.now(),
    active: true,
  };
  requests.push(newReq);
  saveLOARequests(requests);
  return newReq;
}

/** Marks a LOA as returned (deactivates it). Returns true if found and updated. */
export function deactivateLOA(id: number): boolean {
  const requests = loadLOARequests();
  const idx = requests.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  requests[idx].active = false;
  requests[idx].returnedAt = Date.now();
  saveLOARequests(requests);
  return true;
}

/** Returns count of active LOA requests */
export function getActiveLOACount(): number {
  return loadLOARequests().filter((r) => r.active).length;
}
