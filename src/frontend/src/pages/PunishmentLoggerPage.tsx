import {
  AlertTriangle,
  CheckCircle,
  FileText,
  Gavel,
  Loader2,
  Plus,
  User,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getMaintenanceMode } from "../lib/moderationSettings";
import {
  type LocalPunishmentLog,
  addEnhancedPunishmentLog,
  getOffenseCount,
  getPlayerHistory,
} from "../lib/portalData";
import type { PublicUser } from "../types";
import { Role } from "../types";

// ---- Punishment Matrix (predefined, no custom entries) ----------------------

const PUNISHMENT_MATRIX: Record<string, string[]> = {
  "Hacks/Cheats": ["3d jail", "7d jail", "21d ban", "Perm ban"],
  Scamming: ["1h jail", "8h jail", "1d jail", "3d jail", "7d ban"],
  Griefing: ["30m jail", "1h jail", "3h jail", "8h jail"],
  Advertising: ["8h mute", "1d mute", "3d mute", "7d mute", "14d mute"],
  "Inappropriate builds": ["Perm ban no appeal"],
  "Dox/DDos threats": ["Depending ban"],
  "Dox/DDos": ["Perm ban"],
  "Bug abuse": [
    "1d jail",
    "3d jail",
    "7d jail",
    "14d ban",
    "Perm ban no appeal",
  ],
  "Ban evasion": ["14d ban", "30d ban", "Perm ban no appeal"],
  "Staff impersonation": [
    "Verbal Warn",
    "1d jail",
    "3d jail",
    "7d ban",
    "21d ban",
  ],
  "Not listening to staff": ["1d jail", "3d jail", "7d jail"],
  "NSFW team/name": [
    "Verbal Warning",
    "3d ban",
    "7d ban",
    "1 Month ban",
    "Perm ban",
  ],
  Duping: ["Perm ban"],
  "Illegal items": ["1d jail", "3d jail", "7d jail", "14d jail"],
  "Political discussion": ["15m mute", "1h mute", "3h mute", "8h mute"],
  "Encouraging self harm": [
    "3d mute",
    "7d mute",
    "14d mute",
    "30d mute",
    "Perm mute",
  ],
  "Staff disrespect": [
    "Verbal Warning",
    "15m-30m mute",
    "30m-1h mute",
    "1h-2h mute",
  ],
  Toxicity: ["Verbal Warn", "1h mute", "12h mute", "1d mute", "3d mute"],
  NSFW: ["12h mute", "3d mute", "7d mute", "14d mute", "Perm mute"],
  "Mute evasion": ["7d mute", "14d mute", "30d mute", "Perm mute"],
  "Sexism/Homophobia/Racism": ["3h mute", "8h mute", "1d mute", "7d mute"],
  "Spam in chat": [
    "Verbal Warning",
    "30m mute",
    "1h mute",
    "8h mute",
    "1d mute",
  ],
};

// ---- Shared helpers ---------------------------------------------------------

export function getDurationColor(duration: string): string {
  const lower = duration.toLowerCase();
  if (lower.includes("perm") || lower.includes("ban")) return "#ef4444";
  if (lower.includes("verbal") || lower.includes("warn")) return "#4ade80";
  return "#f59e0b";
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  fontSize: "9px",
  color: "var(--text-muted)",
  letterSpacing: "0.1em",
  display: "block",
  marginBottom: "6px",
};

function onFocusGlow(
  e: React.FocusEvent<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >,
) {
  e.target.style.borderColor = "var(--border-glow)";
  e.target.style.boxShadow = "0 0 8px var(--accent-purple-glow)";
}

function onBlurGlow(
  e: React.FocusEvent<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >,
) {
  e.target.style.borderColor = "var(--border-subtle)";
  e.target.style.boxShadow = "none";
}

// ---- Evidence Lightbox Component --------------------------------------------

interface LightboxProps {
  src: string;
  mimeType: string;
  fileName: string;
  onClose: () => void;
}

