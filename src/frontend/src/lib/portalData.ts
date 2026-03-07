/**
 * portalData.ts
 *
 * localStorage-based store for punishment logs and LOA requests.
 * All data persists locally and survives backend redeployments.
 */

const PUNISHMENT_LOGS_KEY = "portal_punishment_logs_v1";
const LOA_REQUESTS_KEY = "portal_loa_requests_v1";

// ---- Types ------------------------------------------------------------------

export interface LocalPunishmentLog {
  id: number;
  ign: string;
  rnd: string;
  offenseNumber: number;
  proof: string;
  submittedBy: string;
  timestamp: number; // ms
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
}

// ---- Persistence helpers ----------------------------------------------------

function loadPunishmentLogs(): LocalPunishmentLog[] {
  try {
    const raw = localStorage.getItem(PUNISHMENT_LOGS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LocalPunishmentLog[];
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

// ---- Punishment Logs API ----------------------------------------------------

/** Returns all punishment logs sorted by timestamp descending */
export function getAllPunishmentLogs(): LocalPunishmentLog[] {
  return loadPunishmentLogs().sort((a, b) => b.timestamp - a.timestamp);
}

/** Adds a new punishment log and returns the created entry */
export function addPunishmentLog(
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
  return newLog;
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

/** Deactivates a LOA request by id. Returns true if found and updated. */
export function deactivateLOA(id: number): boolean {
  const requests = loadLOARequests();
  const idx = requests.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  requests[idx].active = false;
  saveLOARequests(requests);
  return true;
}

/** Returns count of active LOA requests */
export function getActiveLOACount(): number {
  return loadLOARequests().filter((r) => r.active).length;
}
