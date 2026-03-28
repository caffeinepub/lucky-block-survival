import {
  AlertTriangle,
  ClipboardList,
  Info,
  Loader2,
  Pencil,
  ScrollText,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { PublicUser } from "../backend.d";
import {
  type LocalPunishmentLog,
  getAllPunishmentLogs,
} from "../lib/portalData";
import { type AuditEntry, getAuditEntries } from "../lib/punishmentAudit";
import { EvidenceLightbox } from "./PunishmentLoggerPage";

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString("en-US", {
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

function getDurationColor(duration: string): string {
  const lower = duration.toLowerCase();
  if (lower.includes("perm") || lower.includes("ban")) return "#ef4444";
  if (lower.includes("verbal") || lower.includes("warn")) return "#4ade80";
  return "#f59e0b";
}

interface StaffLogsPageProps {
  currentUser: PublicUser;
}

export function StaffLogsPage({
  currentUser: _currentUser,
}: StaffLogsPageProps) {
  const [activeTab, setActiveTab] = useState<"view" | "audit">("view");

  // View logs state
  const [logs, setLogs] = useState<LocalPunishmentLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Audit log state
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);

  // Lightbox state
  const [lightboxLog, setLightboxLog] = useState<LocalPunishmentLog | null>(
    null,
  );

  const fetchLogs = () => {
    setLogsLoading(true);
    try {
      setLogs(getAllPunishmentLogs());
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchAudit = () => {
    setAuditEntries(getAuditEntries());
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: fetch functions are stable local helpers
  useEffect(() => {
    if (activeTab === "view") fetchLogs();
    if (activeTab === "audit") fetchAudit();
  }, [activeTab]);

  const filteredLogs = logs.filter(
    (log) =>
      log.ign.toLowerCase().includes(search.toLowerCase()) ||
      log.rnd.toLowerCase().includes(search.toLowerCase()) ||
      (log.category ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const TABS = [
    { id: "view" as const, label: "VIEW LOGS" },
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
          {/* Redirect info banner */}
          <div
            data-ocid="staff_logs.logger_redirect_banner"
            className="mb-5 flex items-start gap-3 rounded-md py-3 px-4"
            style={{
              background: "rgba(96, 165, 250, 0.06)",
              border: "1px solid rgba(96, 165, 250, 0.25)",
              fontSize: "12px",
              color: "var(--text-muted)",
            }}
          >
            <Info
              size={14}
              style={{ color: "#60a5fa", marginTop: "1px", flexShrink: 0 }}
            />
            To log a new punishment, use the{" "}
            <strong style={{ color: "#60a5fa" }}>PUNISHMENT LOGGER</strong> page
            in the sidebar.
          </div>

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
              placeholder="Search by IGN, Category or Reason..."
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
                    Use the Punishment Logger in the sidebar to add entries
                  </p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table
                  data-ocid="staff_logs.table"
                  className="staff-table"
                  style={{ minWidth: "1000px" }}
                >
                  <thead>
                    <tr>
                      <th>IGN</th>
                      <th>CATEGORY</th>
                      <th>OFFENSE</th>
                      <th>DURATION</th>
                      <th>REASON &amp; DATE</th>
                      <th>ALTS</th>
                      <th>PROOF</th>
                      <th>SUBMITTED BY</th>
                      <th>TIMESTAMP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log, idx) => {
                      const dur = log.duration ?? "";
                      const durColor = dur
                        ? getDurationColor(dur)
                        : "var(--text-muted)";
                      return (
                        <tr
                          key={String(log.id)}
                          data-ocid={
                            idx < 3 ? `staff_logs.row.${idx + 1}` : undefined
                          }
                        >
                          {/* IGN */}
                          <td style={{ fontWeight: 700 }}>{log.ign}</td>

                          {/* CATEGORY */}
                          <td>
                            {log.category ? (
                              <span
                                className="font-pixel"
                                style={{
                                  fontSize: "9px",
                                  background: "rgba(124,58,237,0.12)",
                                  border: "1px solid rgba(124,58,237,0.3)",
                                  color: "var(--accent-purple-bright)",
                                  padding: "2px 6px",
                                  borderRadius: "3px",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {log.category}
                              </span>
                            ) : (
                              <span style={{ opacity: 0.4 }}>—</span>
                            )}
                          </td>

                          {/* OFFENSE */}
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
                              #{String(log.offenseLevel ?? log.offenseNumber)}
                            </span>
                          </td>

                          {/* DURATION */}
                          <td>
                            {dur ? (
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  color: durColor,
                                  fontFamily: '"JetBrains Mono", monospace',
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {dur}
                              </span>
                            ) : (
                              <span style={{ opacity: 0.4 }}>—</span>
                            )}
                          </td>

                          {/* REASON */}
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

                          {/* ALTS */}
                          <td
                            style={{
                              fontSize: "11px",
                              color: "var(--text-muted)",
                              maxWidth: "120px",
                            }}
                          >
                            {log.alts && log.alts.length > 0 ? (
                              <span title={log.alts.join(", ")}>
                                {log.alts.slice(0, 2).join(", ")}
                                {log.alts.length > 2 &&
                                  ` +${log.alts.length - 2}`}
                              </span>
                            ) : (
                              <span style={{ opacity: 0.4 }}>—</span>
                            )}
                          </td>

                          {/* PROOF */}
                          <td>
                            {log.proofBase64 &&
                            log.proofMimeType?.startsWith("image/") ? (
                              <button
                                type="button"
                                data-ocid={
                                  idx < 3
                                    ? `staff_logs.evidence_thumbnail.${idx + 1}`
                                    : undefined
                                }
                                onClick={() => setLightboxLog(log)}
                                style={{
                                  padding: 0,
                                  background: "none",
                                  border: "1px solid var(--border-subtle)",
                                  borderRadius: "3px",
                                  cursor: "pointer",
                                  overflow: "hidden",
                                }}
                              >
                                <img
                                  src={log.proofBase64}
                                  alt="Evidence"
                                  style={{
                                    height: "24px",
                                    width: "32px",
                                    objectFit: "cover",
                                    display: "block",
                                  }}
                                />
                              </button>
                            ) : log.proofFileName ? (
                              <span
                                className="flex items-center gap-1"
                                style={{
                                  fontSize: "10px",
                                  color: "var(--text-muted)",
                                }}
                              >
                                <AlertTriangle
                                  size={10}
                                  style={{ opacity: 0.5 }}
                                />
                                {log.proofFileName.length > 14
                                  ? `${log.proofFileName.slice(0, 12)}…`
                                  : log.proofFileName}
                              </span>
                            ) : log.proof ? (
                              <span
                                style={{
                                  fontSize: "12px",
                                  color: "var(--text-muted)",
                                  maxWidth: "120px",
                                  wordBreak: "break-word",
                                  display: "block",
                                }}
                              >
                                {log.proof}
                              </span>
                            ) : (
                              <span style={{ opacity: 0.4 }}>—</span>
                            )}
                          </td>

                          {/* SUBMITTED BY */}
                          <td
                            style={{
                              fontSize: "12px",
                              color: "var(--text-muted)",
                            }}
                          >
                            {log.submittedBy}
                          </td>

                          {/* TIMESTAMP */}
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
                      );
                    })}
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

      {/* Evidence Lightbox */}
      {lightboxLog?.proofBase64 && (
        <EvidenceLightbox
          src={lightboxLog?.proofBase64 ?? ""}
          mimeType={lightboxLog?.proofMimeType ?? ""}
          fileName={lightboxLog?.proofFileName ?? "evidence"}
          onClose={() => setLightboxLog(null)}
        />
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