export function EvidenceLightbox({
  src,
  mimeType,
  fileName,
  onClose,
}: LightboxProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const isImage = mimeType.startsWith("image/");
  const isVideo = mimeType.startsWith("video/");

  return (
    <div
      data-ocid="evidence_lightbox.modal"
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.9)" }}
    >
      <button
        type="button"
        data-ocid="evidence_lightbox.close_button"
        className="absolute top-4 right-4 flex items-center justify-center rounded-full"
        style={{
          width: "40px",
          height: "40px",
          background: "rgba(124, 58, 237, 0.2)",
          border: "1px solid var(--border-glow)",
          color: "var(--text-primary)",
          cursor: "pointer",
        }}
        onClick={onClose}
      >
        <X size={18} />
      </button>
      <div
        className="flex flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {isImage && (
          <img
            src={src}
            alt={fileName}
            style={{
              maxWidth: "90vw",
              maxHeight: "80vh",
              objectFit: "contain",
              borderRadius: "8px",
              border: "1px solid var(--border-glow)",
            }}
          />
        )}
        {isVideo && (
          <video
            src={src}
            controls
            aria-label="Evidence video lightbox"
            style={{
              maxWidth: "90vw",
              maxHeight: "80vh",
              borderRadius: "8px",
              border: "1px solid var(--border-glow)",
            }}
          >
            <track kind="captions" />
          </video>
        )}
        {!isImage && !isVideo && (
          <div
            className="flex flex-col items-center gap-3"
            style={{ color: "var(--text-primary)" }}
          >
            <FileText size={48} style={{ opacity: 0.5 }} />
            <p style={{ fontSize: "14px" }}>{fileName}</p>
          </div>
        )}
        <p
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            marginTop: "4px",
          }}
        >
          {fileName} — Click outside to close
        </p>
      </div>
    </div>
  );
}

// ---- Per-Category Summary Pill ----------------------------------------------

function CategoryPill({
  category,
  count,
  maxTier,
}: {
  category: string;
  count: number;
  maxTier: number;
}) {
  const isMax = count >= maxTier;
  const isHigh = count > 1;
  let bg = "rgba(148,163,184,0.08)";
  let border = "rgba(148,163,184,0.2)";
  let color = "var(--text-muted)";
  if (isMax) {
    bg = "rgba(239,68,68,0.1)";
    border = "rgba(239,68,68,0.35)";
    color = "#ef4444";
  } else if (isHigh) {
    bg = "rgba(245,158,11,0.1)";
    border = "rgba(245,158,11,0.3)";
    color = "#f59e0b";
  }
  return (
    <span
      className="font-pixel"
      style={{
        fontSize: "9px",
        padding: "3px 8px",
        borderRadius: "4px",
        background: bg,
        border: `1px solid ${border}`,
        color,
        letterSpacing: "0.05em",
        whiteSpace: "nowrap",
      }}
    >
      {category}: {count}x
    </span>
  );
}

// ---- History Entry Row ------------------------------------------------------

