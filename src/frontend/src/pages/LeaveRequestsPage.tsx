import {
  CalendarOff,
  CheckCircle,
  Clock,
  Loader2,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { LOARequest, PublicUser } from "../backend.d";
import { Role } from "../backend.d";
import { useActor } from "../hooks/useActor";

interface LeaveRequestsPageProps {
  currentUser: PublicUser;
}

export function LeaveRequestsPage({ currentUser }: LeaveRequestsPageProps) {
  const { actor } = useActor();
  const [activeTab, setActiveTab] = useState<"active" | "submit">("active");

  // Active LOAs
  const [loas, setLoas] = useState<LOARequest[]>([]);
  const [loasLoading, setLoasLoading] = useState(true);
  const [deactivatingId, setDeactivatingId] = useState<bigint | null>(null);

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

  const fetchLOAs = () => {
    if (!actor) {
      setLoasLoading(false);
      return;
    }
    setLoasLoading(true);
    actor
      .getAllLOARequests()
      .then((result) => {
        if (result.__kind__ === "ok") {
          const active = result.ok.filter((l) => l.active);
          const sorted = active.sort(
            (a, b) => Number(b.timestamp) - Number(a.timestamp),
          );
          setLoas(sorted);
        }
        // If err — show empty state (backend not initialized)
      })
      .catch(() => {
        // Silently ignore — backend not initialized; show empty state
      })
      .finally(() => setLoasLoading(false));
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: fetchLOAs is defined inside component and depends on actor
  useEffect(() => {
    if (activeTab === "active") fetchLOAs();
  }, [actor, activeTab]);

  const handleDeactivate = async (loa: LOARequest, _displayIdx: number) => {
    if (!actor) return;
    setDeactivatingId(loa.id);
    try {
      const result = await actor.deactivateLOA(loa.id);
      if (result.__kind__ === "ok") {
        setLoas((prev) => prev.filter((l) => l.id !== loa.id));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeactivatingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor) return;
    setSubmitLoading(true);
    setSubmitError("");
    setSubmitSuccess(false);
    try {
      const result = await actor.submitLOARequest(
        ign,
        discord,
        leaveDate,
        returnDate,
      );
      if (result.__kind__ === "ok") {
        setSubmitSuccess(true);
        setIgn("");
        setDiscord("");
        setLeaveDate("");
        setReturnDate("");
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
        {(["active", "submit"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className="px-5 py-2 rounded-md transition-all duration-200"
            style={{
              fontSize: "10px",
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: "pointer",
              border:
                activeTab === tab
                  ? "1px solid var(--border-glow)"
                  : "1px solid transparent",
              background:
                activeTab === tab ? "rgba(124, 58, 237, 0.2)" : "transparent",
              color:
                activeTab === tab
                  ? "var(--accent-purple-bright)"
                  : "var(--text-muted)",
              boxShadow:
                activeTab === tab
                  ? "0 0 10px var(--accent-purple-glow)"
                  : "none",
            }}
          >
            {tab === "active" ? "ACTIVE LOAs" : "SUBMIT LOA"}
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
            <div
              data-ocid="leave_requests.table"
              className="neon-border rounded-lg overflow-hidden"
              style={{ background: "var(--bg-surface)" }}
            >
              <div className="overflow-x-auto">
                <table className="staff-table" style={{ minWidth: "700px" }}>
                  <thead>
                    <tr>
                      <th>IGN</th>
                      <th>DISCORD</th>
                      <th>LEAVE DATE</th>
                      <th>RETURN DATE</th>
                      <th>SUBMITTED BY</th>
                      {canManage && <th>ACTIONS</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {loas.map((loa, idx) => (
                      <tr
                        key={String(loa.id)}
                        data-ocid={
                          idx < 2 ? `leave_requests.row.${idx + 1}` : undefined
                        }
                      >
                        <td style={{ fontWeight: 700 }}>{loa.ign}</td>
                        <td
                          style={{
                            fontSize: "12px",
                            color: "var(--text-muted)",
                          }}
                        >
                          {loa.discordUsername}
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
                        {canManage && (
                          <td>
                            <button
                              type="button"
                              data-ocid={`leave_requests.deactivate_button.${idx + 1}`}
                              onClick={() => handleDeactivate(loa, idx + 1)}
                              disabled={deactivatingId === loa.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded transition-all duration-200"
                              style={{
                                background: "rgba(239, 68, 68, 0.08)",
                                border: "1px solid rgba(239, 68, 68, 0.3)",
                                color: "#ef4444",
                                fontSize: "9px",
                                fontFamily: '"JetBrains Mono", monospace',
                                fontWeight: 700,
                                cursor: "pointer",
                                opacity: deactivatingId === loa.id ? 0.6 : 1,
                                letterSpacing: "0.06em",
                              }}
                            >
                              {deactivatingId === loa.id ? (
                                <Loader2 size={10} className="animate-spin" />
                              ) : (
                                <XCircle size={10} />
                              )}
                              MARK INACTIVE
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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

      {/* =================== SUBMIT LOA TAB =================== */}
      {activeTab === "submit" && (
        <div style={{ maxWidth: "560px" }}>
          {/* Helper text */}
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
            If return isn't decided, write how long you may be gone and feel
            free to issue a new LOA if it takes more time.
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
                  placeholder="e.g. username#0001"
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
                    LEAVING DATE
                  </label>
                  <input
                    id="loa-leave-date"
                    data-ocid="loa_form.leave_date_input"
                    type="text"
                    value={leaveDate}
                    onChange={(e) => setLeaveDate(e.target.value)}
                    placeholder="e.g. 2026-01-15"
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
                    RETURNING DATE
                  </label>
                  <input
                    id="loa-return-date"
                    data-ocid="loa_form.return_date_input"
                    type="text"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    placeholder="e.g. 2026-01-22 or 'TBD'"
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

              {/* Submit */}
              <button
                data-ocid="loa_form.submit_button"
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
                    <Clock size={14} />
                    SUBMIT LOA
                  </>
                )}
              </button>
            </form>
          </div>
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
