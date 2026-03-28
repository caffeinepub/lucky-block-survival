import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  FileSearch,
  Gavel,
  Loader2,
  Plus,
  Shield,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { PublicUser } from "../backend.d";
import { Role } from "../backend.d";
import { getMaintenanceMode } from "../lib/moderationSettings";
import {
  type AppealStatus,
  type LocalAppeal,
  type LocalPunishmentLog,
  addAppeal,
  getAllAppeals,
  getAllPunishmentLogs,
  reviewAppeal,
} from "../lib/portalData";

interface AppealsPageProps {
  currentUser: PublicUser;
}

function statusColor(status: AppealStatus): string {
  if (status === "Accepted") return "#4ade80";
  if (status === "Denied") return "#ef4444";
  return "#f59e0b";
}

function statusBg(status: AppealStatus): string {
  if (status === "Accepted") return "rgba(74,222,128,0.1)";
  if (status === "Denied") return "rgba(239,68,68,0.1)";
  return "rgba(245,158,11,0.1)";
}

function statusBorder(status: AppealStatus): string {
  if (status === "Accepted") return "rgba(74,222,128,0.35)";
  if (status === "Denied") return "rgba(239,68,68,0.35)";
  return "rgba(245,158,11,0.35)";
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

export function AppealsPage({ currentUser }: AppealsPageProps) {
  const [activeTab, setActiveTab] = useState<"list" | "submit">("list");
  const [filterStatus, setFilterStatus] = useState<AppealStatus | "All">("All");

  // List state
  const [appeals, setAppeals] = useState<LocalAppeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  // Submit state
  const [punishments, setPunishments] = useState<LocalPunishmentLog[]>([]);
  const [selectedPunishmentId, setSelectedPunishmentId] = useState("");
  const [playerIgn, setPlayerIgn] = useState("");
  const [discordUsername, setDiscordUsername] = useState("");
  const [reason, setReason] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const canReview =
    currentUser.role === Role.Owner || currentUser.role === Role.CoOwner;

  const [maintenanceMode] = useState(() => getMaintenanceMode());
  const isOwner = currentUser.role === Role.Owner;
  const isMaintenanceBlocked = maintenanceMode && !isOwner;

  const fetchAppeals = () => {
    setLoading(true);
    try {
      setAppeals(getAllAppeals());
    } finally {
      setLoading(false);
    }
  };

  const fetchPunishments = () => {
    setPunishments(getAllPunishmentLogs());
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: fetch functions are stable local helpers
  useEffect(() => {
    if (activeTab === "list") fetchAppeals();
    if (activeTab === "submit") fetchPunishments();
  }, [activeTab]);

  const filteredAppeals =
    filterStatus === "All"
      ? appeals
      : appeals.filter((a) => a.status === filterStatus);

  const handleReview = (appeal: LocalAppeal, status: "Accepted" | "Denied") => {
    reviewAppeal(
      appeal.id,
      status,
      currentUser.username,
      reviewNote || undefined,
    );
    setReviewingId(null);
    setReviewNote("");
    fetchAppeals();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setSubmitError("");
    setSubmitSuccess(false);
    try {
      if (!playerIgn.trim() || !reason.trim()) {
        setSubmitError("Player IGN and reason are required.");
        return;
      }
      const punId = selectedPunishmentId ? Number(selectedPunishmentId) : 0;
      const matchedPun = punishments.find((p) => p.id === punId);
      addAppeal({
        punishmentId: punId,
        playerIgn: playerIgn.trim(),
        discordUsername: discordUsername.trim(),
        reason: reason.trim(),
        submittedBy: currentUser.username,
        category: matchedPun?.category,
        duration: matchedPun?.duration,
        offenseNumber: matchedPun?.offenseNumber,
      });
      setSubmitSuccess(true);
      setSelectedPunishmentId("");
      setPlayerIgn("");
      setDiscordUsername("");
      setReason("");
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch {
      setSubmitError("Failed to submit appeal. Please try again.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleFocus = (
    e: React.FocusEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    (e.target as HTMLElement).style.borderColor = "var(--border-glow)";
    (e.target as HTMLElement).style.boxShadow =
      "0 0 8px var(--accent-purple-glow)";
  };
  const handleBlur = (
    e: React.FocusEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    (e.target as HTMLElement).style.borderColor = "var(--border-subtle)";
    (e.target as HTMLElement).style.boxShadow = "none";
  };

  const pendingCount = appeals.filter((a) => a.status === "Pending").length;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="flex items-center justify-center rounded-lg"
          style={{
            width: "40px",
            height: "40px",
            background: "rgba(96,165,250,0.15)",
            border: "1px solid rgba(96,165,250,0.4)",
          }}
        >
          <FileSearch size={20} style={{ color: "#60a5fa" }} />
        </div>
        <div>
          <h1 className="page-header" style={{ color: "#60a5fa" }}>
            APPEALS
          </h1>
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              marginTop: "2px",
            }}
          >
            Punishment appeal management
          </p>
        </div>
        {pendingCount > 0 && (
          <span
            className="font-pixel"
            style={{
              fontSize: "8px",
              padding: "3px 8px",
              borderRadius: "4px",
              background: "rgba(245,158,11,0.15)",
              border: "1px solid rgba(245,158,11,0.4)",
              color: "#f59e0b",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          >
            {pendingCount} PENDING
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
        {(["list", "submit"] as const).map((tab) => (
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
                  ? "1px solid rgba(96,165,250,0.5)"
                  : "1px solid transparent",
              background:
                activeTab === tab ? "rgba(96,165,250,0.12)" : "transparent",
              color: activeTab === tab ? "#60a5fa" : "var(--text-muted)",
            }}
          >
            {tab === "list" ? "ALL APPEALS" : "SUBMIT APPEAL"}
          </button>
        ))}
      </div>

      {/* =================== LIST TAB =================== */}
      {activeTab === "list" && (
        <div>
          {/* Filter row */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {(["All", "Pending", "Accepted", "Denied"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilterStatus(s)}
                className="px-4 py-1.5 rounded-md transition-all duration-200"
                style={{
                  fontSize: "10px",
                  fontFamily: '"JetBrains Mono", monospace',
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  cursor: "pointer",
                  background:
                    filterStatus === s
                      ? s === "All"
                        ? "rgba(96,165,250,0.15)"
                        : statusBg(s as AppealStatus)
                      : "transparent",
                  border:
                    filterStatus === s
                      ? s === "All"
                        ? "1px solid rgba(96,165,250,0.4)"
                        : `1px solid ${statusBorder(s as AppealStatus)}`
                      : "1px solid var(--border-subtle)",
                  color:
                    filterStatus === s
                      ? s === "All"
                        ? "#60a5fa"
                        : statusColor(s as AppealStatus)
                      : "var(--text-muted)",
                }}
              >
                {s}
                {s === "Pending" && pendingCount > 0 && ` (${pendingCount})`}
              </button>
            ))}
          </div>

          {loading ? (
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
                style={{ color: "#60a5fa" }}
              />
              Loading appeals...
            </div>
          ) : filteredAppeals.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 neon-border rounded-lg"
              style={{
                background: "var(--bg-surface)",
                color: "var(--text-muted)",
              }}
            >
              <Gavel
                size={36}
                style={{ opacity: 0.25, marginBottom: "14px" }}
              />
              <p style={{ fontSize: "12px" }}>
                No {filterStatus !== "All" ? filterStatus.toLowerCase() : ""}{" "}
                appeals found
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredAppeals.map((appeal) => {
                const isExpanded = expandedId === appeal.id;
                const isReviewing = reviewingId === appeal.id;
                return (
                  <div
                    key={appeal.id}
                    className="neon-border rounded-lg overflow-hidden"
                    style={{ background: "var(--bg-surface)" }}
                  >
                    {/* Appeal header row */}
                    <button
                      type="button"
                      className="flex items-center gap-4 px-5 py-4 cursor-pointer w-full text-left"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : appeal.id)
                      }
                      style={{
                        userSelect: "none",
                        background: "none",
                        border: "none",
                      }}
                    >
                      {/* Status badge */}
                      <span
                        className="font-pixel flex-shrink-0"
                        style={{
                          fontSize: "8px",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          background: statusBg(appeal.status),
                          border: `1px solid ${statusBorder(appeal.status)}`,
                          color: statusColor(appeal.status),
                          minWidth: "64px",
                          textAlign: "center",
                        }}
                      >
                        {appeal.status.toUpperCase()}
                      </span>

                      {/* IGN */}
                      <div className="flex-1 min-w-0">
                        <p
                          style={{
                            fontWeight: 700,
                            fontSize: "14px",
                            color: "var(--text-primary)",
                          }}
                        >
                          {appeal.playerIgn}
                          {appeal.discordUsername && (
                            <span
                              style={{
                                fontWeight: 400,
                                fontSize: "12px",
                                color: "var(--text-muted)",
                                marginLeft: "8px",
                              }}
                            >
                              @{appeal.discordUsername}
                            </span>
                          )}
                        </p>
                        {appeal.category && (
                          <p
                            style={{
                              fontSize: "11px",
                              color: "var(--text-muted)",
                              marginTop: "2px",
                            }}
                          >
                            {appeal.category} · Offense #{appeal.offenseNumber}{" "}
                            · {appeal.duration}
                          </p>
                        )}
                      </div>

                      {/* Date */}
                      <span
                        style={{
                          fontSize: "11px",
                          color: "var(--text-muted)",
                          flexShrink: 0,
                        }}
                      >
                        {formatTs(appeal.timestamp)}
                      </span>

                      {/* Expand icon */}
                      {isExpanded ? (
                        <ChevronUp
                          size={14}
                          style={{ color: "var(--text-muted)", flexShrink: 0 }}
                        />
                      ) : (
                        <ChevronDown
                          size={14}
                          style={{ color: "var(--text-muted)", flexShrink: 0 }}
                        />
                      )}
                    </button>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div
                        style={{
                          borderTop: "1px solid var(--border-subtle)",
                          padding: "20px 20px 20px 20px",
                        }}
                      >
                        {/* Appeal reason */}
                        <div className="mb-4">
                          <p
                            className="font-pixel mb-2"
                            style={{
                              fontSize: "9px",
                              color: "var(--text-muted)",
                              letterSpacing: "0.1em",
                            }}
                          >
                            APPEAL REASON
                          </p>
                          <p
                            style={{
                              fontSize: "13px",
                              color: "var(--text-primary)",
                              lineHeight: 1.6,
                            }}
                          >
                            {appeal.reason}
                          </p>
                        </div>

                        {/* Meta */}
                        <div className="flex gap-6 mb-4 flex-wrap">
                          <div>
                            <p
                              className="font-pixel mb-1"
                              style={{
                                fontSize: "9px",
                                color: "var(--text-muted)",
                              }}
                            >
                              LOGGED BY
                            </p>
                            <p
                              style={{
                                fontSize: "12px",
                                color: "var(--text-primary)",
                              }}
                            >
                              {appeal.submittedBy}
                            </p>
                          </div>
                          {appeal.reviewedBy && (
                            <div>
                              <p
                                className="font-pixel mb-1"
                                style={{
                                  fontSize: "9px",
                                  color: "var(--text-muted)",
                                }}
                              >
                                REVIEWED BY
                              </p>
                              <p
                                style={{
                                  fontSize: "12px",
                                  color: statusColor(appeal.status),
                                }}
                              >
                                {appeal.reviewedBy}
                              </p>
                            </div>
                          )}
                          {appeal.reviewedAt && (
                            <div>
                              <p
                                className="font-pixel mb-1"
                                style={{
                                  fontSize: "9px",
                                  color: "var(--text-muted)",
                                }}
                              >
                                REVIEWED AT
                              </p>
                              <p
                                style={{
                                  fontSize: "12px",
                                  color: "var(--text-muted)",
                                }}
                              >
                                {formatTs(appeal.reviewedAt)}
                              </p>
                            </div>
                          )}
                        </div>

                        {appeal.reviewNote && (
                          <div
                            className="mb-4 px-4 py-3 rounded-md"
                            style={{
                              background: "var(--bg-deep)",
                              border: "1px solid var(--border-subtle)",
                              fontSize: "12px",
                              color: "var(--text-muted)",
                            }}
                          >
                            <span
                              className="font-pixel"
                              style={{
                                fontSize: "9px",
                                letterSpacing: "0.08em",
                              }}
                            >
                              REVIEW NOTE:{" "}
                            </span>
                            {appeal.reviewNote}
                          </div>
                        )}

                        {/* If accepted, show escalation note */}
                        {appeal.status === "Accepted" && (
                          <div
                            className="mb-4 flex items-center gap-2 px-4 py-3 rounded-md"
                            style={{
                              background: "rgba(74,222,128,0.07)",
                              border: "1px solid rgba(74,222,128,0.25)",
                              fontSize: "12px",
                              color: "#4ade80",
                            }}
                          >
                            <Shield size={13} style={{ flexShrink: 0 }} />
                            This punishment has been removed from the escalation
                            count for this player.
                          </div>
                        )}

                        {/* Review actions (Owner/CoOwner only, Pending only) */}
                        {canReview && appeal.status === "Pending" && (
                          <div>
                            {!isReviewing ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReviewingId(appeal.id);
                                  setReviewNote("");
                                }}
                                className="flex items-center gap-2 px-4 py-2 rounded-md"
                                style={{
                                  fontSize: "10px",
                                  fontFamily: '"JetBrains Mono", monospace',
                                  fontWeight: 700,
                                  letterSpacing: "0.06em",
                                  background: "rgba(96,165,250,0.1)",
                                  border: "1px solid rgba(96,165,250,0.35)",
                                  color: "#60a5fa",
                                  cursor: "pointer",
                                }}
                              >
                                <Gavel size={12} /> REVIEW APPEAL
                              </button>
                            ) : (
                              <div
                                className="flex flex-col gap-3"
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                                role="presentation"
                              >
                                <div>
                                  <label
                                    htmlFor="review-note-textarea"
                                    className="block font-pixel mb-2"
                                    style={{
                                      fontSize: "9px",
                                      color: "var(--text-muted)",
                                      letterSpacing: "0.1em",
                                    }}
                                  >
                                    REVIEW NOTE (OPTIONAL)
                                  </label>
                                  <textarea
                                    id="review-note-textarea"
                                    value={reviewNote}
                                    onChange={(e) =>
                                      setReviewNote(e.target.value)
                                    }
                                    placeholder="Add a note explaining your decision..."
                                    rows={2}
                                    style={{
                                      ...inputStyle,
                                      resize: "vertical",
                                      fontFamily: "inherit",
                                    }}
                                    onFocus={handleFocus}
                                    onBlur={handleBlur}
                                  />
                                </div>
                                <div className="flex gap-3">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleReview(appeal, "Accepted")
                                    }
                                    className="flex items-center gap-2 px-5 py-2 rounded-md"
                                    style={{
                                      fontSize: "10px",
                                      fontFamily: '"JetBrains Mono", monospace',
                                      fontWeight: 700,
                                      letterSpacing: "0.06em",
                                      background: "rgba(74,222,128,0.1)",
                                      border: "1px solid rgba(74,222,128,0.4)",
                                      color: "#4ade80",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <CheckCircle size={12} /> ACCEPT
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleReview(appeal, "Denied")
                                    }
                                    className="flex items-center gap-2 px-5 py-2 rounded-md"
                                    style={{
                                      fontSize: "10px",
                                      fontFamily: '"JetBrains Mono", monospace',
                                      fontWeight: 700,
                                      letterSpacing: "0.06em",
                                      background: "rgba(239,68,68,0.1)",
                                      border: "1px solid rgba(239,68,68,0.4)",
                                      color: "#ef4444",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <XCircle size={12} /> DENY
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setReviewingId(null)}
                                    className="px-4 py-2 rounded-md"
                                    style={{
                                      fontSize: "10px",
                                      fontFamily: '"JetBrains Mono", monospace',
                                      fontWeight: 700,
                                      letterSpacing: "0.06em",
                                      background: "transparent",
                                      border: "1px solid var(--border-subtle)",
                                      color: "var(--text-muted)",
                                      cursor: "pointer",
                                    }}
                                  >
                                    CANCEL
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =================== SUBMIT TAB =================== */}
      {activeTab === "submit" && (
        <div style={{ maxWidth: "560px" }}>
          <div
            className="rounded-lg mb-6 py-3 px-4"
            style={{
              background: "rgba(96,165,250,0.06)",
              border: "1px solid rgba(96,165,250,0.2)",
              fontSize: "12px",
              color: "var(--text-muted)",
            }}
          >
            Submit a player's punishment appeal on their behalf. Accepted
            appeals remove the punishment from the player's escalation count.
          </div>

          <div className="neon-card" style={{ padding: "28px 32px" }}>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Link to existing punishment */}
              <div>
                <label
                  htmlFor="appeal-punishment"
                  className="block font-pixel mb-2"
                  style={{
                    fontSize: "9px",
                    color: "var(--text-muted)",
                    letterSpacing: "0.1em",
                  }}
                >
                  LINK TO PUNISHMENT LOG (OPTIONAL)
                </label>
                <select
                  id="appeal-punishment"
                  value={selectedPunishmentId}
                  onChange={(e) => {
                    setSelectedPunishmentId(e.target.value);
                    const p = punishments.find(
                      (p) => p.id === Number(e.target.value),
                    );
                    if (p) setPlayerIgn(p.ign);
                  }}
                  style={{ ...inputStyle, cursor: "pointer" }}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                >
                  <option value="" style={{ background: "var(--bg-deep)" }}>
                    — Select punishment (optional) —
                  </option>
                  {punishments.map((p) => (
                    <option
                      key={p.id}
                      value={p.id}
                      style={{ background: "var(--bg-deep)" }}
                    >
                      {p.ign} · {p.category ?? "?"} ·{" "}
                      {p.duration ?? `#${p.offenseNumber}`} ·{" "}
                      {new Date(p.timestamp).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Player IGN */}
              <div>
                <label
                  htmlFor="appeal-ign"
                  className="block font-pixel mb-2"
                  style={{
                    fontSize: "9px",
                    color: "var(--text-muted)",
                    letterSpacing: "0.1em",
                  }}
                >
                  PLAYER IGN
                </label>
                <input
                  id="appeal-ign"
                  type="text"
                  value={playerIgn}
                  onChange={(e) => setPlayerIgn(e.target.value)}
                  placeholder="Player's Minecraft IGN"
                  required
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>

              {/* Discord */}
              <div>
                <label
                  htmlFor="appeal-discord"
                  className="block font-pixel mb-2"
                  style={{
                    fontSize: "9px",
                    color: "var(--text-muted)",
                    letterSpacing: "0.1em",
                  }}
                >
                  PLAYER DISCORD (OPTIONAL)
                </label>
                <input
                  id="appeal-discord"
                  type="text"
                  value={discordUsername}
                  onChange={(e) => setDiscordUsername(e.target.value)}
                  placeholder="e.g. username#0001"
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>

              {/* Reason */}
              <div>
                <label
                  htmlFor="appeal-reason"
                  className="block font-pixel mb-2"
                  style={{
                    fontSize: "9px",
                    color: "var(--text-muted)",
                    letterSpacing: "0.1em",
                  }}
                >
                  APPEAL REASON
                </label>
                <textarea
                  id="appeal-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why should this punishment be appealed? Include any relevant context..."
                  required
                  rows={4}
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                    fontFamily: "inherit",
                  }}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>

              {submitSuccess && (
                <div
                  className="flex items-center gap-2 rounded-md py-3 px-4"
                  style={{
                    background: "rgba(74,222,128,0.1)",
                    border: "1px solid rgba(74,222,128,0.4)",
                    color: "#4ade80",
                    fontSize: "12px",
                  }}
                >
                  <CheckCircle size={14} /> Appeal submitted successfully and is
                  pending review.
                </div>
              )}

              {submitError && (
                <div
                  className="flex items-center gap-2 rounded-md py-3 px-4"
                  style={{
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.4)",
                    color: "#ef4444",
                    fontSize: "12px",
                  }}
                >
                  <XCircle size={14} /> {submitError}
                </div>
              )}

              {isMaintenanceBlocked && (
                <div
                  className="flex items-center gap-2 rounded-md py-3 px-4"
                  style={{
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.4)",
                    color: "#ef4444",
                    fontSize: "12px",
                  }}
                >
                  System is in maintenance mode. Appeal submissions are
                  currently disabled.
                </div>
              )}

              <button
                type="submit"
                disabled={submitLoading || isMaintenanceBlocked}
                className="btn-neon flex items-center justify-center gap-2 py-3 rounded-md"
                style={{ fontSize: "11px", opacity: submitLoading ? 0.7 : 1 }}
              >
                {submitLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> SUBMITTING...
                  </>
                ) : (
                  <>
                    <Plus size={14} /> SUBMIT APPEAL
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
