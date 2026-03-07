import {
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  Loader2,
  Pencil,
  ScrollText,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { PublicUser, PunishmentLog } from "../backend.d";
import { useActor } from "../hooks/useActor";
import { type AuditEntry, getAuditEntries } from "../lib/punishmentAudit";

function formatTimestamp(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  return new Date(ms).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAuditTimestamp(ms: number): string {
  return new Date(ms).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface StaffLogsPageProps {
  currentUser: PublicUser;
}

export function StaffLogsPage({
  currentUser: _currentUser,
}: StaffLogsPageProps) {
  const { actor } = useActor();
  const [activeTab, setActiveTab] = useState<"view" | "log" | "audit">("view");

  // View logs state
  const [logs, setLogs] = useState<PunishmentLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Audit log state
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);

  // Log form state
  const [ign, setIgn] = useState("");
  const [rnd, setRnd] = useState("");
  const [offenseNum, setOffenseNum] = useState("1");
  const [proof, setProof] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const fetchLogs = () => {
    if (!actor) {
      setLogsLoading(false);
      return;
    }
    setLogsLoading(true);
    actor
      .getAllPunishmentLogs()
      .then((result) => {
        if (result.__kind__ === "ok") {
          const sorted = [...result.ok].sort(
            (a, b) => Number(b.timestamp) - Number(a.timestamp),
          );
          setLogs(sorted);
        }
        // If err — show empty state (backend not initialized)
      })
      .catch(() => {
        // Silently ignore — backend not initialized; show empty state
      })
      .finally(() => setLogsLoading(false));
  };

  const fetchAudit = () => {
    setAuditEntries(getAuditEntries());
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: fetchLogs is defined inside component and depends on actor
  useEffect(() => {
    if (activeTab === "view") fetchLogs();
    if (activeTab === "audit") fetchAudit();
  }, [actor, activeTab]);

  const filteredLogs = logs.filter(
    (log) =>
      log.ign.toLowerCase().includes(search.toLowerCase()) ||
      log.rnd.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor) return;
    setSubmitLoading(true);
    setSubmitError("");
    setSubmitSuccess(false);
    try {
      const result = await actor.submitPunishmentLog(
        ign,
        rnd,
        BigInt(offenseNum),
        proof,
      );
      if (result.__kind__ === "ok") {
        setSubmitSuccess(true);
        setIgn("");
        setRnd("");
        setOffenseNum("1");
        setProof("");
        setTimeout(() => setSubmitSuccess(false), 5000);
      } else {
        setSubmitError(
          "Your session does not have permission. Please log out and back in.",
        );
      }
    } catch {
      setSubmitError(
        "Your session does not have permission. Please log out and back in.",
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  const TABS = [
    { id: "view" as const, label: "VIEW LOGS" },
    { id: "log" as const, label: "LOG PUNISHMENT" },
    { id: "audit" as const, label: "AUDIT LOG" },
  ];

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="flex items-center justify-center rounded-lg"
          style={{
            width: "40px",
            height: "40px",
            background: "rgba(124, 58, 237, 0.15)",
            border: "1px solid var(--border-glow)",
          }}
        >
          <ScrollText
            size={20}
            style={{ color: "var(--accent-purple-bright)" }}
          />
        </div>
        <div>
          <h1 className="page-header">STAFF LOGS</h1>
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              marginTop: "2px",
            }}
          >
            Punishment logging and record management
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-2 mb-6 p-1 rounded-lg"
        style={{
          background: "var(--bg-deep)",
          border: "1px solid var(--border-subtle)",
          display: "inline-flex",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            data-ocid={`staff_logs.${tab.id}_tab`}
            onClick={() => setActiveTab(tab.id)}
            className="px-5 py-2 rounded-md transition-all duration-200"
            style={{
              fontSize: "10px",
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: "pointer",
              border:
                activeTab === tab.id
                  ? "1px solid var(--border-glow)"
                  : "1px solid transparent",
              background:
                activeTab === tab.id
                  ? "rgba(124, 58, 237, 0.2)"
                  : "transparent",
              color:
                activeTab === tab.id
                  ? "var(--accent-purple-bright)"
                  : "var(--text-muted)",
              boxShadow:
                activeTab === tab.id
                  ? "0 0 10px var(--accent-purple-glow)"
                  : "none",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* =================== VIEW LOGS TAB =================== */}
      {activeTab === "view" && (
        <div>
          {/* Search */}
          <div className="relative mb-5" style={{ maxWidth: "400px" }}>
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-muted)" }}
            />
            <input
              data-ocid="staff_logs.search_input"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by IGN or Reason..."
              style={{
                width: "100%",
                padding: "10px 14px 10px 38px",
                background: "var(--bg-deep)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "6px",
                color: "var(--text-primary)",
                fontSize: "13px",
                outline: "none",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--border-glow)";
                e.target.style.boxShadow = "0 0 8px var(--accent-purple-glow)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--border-subtle)";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          <div
            className="neon-border rounded-lg overflow-hidden"
            style={{ background: "var(--bg-surface)" }}
          >
            {logsLoading ? (
              <div
                data-ocid="staff_logs.loading_state"
                className="flex items-center justify-center py-20 gap-3"
                style={{ color: "var(--text-muted)" }}
              >
                <Loader2
                  size={20}
                  className="animate-spin"
                  style={{ color: "var(--accent-purple)" }}
                />
                Loading punishment logs...
              </div>
            ) : filteredLogs.length === 0 ? (
              <div
                data-ocid="staff_logs.empty_state"
                className="flex flex-col items-center justify-center py-16"
                style={{ color: "var(--text-muted)" }}
              >
                <ScrollText
                  size={36}
                  style={{ opacity: 0.25, marginBottom: "14px" }}
                />
                <p style={{ fontSize: "12px" }}>
                  {search
                    ? `No logs found matching "${search}"`
                    : "No punishment logs recorded yet"}
                </p>
                {!search && (
                  <p
                    style={{ fontSize: "11px", marginTop: "6px", opacity: 0.7 }}
                  >
                    Use the "LOG PUNISHMENT" tab to add entries
                  </p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table
                  data-ocid="staff_logs.table"
                  className="staff-table"
                  style={{ minWidth: "800px" }}
                >
                  <thead>
                    <tr>
                      <th>IGN</th>
                      <th>REASON & DATE</th>
                      <th>OFFENSE</th>
                      <th>PROOF</th>
                      <th>SUBMITTED BY</th>
                      <th>TIMESTAMP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log, idx) => (
                      <tr
                        key={String(log.id)}
                        data-ocid={
                          idx < 3 ? `staff_logs.row.${idx + 1}` : undefined
                        }
                      >
                        <td style={{ fontWeight: 700 }}>{log.ign}</td>
                        <td
                          style={{
                            fontSize: "12px",
                            color: "var(--text-muted)",
                            maxWidth: "180px",
                            wordBreak: "break-word",
                          }}
                        >
                          {log.rnd}
                        </td>
                        <td>
                          <span
                            className="font-pixel"
                            style={{
                              fontSize: "9px",
                              background: "rgba(124, 58, 237, 0.15)",
                              border: "1px solid rgba(124, 58, 237, 0.3)",
                              color: "var(--accent-purple-bright)",
                              padding: "2px 6px",
                              borderRadius: "3px",
                            }}
                          >
                            #{String(log.offenseNumber)}
                          </span>
                        </td>
                        <td
                          style={{
                            fontSize: "12px",
                            color: "var(--text-muted)",
                            maxWidth: "160px",
                            wordBreak: "break-word",
                          }}
                        >
                          {log.proof || <span style={{ opacity: 0.4 }}>—</span>}
                        </td>
                        <td
                          style={{
                            fontSize: "12px",
                            color: "var(--text-muted)",
                          }}
                        >
                          {log.submittedBy}
                        </td>
                        <td
                          style={{
                            fontSize: "11px",
                            color: "var(--text-muted)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatTimestamp(log.timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {!logsLoading && filteredLogs.length > 0 && (
            <p
              className="mt-3"
              style={{ fontSize: "11px", color: "var(--text-muted)" }}
            >
              Showing {filteredLogs.length}{" "}
              {filteredLogs.length === 1 ? "entry" : "entries"}
              {search && ` matching "${search}"`}
            </p>
          )}
        </div>
      )}

      {/* =================== LOG PUNISHMENT TAB =================== */}
      {activeTab === "log" && (
        <div style={{ maxWidth: "600px" }}>
          {/* Disclaimer banner */}
          <div className="disclaimer-banner mb-6 flex items-center gap-2">
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />⚠ LOG HERE OR
            THE PLAYER REMAINS UNPUNISHED.
          </div>

          {/* Form card */}
          <div className="neon-card" style={{ padding: "28px 32px" }}>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* IGN */}
              <div>
                <label
                  htmlFor="log-ign"
                  className="block font-pixel mb-2"
                  style={{
                    fontSize: "9px",
                    color: "var(--text-muted)",
                    letterSpacing: "0.1em",
                  }}
                >
                  IGN — PLAYER IN-GAME NAME
                </label>
                <input
                  id="log-ign"
                  data-ocid="punishment_logger.ign_input"
                  type="text"
                  value={ign}
                  onChange={(e) => setIgn(e.target.value)}
                  placeholder="e.g. BloomCPVP"
                  required
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "var(--bg-deep)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "6px",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                    outline: "none",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--border-glow)";
                    e.target.style.boxShadow =
                      "0 0 8px var(--accent-purple-glow)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--border-subtle)";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              {/* R&D */}
              <div>
                <label
                  htmlFor="log-rnd"
                  className="block font-pixel mb-2"
                  style={{
                    fontSize: "9px",
                    color: "var(--text-muted)",
                    letterSpacing: "0.1em",
                  }}
                >
                  R&D — REASON & DATE / PUNISHMENT TIME
                </label>
                <input
                  id="log-rnd"
                  data-ocid="punishment_logger.rnd_input"
                  type="text"
                  value={rnd}
                  onChange={(e) => setRnd(e.target.value)}
                  placeholder="e.g. Hacking, 1d ban 12/01/26"
                  required
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "var(--bg-deep)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "6px",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                    outline: "none",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--border-glow)";
                    e.target.style.boxShadow =
                      "0 0 8px var(--accent-purple-glow)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--border-subtle)";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              {/* Offense # */}
              <div>
                <label
                  htmlFor="log-offense"
                  className="block font-pixel mb-2"
                  style={{
                    fontSize: "9px",
                    color: "var(--text-muted)",
                    letterSpacing: "0.1em",
                  }}
                >
                  OFFENSE NUMBER (1–5)
                </label>
                <select
                  id="log-offense"
                  data-ocid="punishment_logger.offense_select"
                  value={offenseNum}
                  onChange={(e) => setOffenseNum(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "var(--bg-deep)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "6px",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option
                      key={n}
                      value={n}
                      style={{ background: "var(--bg-deep)" }}
                    >
                      Offense #{n}
                    </option>
                  ))}
                </select>
              </div>

              {/* Proof */}
              <div>
                <label
                  htmlFor="log-proof"
                  className="block font-pixel mb-2"
                  style={{
                    fontSize: "9px",
                    color: "var(--text-muted)",
                    letterSpacing: "0.1em",
                  }}
                >
                  PROOF / EVIDENCE
                </label>
                <textarea
                  id="log-proof"
                  data-ocid="punishment_logger.proof_textarea"
                  value={proof}
                  onChange={(e) => setProof(e.target.value)}
                  placeholder="Proof / Evidence (text or link)"
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "var(--bg-deep)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "6px",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                    outline: "none",
                    resize: "vertical",
                    fontFamily: "inherit",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--border-glow)";
                    e.target.style.boxShadow =
                      "0 0 8px var(--accent-purple-glow)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--border-subtle)";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              {/* Example */}
              <p
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  fontStyle: "italic",
                }}
              >
                Example: IGN: BloomCPVP | R&D: Hacking, 1d ban 12/01/26 |
                Offense: 1 | Proof: (description)
              </p>

              {/* States */}
              {submitSuccess && (
                <div
                  data-ocid="punishment_logger.success_state"
                  className="flex items-center gap-2 rounded-md py-3 px-4"
                  style={{
                    background: "rgba(74, 222, 128, 0.1)",
                    border: "1px solid rgba(74, 222, 128, 0.4)",
                    color: "#4ade80",
                    fontSize: "12px",
                  }}
                >
                  <CheckCircle size={14} />
                  Punishment log submitted successfully!
                </div>
              )}

              {submitError && (
                <div
                  data-ocid="punishment_logger.error_state"
                  className="flex items-center gap-2 rounded-md py-3 px-4"
                  style={{
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    color: "#ef4444",
                    fontSize: "12px",
                  }}
                >
                  <XCircle size={14} />
                  {submitError}
                </div>
              )}

              {/* Submit */}
              <button
                data-ocid="punishment_logger.submit_button"
                type="submit"
                disabled={submitLoading}
                className="btn-neon flex items-center justify-center gap-2 py-3 rounded-md"
                style={{ fontSize: "11px", opacity: submitLoading ? 0.7 : 1 }}
              >
                {submitLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    SUBMITTING...
                  </>
                ) : (
                  <>
                    <ScrollText size={14} />
                    SUBMIT LOG
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer note */}
          <div
            className="mt-4 flex items-start gap-2 rounded-md py-3 px-4"
            style={{
              background: "rgba(148, 163, 184, 0.05)",
              border: "1px solid rgba(148, 163, 184, 0.15)",
              fontSize: "11px",
              color: "var(--text-muted)",
              fontStyle: "italic",
            }}
          >
            <AlertTriangle
              size={12}
              style={{ marginTop: "2px", flexShrink: 0, color: "#f59e0b" }}
            />
            Not following the required format multiple times may result in a
            minor strike or warning.
          </div>
        </div>
      )}

      {/* =================== AUDIT LOG TAB =================== */}
      {activeTab === "audit" && (
        <div>
          {/* Info banner */}
          <div
            className="mb-5 flex items-start gap-3 rounded-md py-3 px-4"
            style={{
              background: "rgba(96, 165, 250, 0.06)",
              border: "1px solid rgba(96, 165, 250, 0.2)",
              fontSize: "12px",
              color: "var(--text-muted)",
            }}
          >
            <ClipboardList
              size={14}
              style={{ color: "#60a5fa", marginTop: "1px", flexShrink: 0 }}
            />
            This log tracks every edit and deletion made to Punishment Matrix
            rules, including who performed each action and when.
          </div>

          <div
            className="neon-border rounded-lg overflow-hidden"
            style={{ background: "var(--bg-surface)" }}
          >
            {auditEntries.length === 0 ? (
              <div
                data-ocid="audit_log.empty_state"
                className="flex flex-col items-center justify-center py-16"
                style={{ color: "var(--text-muted)" }}
              >
                <ClipboardList
                  size={36}
                  style={{ opacity: 0.25, marginBottom: "14px" }}
                />
                <p style={{ fontSize: "12px" }}>No audit entries yet</p>
                <p style={{ fontSize: "11px", marginTop: "6px", opacity: 0.7 }}>
                  Edits and deletions to Punishment Matrix rules will appear
                  here
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table
                  data-ocid="audit_log.table"
                  className="staff-table"
                  style={{ minWidth: "700px" }}
                >
                  <thead>
                    <tr>
                      <th style={{ minWidth: "80px" }}>ACTION</th>
                      <th style={{ minWidth: "200px" }}>RULE</th>
                      <th style={{ minWidth: "200px" }}>DETAILS</th>
                      <th style={{ minWidth: "130px" }}>PERFORMED BY</th>
                      <th style={{ minWidth: "160px" }}>TIMESTAMP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditEntries.map((entry, idx) => (
                      <tr
                        key={entry.id}
                        data-ocid={
                          idx < 3 ? `audit_log.row.${idx + 1}` : undefined
                        }
                      >
                        <td>
                          {entry.action === "delete" ? (
                            <span
                              className="inline-flex items-center gap-1 font-pixel"
                              style={{
                                fontSize: "9px",
                                background: "rgba(239, 68, 68, 0.1)",
                                border: "1px solid rgba(239, 68, 68, 0.35)",
                                color: "#ef4444",
                                padding: "2px 7px",
                                borderRadius: "3px",
                              }}
                            >
                              <Trash2 size={9} />
                              DELETE
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 font-pixel"
                              style={{
                                fontSize: "9px",
                                background: "rgba(124, 58, 237, 0.12)",
                                border: "1px solid rgba(124, 58, 237, 0.3)",
                                color: "var(--accent-purple-bright)",
                                padding: "2px 7px",
                                borderRadius: "3px",
                              }}
                            >
                              <Pencil size={9} />
                              EDIT
                            </span>
                          )}
                        </td>
                        <td style={{ fontWeight: 600 }}>{entry.ruleName}</td>
                        <td
                          style={{
                            fontSize: "12px",
                            color: "var(--text-muted)",
                          }}
                        >
                          {entry.details}
                        </td>
                        <td
                          style={{
                            fontSize: "12px",
                            color: "var(--text-muted)",
                          }}
                        >
                          {entry.performedBy}
                        </td>
                        <td
                          style={{
                            fontSize: "11px",
                            color: "var(--text-muted)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatAuditTimestamp(entry.timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {auditEntries.length > 0 && (
            <p
              className="mt-3"
              style={{ fontSize: "11px", color: "var(--text-muted)" }}
            >
              {auditEntries.length} audit{" "}
              {auditEntries.length === 1 ? "entry" : "entries"} recorded
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      <footer
        className="mt-12 text-center"
        style={{ fontSize: "11px", color: "var(--text-muted)" }}
      >
        © {new Date().getFullYear()}. Built with ♥ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "var(--accent-purple-bright)",
            textDecoration: "none",
          }}
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
