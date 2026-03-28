import {
  ArrowLeft,
  ArrowRight,
  CalendarOff,
  CheckCircle,
  Clock,
  Loader2,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { PublicUser } from "../backend.d";
import { Role } from "../backend.d";
import { getMaintenanceMode } from "../lib/moderationSettings";
import {
  type LocalLOARequest,
  addLOARequest,
  deactivateLOA,
  getAllLOARequests,
  getAllLOARequestsRaw,
} from "../lib/portalData";

interface LeaveRequestsPageProps {
  currentUser: PublicUser;
}

function formatTs(ts: number): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function LeaveRequestsPage({ currentUser }: LeaveRequestsPageProps) {
  const [activeTab, setActiveTab] = useState<"active" | "history" | "submit">(
    "active",
  );

  // Active LOAs
  const [loas, setLoas] = useState<LocalLOARequest[]>([]);
  const [historyLoas, setHistoryLoas] = useState<LocalLOARequest[]>([]);
  const [loasLoading, setLoasLoading] = useState(true);
  const [deactivatingId, setDeactivatingId] = useState<number | null>(null);

  // Form state
  const [ign, setIgn] = useState("");
  const [discord, setDiscord] = useState("");
  const [leaveDate, setLeaveDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const canManage =
    currentUser.role === Role.Owner || currentUser.role === Role.CoOwner;

  const [maintenanceMode, setMaintenanceModeState] = useState(
    getMaintenanceMode(),
  );
  useEffect(() => {
    const interval = setInterval(() => {
      setMaintenanceModeState(getMaintenanceMode());
    }, 2000);
    return () => clearInterval(interval);
  }, []);
  const isOwner = currentUser.role === Role.Owner;
  const isMaintenanceBlocked = maintenanceMode && !isOwner;

  const fetchLOAs = () => {
    setLoasLoading(true);
    try {
      setLoas(getAllLOARequests());
      const all = getAllLOARequestsRaw();
      setHistoryLoas(all.filter((r) => !r.active));
    } finally {
      setLoasLoading(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: fetchLOAs is a stable local helper
  useEffect(() => {
    fetchLOAs();
  }, [activeTab]);

  const handleMarkReturned = (loa: LocalLOARequest) => {
    setDeactivatingId(loa.id);
    try {
      const success = deactivateLOA(loa.id);
      if (success) {
        fetchLOAs();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeactivatingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setSubmitError("");
    setSubmitSuccess(false);
    try {
      const newLoa = addLOARequest({
        ign,
        discordUsername: discord,
        leaveDate,
        returnDate,
        submittedBy: currentUser.username,
      });

      const webhookUrl = localStorage.getItem("portal_webhook_loa");
      if (webhookUrl) {
        try {
          await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              embeds: [
                {
                  title: "📅 New Leave of Absence",
                  color: 0x7c3aed,
                  fields: [
                    { name: "IGN", value: newLoa.ign, inline: true },
                    {
                      name: "Discord",
                      value: newLoa.discordUsername || "Not provided",
                      inline: true,
                    },
                    { name: "Leaving", value: newLoa.leaveDate, inline: true },
                    {
                      name: "Returning",
                      value: newLoa.returnDate,
                      inline: true,
                    },
                    {
                      name: "Logged By",
                      value: newLoa.submittedBy,
                      inline: true,
                    },
                  ],
                  footer: {
                    text: `Submitted ${new Date(newLoa.timestamp).toUTCString()}`,
                  },
                },
              ],
            }),
          });
        } catch {
          // Webhook errors are ignored
        }
      }

      setSubmitSuccess(true);
      setIgn("");
      setDiscord("");
      setLeaveDate("");
      setReturnDate("");
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch {
      setSubmitError("Failed to submit LOA. Please try again.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    background: "var(--bg-deep)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "6px",
    color: "var(--text-primary)",
    fontSize: "13px",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "var(--border-glow)";
    e.target.style.boxShadow = "0 0 8px var(--accent-purple-glow)";
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "var(--border-subtle)";
    e.target.style.boxShadow = "none";
  };

  const TABS = [
    { id: "active" as const, label: "ACTIVE LOAs" },
    { id: "history" as const, label: "RETURNED" },
    { id: "submit" as const, label: "SUBMIT LOA" },
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
          <Clock size={20} style={{ color: "var(--accent-purple-bright)" }} />
        </div>
        <div>
          <h1 className="page-header">LEAVE REQUESTS</h1>
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              marginTop: "2px",
            }}
          >
            Leave of Absence (LOA) management
          </p>
        </div>
        {loas.length > 0 && (
          <span
            className="font-pixel"
            style={{
              fontSize: "8px",
              padding: "3px 8px",
              borderRadius: "4px",
              background: "rgba(124,58,237,0.15)",
              border: "1px solid var(--border-glow)",
              color: "var(--accent-purple-bright)",
            }}
          >
            {loas.length} ACTIVE
          </span>
        )}
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
            data-ocid={`leave_requests.${tab.id}_tab`}
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

      {/* =================== ACTIVE LOAs TAB =================== */}
      {activeTab === "active" && (
        <div>
          {loasLoading ? (
            <div
              className="flex items-center justify-center py-20 gap-3 neon-border rounded-lg"
              style={{
                background: "var(--bg-surface)",
                color: "var(--text-muted)",
              }}
            >
              <Loader2
                size={20}
                className="animate-spin"
                style={{ color: "var(--accent-purple)" }}
              />
              Loading LOA requests...
            </div>
          ) : loas.length === 0 ? (
            <div
              data-ocid="leave_requests.empty_state"
              className="flex flex-col items-center justify-center py-16 neon-border rounded-lg"
              style={{
                background: "var(--bg-surface)",
                color: "var(--text-muted)",
              }}
            >
              <CalendarOff
                size={36}
                style={{ opacity: 0.25, marginBottom: "14px" }}
              />
              <p style={{ fontSize: "12px" }}>
                No active Leave of Absence requests
              </p>
              <p style={{ fontSize: "11px", marginTop: "6px", opacity: 0.7 }}>
                All staff are currently active
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {loas.map((loa, idx) => (
                <div
                  key={String(loa.id)}
                  data-ocid={
                    idx < 2 ? `leave_requests.row.${idx + 1}` : undefined
                  }
                  className="neon-border rounded-lg"
                  style={{
                    background: "var(--bg-surface)",
                    padding: "20px 24px",
                  }}
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    {/* Left: Staff info */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: "15px",
                            color: "var(--text-primary)",
                          }}
                        >
                          {loa.ign}
                        </span>
                        {loa.discordUsername && (
                          <span
                            style={{
                              fontSize: "12px",
                              color: "var(--text-muted)",
                            }}
                          >
                            @{loa.discordUsername}
                          </span>
                        )}
                        <span
                          className="font-pixel"
                          style={{
                            fontSize: "7px",
                            padding: "2px 6px",
                            borderRadius: "3px",
                            background: "rgba(74,222,128,0.1)",
                            border: "1px solid rgba(74,222,128,0.3)",
                            color: "#4ade80",
                          }}
                        >
                          ON LOA
                        </span>
                      </div>

                      {/* Dates row */}
                      <div className="flex items-center gap-5 flex-wrap">
                        <div className="flex items-center gap-2">
                          <ArrowRight
                            size={12}
                            style={{ color: "#ef4444", flexShrink: 0 }}
                          />
                          <div>
                            <p
                              className="font-pixel"
                              style={{
                                fontSize: "8px",
                                color: "var(--text-muted)",
                                letterSpacing: "0.08em",
                              }}
                            >
                              LEAVING
                            </p>
                            <p
                              style={{
                                fontSize: "13px",
                                color: "var(--text-primary)",
                                fontWeight: 600,
                              }}
                            >
                              {loa.leaveDate}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <ArrowLeft
                            size={12}
                            style={{ color: "#4ade80", flexShrink: 0 }}
                          />
                          <div>
                            <p
                              className="font-pixel"
                              style={{
                                fontSize: "8px",
                                color: "var(--text-muted)",
                                letterSpacing: "0.08em",
                              }}
                            >
                              RETURNING
                            </p>
                            <p
                              style={{
                                fontSize: "13px",
                                fontWeight: 600,
                                color:
                                  loa.returnDate === "TBD"
                                    ? "#f59e0b"
                                    : "var(--text-primary)",
                              }}
                            >
                              {loa.returnDate}
                            </p>
                          </div>
                        </div>
                      </div>

                      <p
                        style={{ fontSize: "11px", color: "var(--text-muted)" }}
                      >
                        Logged by{" "}
                        <strong style={{ color: "var(--text-primary)" }}>
                          {loa.submittedBy}
                        </strong>{" "}
                        · {formatTs(loa.timestamp)}
                      </p>
                    </div>

                    {/* Right: Actions */}
                    {canManage && (
                      <button
                        type="button"
                        data-ocid={`leave_requests.deactivate_button.${idx + 1}`}
                        onClick={() => handleMarkReturned(loa)}
                        disabled={deactivatingId === loa.id}
                        className="flex items-center gap-2 px-4 py-2 rounded transition-all duration-200"
                        style={{
                          background: "rgba(74,222,128,0.08)",
                          border: "1px solid rgba(74,222,128,0.3)",
                          color: "#4ade80",
                          fontSize: "10px",
                          fontFamily: '"JetBrains Mono", monospace',
                          fontWeight: 700,
                          cursor: "pointer",
                          opacity: deactivatingId === loa.id ? 0.6 : 1,
                          letterSpacing: "0.06em",
                          flexShrink: 0,
                        }}
                      >
                        {deactivatingId === loa.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <CheckCircle size={12} />
                        )}
                        MARK RETURNED
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p
            className="mt-3"
            style={{ fontSize: "11px", color: "var(--text-muted)" }}
          >
            {loas.length} active LOA{loas.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* =================== HISTORY TAB =================== */}
      {activeTab === "history" && (
        <div>
          {historyLoas.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 neon-border rounded-lg"
              style={{
                background: "var(--bg-surface)",
                color: "var(--text-muted)",
              }}
            >
              <CalendarOff
                size={36}
                style={{ opacity: 0.25, marginBottom: "14px" }}
              />
              <p style={{ fontSize: "12px" }}>No returned LOA records yet</p>
            </div>
          ) : (
            <div
              className="neon-border rounded-lg overflow-hidden"
              style={{ background: "var(--bg-surface)" }}
            >
              <div className="overflow-x-auto">
                <table className="staff-table" style={{ minWidth: "700px" }}>
                  <thead>
                    <tr>
                      <th>IGN</th>
                      <th>DISCORD</th>
                      <th>LEFT ON</th>
                      <th>RETURNED ON</th>
                      <th>LOGGED BY</th>
                      <th>RETURNED AT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyLoas.map((loa) => (
                      <tr key={String(loa.id)}>
                        <td style={{ fontWeight: 700 }}>{loa.ign}</td>
                        <td
                          style={{
                            fontSize: "12px",
                            color: "var(--text-muted)",
                          }}
                        >
                          {loa.discordUsername || "—"}
                        </td>
                        <td style={{ fontSize: "12px" }}>{loa.leaveDate}</td>
                        <td style={{ fontSize: "12px" }}>
                          {loa.returnDate === "TBD" ? (
                            <span style={{ color: "#f59e0b" }}>TBD</span>
                          ) : (
                            loa.returnDate
                          )}
                        </td>
                        <td
                          style={{
                            fontSize: "12px",
                            color: "var(--text-muted)",
                          }}
                        >
                          {loa.submittedBy}
                        </td>
                        <td style={{ fontSize: "11px", color: "#4ade80" }}>
                          {loa.returnedAt ? formatTs(loa.returnedAt) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================== SUBMIT LOA TAB =================== */}
      {activeTab === "submit" && (
        <div style={{ maxWidth: "560px" }}>
          <div
            className="rounded-lg mb-6 py-3 px-4"
            style={{
              background: "rgba(148, 163, 184, 0.05)",
              border: "1px solid rgba(148, 163, 184, 0.15)",
              fontSize: "12px",
              color: "var(--text-muted)",
              fontStyle: "italic",
            }}
          >
            If your return date isn't decided, enter "TBD". You can submit a new
            LOA to extend.
          </div>

          <div className="neon-card" style={{ padding: "28px 32px" }}>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* IGN */}
              <div>
                <label
                  htmlFor="loa-ign"
                  className="block font-pixel mb-2"
                  style={{
                    fontSize: "9px",
                    color: "var(--text-muted)",
                    letterSpacing: "0.1em",
                  }}
                >
                  IGN — IN-GAME NAME
                </label>
                <input
                  id="loa-ign"
                  data-ocid="loa_form.ign_input"
                  type="text"
                  value={ign}
                  onChange={(e) => setIgn(e.target.value)}
                  placeholder="Your Minecraft IGN"
                  required
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>

              {/* Discord */}
              <div>
                <label
                  htmlFor="loa-discord"
                  className="block font-pixel mb-2"
                  style={{
                    fontSize: "9px",
                    color: "var(--text-muted)",
                    letterSpacing: "0.1em",
                  }}
                >
                  DISCORD USERNAME
                </label>
                <input
                  id="loa-discord"
                  data-ocid="loa_form.discord_input"
                  type="text"
                  value={discord}
                  onChange={(e) => setDiscord(e.target.value)}
                  placeholder="e.g. username or username#0001"
                  required
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Leave Date */}
                <div>
                  <label
                    htmlFor="loa-leave-date"
                    className="block font-pixel mb-2"
                    style={{
                      fontSize: "9px",
                      color: "var(--text-muted)",
                      letterSpacing: "0.1em",
                    }}
                  >
                    <ArrowRight
                      size={9}
                      style={{
                        display: "inline",
                        marginRight: "4px",
                        color: "#ef4444",
                      }}
                    />
                    LEAVING DATE
                  </label>
                  <input
                    id="loa-leave-date"
                    data-ocid="loa_form.leave_date_input"
                    type="text"
                    value={leaveDate}
                    onChange={(e) => setLeaveDate(e.target.value)}
                    placeholder="e.g. Jan 15, 2026"
                    required
                    style={inputStyle}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                </div>

                {/* Return Date */}
                <div>
                  <label
                    htmlFor="loa-return-date"
                    className="block font-pixel mb-2"
                    style={{
                      fontSize: "9px",
                      color: "var(--text-muted)",
                      letterSpacing: "0.1em",
                    }}
                  >
                    <ArrowLeft
                      size={9}
                      style={{
                        display: "inline",
                        marginRight: "4px",
                        color: "#4ade80",
                      }}
                    />
                    RETURNING DATE
                  </label>
                  <input
                    id="loa-return-date"
                    data-ocid="loa_form.return_date_input"
                    type="text"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    placeholder="e.g. Jan 22, 2026 or TBD"
                    required
                    style={inputStyle}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                </div>
              </div>

              {/* States */}
              {submitSuccess && (
                <div
                  data-ocid="loa_form.success_state"
                  className="flex items-center gap-2 rounded-md py-3 px-4"
                  style={{
                    background: "rgba(74, 222, 128, 0.1)",
                    border: "1px solid rgba(74, 222, 128, 0.4)",
                    color: "#4ade80",
                    fontSize: "12px",
                  }}
                >
                  <CheckCircle size={14} />
                  LOA submitted successfully! Staff team has been notified.
                </div>
              )}

              {submitError && (
                <div
                  data-ocid="loa_form.error_state"
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

              {isMaintenanceBlocked && (
                <div
                  data-ocid="loa_form.maintenance_block"
                  className="flex items-center gap-2 rounded-md py-3 px-4"
                  style={{
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.4)",
                    color: "#ef4444",
                    fontSize: "12px",
                  }}
                >
                  System is in maintenance mode. LOA submissions are currently
                  disabled.
                </div>
              )}

              <button
                data-ocid="loa_form.submit_button"
                type="submit"
                disabled={submitLoading || isMaintenanceBlocked}
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
                    <Clock size={14} />
                    SUBMIT LOA
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

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
