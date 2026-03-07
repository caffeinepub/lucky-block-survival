export interface AuditEntry {
  id: string;
  action: "edit" | "delete";
  ruleId: string;
  ruleName: string;
  performedBy: string;
  details: string;
  timestamp: number; // ms
}

const AUDIT_KEY = "lbs_punishment_audit";

export function getAuditEntries(): AuditEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    if (raw) return JSON.parse(raw) as AuditEntry[];
  } catch {
    // ignore
  }
  return [];
}

export function addAuditEntry(
  entry: Omit<AuditEntry, "id" | "timestamp">,
): void {
  const entries = getAuditEntries();
  const newEntry: AuditEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
  };
  entries.unshift(newEntry);
  // Cap at 500 entries
  const trimmed = entries.slice(0, 500);
  localStorage.setItem(AUDIT_KEY, JSON.stringify(trimmed));
}

export function clearAuditEntries(): void {
  localStorage.removeItem(AUDIT_KEY);
}