function HistoryEntry({
  log,
  onViewEvidence,
}: {
  log: LocalPunishmentLog;
  onViewEvidence: (log: LocalPunishmentLog) => void;
}) {
  const cat = log.category ?? "Unknown";
  const lvl = log.offenseLevel ?? log.offenseNumber ?? 1;
  const dur = log.duration ?? "";
  const durColor = getDurationColor(dur);

  return (
    <div
      style={{
        padding: "12px 14px",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="font-pixel"
            style={{
              fontSize: "9px",
              padding: "2px 7px",
              borderRadius: "3px",
              background: "rgba(124,58,237,0.12)",
              border: "1px solid rgba(124,58,237,0.3)",
              color: "var(--accent-purple-bright)",
            }}
          >
            {cat}
          </span>
          <span
            className="font-pixel"
            style={{
              fontSize: "9px",
              padding: "2px 6px",
              borderRadius: "3px",
              background: "rgba(148,163,184,0.08)",
              border: "1px solid rgba(148,163,184,0.2)",
              color: "var(--text-muted)",
            }}
          >
            Offense #{lvl}
          </span>
          {dur && (
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: durColor,
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              {dur}
            </span>
          )}
        </div>
        {log.proofBase64 && log.proofMimeType?.startsWith("image/") && (
          <button
            type="button"
            data-ocid="history_entry.evidence_thumbnail"
            onClick={() => onViewEvidence(log)}
            style={{
              padding: 0,
              background: "none",
              border: "1px solid var(--border-subtle)",
              borderRadius: "4px",
              cursor: "pointer",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <img
              src={log.proofBase64}
              alt="Evidence"
              style={{
                width: "40px",
                height: "30px",
                objectFit: "cover",
                display: "block",
              }}
            />
          </button>
        )}
      </div>
      <p
        style={{
          fontSize: "11px",
          color: "var(--text-muted)",
          marginTop: "6px",
          lineHeight: 1.5,
        }}
      >
        {log.rnd}
      </p>
      {log.alts && log.alts.length > 0 && (
        <p
          style={{
            fontSize: "10px",
            color: "var(--text-muted)",
            marginTop: "4px",
            opacity: 0.7,
          }}
        >
          Alts: {log.alts.join(", ")}
        </p>
      )}
      <p
        style={{
          fontSize: "10px",
          color: "var(--text-muted)",
          marginTop: "4px",
          opacity: 0.6,
        }}
      >
        {formatTimestamp(log.timestamp)} · {log.submittedBy}
      </p>
    </div>
  );
}

// ---- Main Page Component ----------------------------------------------------

interface PunishmentLoggerPageProps {
  currentUser: PublicUser;
}

export function PunishmentLoggerPage({
  currentUser,
}: PunishmentLoggerPageProps) {
  const [ign, setIgn] = useState("");
  const [category, setCategory] = useState("");
  const [rnd, setRnd] = useState("");
  const [alts, setAlts] = useState<string[]>([""]); // start with 1 empty input
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofBase64, setProofBase64] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [debouncedIgn, setDebouncedIgn] = useState("");
  const [history, setHistory] = useState<LocalPunishmentLog[]>([]);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [lightboxLog, setLightboxLog] = useState<LocalPunishmentLog | null>(
    null,
  );

  const [maintenanceMode, setMaintenanceModeState] = useState(
    getMaintenanceMode(),
  );
  const [durationOverride, setDurationOverride] = useState<string | null>(null);
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setMaintenanceModeState(getMaintenanceMode());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Derived
  const validAlts = alts.filter((a) => a.trim().length > 0);
  const offenseCount =
    ign.trim() && category
      ? getOffenseCount(ign.trim(), category, validAlts)
      : -1;
  const offenseLevel = offenseCount >= 0 ? offenseCount + 1 : null;
  const tiers = category ? (PUNISHMENT_MATRIX[category] ?? []) : [];
  const autoDuration =
    offenseLevel !== null && tiers.length > 0
      ? (tiers[offenseLevel - 1] ?? "Max tier exceeded — escalate manually")
      : null;

  const isMaxTier =
    offenseLevel !== null && tiers.length > 0 && offenseLevel > tiers.length;
  const offenseLevelColor =
    offenseLevel === null
      ? "var(--text-muted)"
      : isMaxTier
        ? "#ef4444"
        : offenseLevel > 1
          ? "#f59e0b"
          : "var(--text-primary)";

  const durationColor = autoDuration
    ? getDurationColor(autoDuration)
    : "var(--text-muted)";

  const handleIgnChange = useCallback((value: string) => {
    setIgn(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedIgn(value.trim());
    }, 500);
  }, []);

  useEffect(() => {
    if (debouncedIgn) {
      setHistory(getPlayerHistory(debouncedIgn, validAlts));
    } else {
      setHistory([]);
    }
  }, [debouncedIgn, validAlts]);

  const handleAltsChange = useCallback(
    (newAlts: string[]) => {
      setAlts(newAlts);
      if (debouncedIgn) {
        const freshAlts = newAlts.filter((a) => a.trim().length > 0);
        setHistory(getPlayerHistory(debouncedIgn, freshAlts));
      }
    },
    [debouncedIgn],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setProofBase64(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearFile = () => {
    setProofFile(null);
    setProofBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Per-category summary
  const categorySummary: Record<string, number> = {};
  for (const log of history) {
    const cat = log.category ?? "Unknown";
    categorySummary[cat] = (categorySummary[cat] ?? 0) + 1;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofFile) {
      setSubmitError("Proof file is required.");
      return;
    }
    setSubmitLoading(true);
    setSubmitError("");
    setSubmitSuccess(false);
    try {
      const finalOffenseLevel = offenseLevel ?? 1;
      const finalDuration = effectiveDuration || autoDuration || "";
      addEnhancedPunishmentLog({
        ign: ign.trim(),
        rnd,
        offenseNumber: finalOffenseLevel,
        proof: proofFile.name,
        submittedBy: currentUser.username,
        category,
        offenseLevel: finalOffenseLevel,
        duration: finalDuration,
        alts: validAlts,
        proofBase64: proofBase64 ?? undefined,
        proofFileName: proofFile.name,
        proofMimeType: proofFile.type,
      });
      setSubmitSuccess(true);
      setIgn("");
      setCategory("");
      setRnd("");
      setAlts([""]);
      clearFile();
      setDebouncedIgn("");
      setHistory([]);
      setTimeout(() => setSubmitSuccess(false), 6000);
    } catch {
      setSubmitError("Failed to save log. Please try again.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const isOwner = currentUser.role === Role.Owner;
  const isCoOwner = currentUser.role === Role.CoOwner;
  const isMaintenanceBlocked = maintenanceMode && !isOwner;
  const effectiveDuration =
    durationOverride !== null ? durationOverride : (autoDuration ?? "");
  const canSubmit =
    ign.trim().length > 0 &&
    category.length > 0 &&
    proofFile !== null &&
    !isMaintenanceBlocked;

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
          <Gavel size={20} style={{ color: "var(--accent-purple-bright)" }} />
        </div>
        <div>
          <h1 className="page-header">PUNISHMENT LOGGER</h1>
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              marginTop: "2px",
            }}
          >
            Issue and track player punishments with full offense history
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div
        className="grid gap-6"
        style={{ gridTemplateColumns: "minmax(0,1.1fr) minmax(0,0.9fr)" }}
      >
        {/* ============ LEFT: PUNISHMENT FORM ============ */}
        <div>
          <div
            className="disclaimer-banner mb-5 flex items-center gap-2"
            data-ocid="punishment_logger.disclaimer"
          >
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />⚠ LOG HERE OR
            THE PLAYER REMAINS UNPUNISHED.
          </div>

          <div
            className="neon-card"
            data-ocid="punishment_logger.form"
            style={{ padding: "28px 32px" }}
          >
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* IGN */}
              <div>
                <label
                  htmlFor="pl-ign"
                  className="font-pixel"
                  style={labelStyle}
                >
                  IGN — PLAYER IN-GAME NAME
                </label>
                <input
                  id="pl-ign"
                  data-ocid="punishment_logger.ign_input"
                  type="text"
                  value={ign}
                  onChange={(e) => handleIgnChange(e.target.value)}
                  placeholder="e.g. BloomCPVP"
                  required
                  style={inputStyle}
                  onFocus={onFocusGlow}
                  onBlur={onBlurGlow}
                />
              </div>

              {/* CATEGORY */}
              <div>
                <label
                  htmlFor="pl-category"
                  className="font-pixel"
                  style={labelStyle}
                >
                  CATEGORY — OFFENSE TYPE
                </label>
                <select
                  id="pl-category"
                  data-ocid="punishment_logger.category_select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  style={{ ...inputStyle, cursor: "pointer" }}
                  onFocus={onFocusGlow}
                  onBlur={onBlurGlow}
                >
                  <option
                    value=""
                    disabled
                    style={{ background: "var(--bg-deep)" }}
                  >
                    — Select Category —
                  </option>
                  {Object.keys(PUNISHMENT_MATRIX).map((cat) => (
                    <option
                      key={cat}
                      value={cat}
                      style={{ background: "var(--bg-deep)" }}
                    >
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* AUTO OFFENSE LEVEL */}
              <div>
                <p className="font-pixel" style={labelStyle}>
                  AUTO OFFENSE LEVEL
                </p>
                <div
                  data-ocid="punishment_logger.offense_level_display"
                  style={{
                    padding: "10px 14px",
                    background: "var(--bg-deep)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "6px",
                    fontSize: "15px",
                    fontWeight: 700,
                    color: offenseLevelColor,
                    fontFamily: '"JetBrains Mono", monospace',
                  }}
                >
                  {offenseLevel === null ? (
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 400,
                        color: "var(--text-muted)",
                      }}
                    >
                      Select IGN and Category first
                    </span>
                  ) : isMaxTier ? (
                    <span>
                      Offense #{offenseLevel}{" "}
                      <span style={{ fontSize: "10px", color: "#ef4444" }}>
                        (MAX TIER EXCEEDED)
                      </span>
                    </span>
                  ) : (
                    `Offense #${offenseLevel}`
                  )}
                </div>
              </div>

              {/* AUTO DURATION — role-aware */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="font-pixel" style={labelStyle}>
                    AUTO DURATION
                    {isOwner && (
                      <span
                        style={{
                          fontSize: "8px",
                          color: "var(--text-muted)",
                          marginLeft: "6px",
                          fontWeight: 400,
                        }}
                      >
                        (Override)
                      </span>
                    )}
                  </p>
                  {isCoOwner && autoDuration && durationOverride === null && (
                    <button
                      type="button"
                      data-ocid="punishment_logger.override_button"
                      onClick={() => setShowOverrideConfirm(true)}
                      style={{
                        fontSize: "9px",
                        fontFamily: '"JetBrains Mono", monospace',
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        padding: "3px 10px",
                        background: "rgba(245,158,11,0.1)",
                        border: "1px solid rgba(245,158,11,0.4)",
                        borderRadius: "4px",
                        color: "#f59e0b",
                        cursor: "pointer",
                      }}
                    >
                      OVERRIDE
                    </button>
                  )}
                  {(isCoOwner || isOwner) && durationOverride !== null && (
                    <button
                      type="button"
                      onClick={() => setDurationOverride(null)}
                      style={{
                        fontSize: "9px",
                        fontFamily: '"JetBrains Mono", monospace',
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        padding: "3px 10px",
                        background: "rgba(148,163,184,0.08)",
                        border: "1px solid rgba(148,163,184,0.2)",
                        borderRadius: "4px",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                      }}
                    >
                      RESET
                    </button>
                  )}
                </div>

                {/* Owner: always editable input */}
                {isOwner ? (
                  <input
                    type="text"
                    data-ocid="punishment_logger.duration_display"
                    value={
                      durationOverride !== null
                        ? durationOverride
                        : (autoDuration ?? "")
                    }
                    onChange={(e) => setDurationOverride(e.target.value)}
                    placeholder="e.g. 3d jail"
                    style={{
                      ...inputStyle,
                      fontSize: "18px",
                      fontWeight: 800,
                      color: effectiveDuration
                        ? getDurationColor(effectiveDuration)
                        : "var(--text-muted)",
                      fontFamily: '"JetBrains Mono", monospace',
                      letterSpacing: "0.04em",
                      border: `1px solid ${effectiveDuration ? `${getDurationColor(effectiveDuration)}55` : "var(--border-subtle)"}`,
                      boxShadow: effectiveDuration
                        ? `0 0 12px ${getDurationColor(effectiveDuration)}22`
                        : "none",
                    }}
                    onFocus={onFocusGlow}
                    onBlur={onBlurGlow}
                  />
                ) : isCoOwner && durationOverride !== null ? (
                  /* Co-Owner after override confirmed: editable */
                  <input
                    type="text"
                    data-ocid="punishment_logger.duration_display"
                    value={durationOverride}
                    onChange={(e) => setDurationOverride(e.target.value)}
                    placeholder="e.g. 3d jail"
                    style={{
                      ...inputStyle,
                      fontSize: "18px",
                      fontWeight: 800,
                      color: durationOverride
                        ? getDurationColor(durationOverride)
                        : "var(--text-muted)",
                      fontFamily: '"JetBrains Mono", monospace',
                      letterSpacing: "0.04em",
                      border: "1px solid rgba(245,158,11,0.5)",
                      boxShadow: "0 0 8px rgba(245,158,11,0.15)",
                    }}
                    onFocus={onFocusGlow}
                    onBlur={onBlurGlow}
                  />
                ) : (
                  /* Staff/Builder (and Co-Owner before override): read-only display */
                  <div
                    data-ocid="punishment_logger.duration_display"
                    style={{
                      padding: "12px 16px",
                      background: "var(--bg-deep)",
                      border: `1px solid ${autoDuration ? `${durationColor}55` : "var(--border-subtle)"}`,
                      borderRadius: "6px",
                      fontSize: "22px",
                      fontWeight: 800,
                      color: autoDuration ? durationColor : "var(--text-muted)",
                      fontFamily: '"JetBrains Mono", monospace',
                      letterSpacing: "0.04em",
                      boxShadow: autoDuration
                        ? `0 0 12px ${durationColor}22`
                        : "none",
                      transition: "all 0.2s",
                    }}
                  >
                    {autoDuration ?? (
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 400,
                          color: "var(--text-muted)",
                        }}
                      >
                        Awaiting category + IGN
                      </span>
                    )}
                  </div>
                )}

                {/* Co-Owner override confirm dialog */}
                {showOverrideConfirm && (
                  <div
                    className="fixed inset-0 flex items-center justify-center z-50"
                    style={{ background: "rgba(0,0,0,0.75)" }}
                  >
                    <div
                      data-ocid="punishment_logger.override_dialog"
                      className="neon-card"
                      style={{
                        padding: "32px",
                        width: "400px",
                        maxWidth: "90vw",
                      }}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <AlertTriangle
                          size={20}
                          style={{ color: "#f59e0b", flexShrink: 0 }}
                        />
                        <h3
                          className="font-pixel"
                          style={{
                            fontSize: "10px",
                            color: "#f59e0b",
                            letterSpacing: "0.08em",
                          }}
                        >
                          OVERRIDE AUTO-PUNISHMENT?
                        </h3>
                      </div>
                      <p
                        style={{
                          fontSize: "13px",
                          color: "var(--text-muted)",
                          lineHeight: 1.7,
                          marginBottom: "20px",
                        }}
                      >
                        Are you sure you want to override the auto-calculated
                        punishment? This action will be noted.
                      </p>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          data-ocid="punishment_logger.override_dialog.cancel_button"
                          onClick={() => setShowOverrideConfirm(false)}
                          style={{
                            flex: 1,
                            padding: "10px",
                            background: "rgba(148,163,184,0.08)",
                            border: "1px solid rgba(148,163,184,0.2)",
                            borderRadius: "6px",
                            color: "var(--text-muted)",
                            fontSize: "10px",
                            fontFamily: '"JetBrains Mono", monospace',
                            fontWeight: 700,
                            cursor: "pointer",
                            letterSpacing: "0.06em",
                          }}
                        >
                          CANCEL
                        </button>
                        <button
                          type="button"
                          data-ocid="punishment_logger.override_dialog.confirm_button"
                          onClick={() => {
                            setDurationOverride(autoDuration ?? "");
                            setShowOverrideConfirm(false);
                          }}
                          style={{
                            flex: 1,
                            padding: "10px",
                            background: "rgba(245,158,11,0.12)",
                            border: "1px solid rgba(245,158,11,0.4)",
                            borderRadius: "6px",
                            color: "#f59e0b",
                            fontSize: "10px",
                            fontFamily: '"JetBrains Mono", monospace',
                            fontWeight: 700,
                            cursor: "pointer",
                            letterSpacing: "0.06em",
                          }}
                        >
                          CONFIRM OVERRIDE
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* R&D */}
              <div>
                <label
                  htmlFor="pl-rnd"
                  className="font-pixel"
                  style={labelStyle}
                >
                  REASON &amp; DATE / NOTES
                </label>
                <textarea
                  id="pl-rnd"
                  data-ocid="punishment_logger.rnd_textarea"
                  value={rnd}
                  onChange={(e) => setRnd(e.target.value)}
                  required
                  rows={4}
                  placeholder="e.g. Was using kill aura, multiple witnesses observed. Banned 2d jail effective 27/03/2026"
                  style={{ ...inputStyle, resize: "vertical" }}
                  onFocus={onFocusGlow}
                  onBlur={onBlurGlow}
                />
              </div>

              {/* POSSIBLE ALTS */}
              <div>
                <p className="font-pixel" style={labelStyle}>
                  LINKED ALT ACCOUNTS (influences offense count)
                </p>
                <div className="flex flex-col gap-2">
                  {alts.map((alt, idx) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: alts list does not support reordering
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        data-ocid={
                          idx === 0 ? "punishment_logger.alts_input" : undefined
                        }
                        value={alt}
                        onChange={(e) => {
                          const next = [...alts];
                          next[idx] = e.target.value;
                          handleAltsChange(next);
                        }}
                        placeholder={`Alt account #${idx + 1}`}
                        style={{ ...inputStyle, flex: 1 }}
                        onFocus={onFocusGlow}
                        onBlur={onBlurGlow}
                      />
                      {alts.length > 1 && (
                        <button
                          type="button"
                          data-ocid={`punishment_logger.remove_alt_button.${idx + 1}`}
                          onClick={() => {
                            const next = alts.filter((_, i) => i !== idx);
                            handleAltsChange(next);
                          }}
                          style={{
                            padding: "0 10px",
                            background: "rgba(239,68,68,0.08)",
                            border: "1px solid rgba(239,68,68,0.3)",
                            borderRadius: "6px",
                            color: "#ef4444",
                            cursor: "pointer",
                            flexShrink: 0,
                          }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    data-ocid="punishment_logger.add_alt_button"
                    onClick={() => handleAltsChange([...alts, ""])}
                    className="flex items-center gap-2"
                    style={{
                      padding: "7px 14px",
                      background: "rgba(124,58,237,0.08)",
                      border: "1px dashed rgba(124,58,237,0.3)",
                      borderRadius: "6px",
                      color: "var(--accent-purple-bright)",
                      fontSize: "10px",
                      fontFamily: '"JetBrains Mono", monospace',
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      cursor: "pointer",
                      alignSelf: "flex-start",
                    }}
                  >
                    <Plus size={12} />+ ADD ALT
                  </button>
                </div>
              </div>

              {/* PROOF (required file upload) */}
              <div>
                <p className="font-pixel" style={labelStyle}>
                  PROOF / EVIDENCE{" "}
                  <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>
                </p>
                {!proofFile ? (
                  <label
                    htmlFor="pl-proof-file"
                    data-ocid="punishment_logger.proof_dropzone"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      padding: "24px",
                      background: "var(--bg-deep)",
                      border: "1px dashed var(--border-subtle)",
                      borderRadius: "6px",
                      cursor: "pointer",
                      transition: "border-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "var(--border-glow)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "var(--border-subtle)";
                    }}
                  >
                    <FileText
                      size={24}
                      style={{ color: "var(--text-muted)", opacity: 0.5 }}
                    />
                    <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      Click to upload proof (images, video, PDF)
                    </p>
                    <p
                      style={{
                        fontSize: "10px",
                        color: "var(--text-muted)",
                        opacity: 0.6,
                      }}
                    >
                      image/*, video/mp4, video/webm, .pdf
                    </p>
                    <input
                      id="pl-proof-file"
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/mp4,video/webm,.pdf"
                      onChange={handleFileChange}
                      style={{ display: "none" }}
                      data-ocid="punishment_logger.proof_upload_button"
                    />
                  </label>
                ) : (
                  <div
                    style={{
                      background: "var(--bg-deep)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "6px",
                      overflow: "hidden",
                    }}
                  >
                    {proofBase64 && proofFile.type.startsWith("image/") && (
                      <div style={{ padding: "8px", textAlign: "center" }}>
                        <img
                          src={proofBase64}
                          alt="Evidence preview"
                          style={{
                            maxHeight: "200px",
                            maxWidth: "100%",
                            objectFit: "contain",
                            borderRadius: "4px",
                          }}
                        />
                      </div>
                    )}
                    {proofBase64 && proofFile.type.startsWith("video/") && (
                      <div style={{ padding: "8px" }}>
                        <video
                          src={proofBase64}
                          controls
                          aria-label="Evidence video preview"
                          style={{
                            maxHeight: "200px",
                            width: "100%",
                            borderRadius: "4px",
                          }}
                        >
                          <track kind="captions" />
                        </video>
                      </div>
                    )}
                    {!proofFile.type.startsWith("image/") &&
                      !proofFile.type.startsWith("video/") && (
                        <div
                          className="flex items-center gap-3"
                          style={{ padding: "14px" }}
                        >
                          <FileText
                            size={28}
                            style={{
                              color: "var(--text-muted)",
                              opacity: 0.5,
                              flexShrink: 0,
                            }}
                          />
                          <p
                            style={{
                              fontSize: "12px",
                              color: "var(--text-muted)",
                            }}
                          >
                            {proofFile.name}
                          </p>
                        </div>
                      )}
                    <div
                      className="flex items-center justify-between"
                      style={{
                        padding: "8px 12px",
                        borderTop: "1px solid var(--border-subtle)",
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <p
                          style={{
                            fontSize: "11px",
                            color: "var(--text-muted)",
                          }}
                        >
                          {proofFile.name}
                        </p>
                        <span
                          style={{
                            fontSize: "10px",
                            color:
                              proofFile.size > 3 * 1024 * 1024
                                ? "#f59e0b"
                                : "var(--text-muted)",
                            opacity: 0.8,
                          }}
                        >
                          {formatFileSize(proofFile.size)}
                          {proofFile.size > 3 * 1024 * 1024 &&
                            " — Large file, may slow loading"}
                        </span>
                      </div>
                      <button
                        type="button"
                        data-ocid="punishment_logger.change_file_button"
                        onClick={clearFile}
                        style={{
                          fontSize: "10px",
                          fontFamily: '"JetBrains Mono", monospace',
                          fontWeight: 700,
                          color: "var(--accent-purple-bright)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          letterSpacing: "0.06em",
                        }}
                      >
                        CHANGE FILE
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Status messages */}
              {submitSuccess && (
                <div
                  data-ocid="punishment_logger.success_state"
                  className="flex items-center gap-2 rounded-md py-3 px-4"
                  style={{
                    background: "rgba(74,222,128,0.1)",
                    border: "1px solid rgba(74,222,128,0.4)",
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
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.4)",
                    color: "#ef4444",
                    fontSize: "12px",
                  }}
                >
                  <XCircle size={14} />
                  {submitError}
                </div>
              )}

              {/* Maintenance Mode Block */}
              {isMaintenanceBlocked && (
                <div
                  data-ocid="punishment_logger.maintenance_block"
                  className="flex items-center gap-2 rounded-md py-3 px-4"
                  style={{
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.4)",
                    color: "#ef4444",
                    fontSize: "12px",
                  }}
                >
                  <AlertTriangle size={14} />
                  System is in maintenance mode. Only the Owner can submit
                  punishments.
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                data-ocid="punishment_logger.submit_button"
                disabled={!canSubmit || submitLoading}
                className="btn-neon flex items-center justify-center gap-2 py-3 rounded-md"
                style={{
                  fontSize: "11px",
                  opacity: !canSubmit || submitLoading ? 0.55 : 1,
                  cursor:
                    !canSubmit || submitLoading ? "not-allowed" : "pointer",
                }}
              >
                {submitLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    LOGGING...
                  </>
                ) : (
                  <>
                    <Gavel size={14} />
                    LOG PUNISHMENT
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* ============ RIGHT: PLAYER HISTORY PANEL ============ */}
        <div>
          <div
            className="neon-card"
            data-ocid="punishment_logger.history_panel"
            style={{
              padding: "0",
              overflow: "hidden",
              position: "sticky",
              top: "24px",
            }}
          >
            {/* Panel header */}
            <div
              className="flex items-center gap-3"
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--border-subtle)",
                background:
                  "linear-gradient(90deg, rgba(124,58,237,0.08) 0%, transparent 100%)",
              }}
            >
              {debouncedIgn ? (
                <img
                  src={`https://mc-heads.net/avatar/${debouncedIgn}/32`}
                  alt={debouncedIgn}
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "4px",
                    border: "1px solid var(--border-subtle)",
                    imageRendering: "pixelated",
                    flexShrink: 0,
                  }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display =
                      "none";
                  }}
                />
              ) : (
                <div
                  className="flex items-center justify-center rounded"
                  style={{
                    width: "28px",
                    height: "28px",
                    background: "rgba(124,58,237,0.15)",
                    border: "1px solid var(--border-subtle)",
                    flexShrink: 0,
                  }}
                >
                  <User size={14} style={{ color: "var(--text-muted)" }} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p
                  className="font-pixel"
                  style={{
                    fontSize: "9px",
                    color: "var(--text-muted)",
                    letterSpacing: "0.1em",
                  }}
                >
                  PLAYER HISTORY
                </p>
                {debouncedIgn && (
                  <p
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {debouncedIgn}
                  </p>
                )}
              </div>
              {history.length > 0 && (
                <span
                  className="font-pixel"
                  style={{
                    fontSize: "9px",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    color: "#ef4444",
                    flexShrink: 0,
                  }}
                >
                  {history.length} LOG{history.length !== 1 ? "S" : ""}
                </span>
              )}
            </div>

            {/* Content */}
            {!debouncedIgn ? (
              <div
                data-ocid="punishment_logger.history_empty_state"
                className="flex flex-col items-center justify-center py-16 px-6 text-center"
              >
                <User
                  size={32}
                  style={{ opacity: 0.15, marginBottom: "12px" }}
                />
                <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  Enter a player IGN to load history
                </p>
              </div>
            ) : history.length === 0 ? (
              <div
                data-ocid="punishment_logger.history_no_records"
                className="flex flex-col items-center justify-center py-16 px-6 text-center"
              >
                <CheckCircle
                  size={28}
                  style={{
                    color: "#4ade80",
                    opacity: 0.4,
                    marginBottom: "10px",
                  }}
                />
                <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  No prior punishments found for{" "}
                  <strong style={{ color: "var(--text-primary)" }}>
                    {debouncedIgn}
                  </strong>
                </p>
              </div>
            ) : (
              <div>
                {/* Per-category summary */}
                {Object.keys(categorySummary).length > 0 && (
                  <div
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid var(--border-subtle)",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "6px",
                    }}
                  >
                    {Object.entries(categorySummary).map(([cat, count]) => (
                      <CategoryPill
                        key={cat}
                        category={cat}
                        count={count}
                        maxTier={PUNISHMENT_MATRIX[cat]?.length ?? 1}
                      />
                    ))}
                  </div>
                )}
                {/* Timeline */}
                <div
                  style={{ maxHeight: "480px", overflowY: "auto" }}
                  data-ocid="punishment_logger.history_list"
                >
                  {history.map((log, idx) => (
                    <div
                      key={log.id}
                      data-ocid={
                        idx < 3
                          ? `punishment_logger.history_item.${idx + 1}`
                          : undefined
                      }
                    >
                      <HistoryEntry
                        log={log}
                        onViewEvidence={(l) => setLightboxLog(l)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Evidence Lightbox */}
      {lightboxLog?.proofBase64 && (
        <EvidenceLightbox
          src={lightboxLog.proofBase64}
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
