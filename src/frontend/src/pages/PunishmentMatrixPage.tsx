import { Gavel, Pencil, Search, Trash2, XCircle } from "lucide-react";
import { useState } from "react";
import type { PublicUser } from "../backend.d";
import { addAuditEntry } from "../lib/punishmentAudit";

interface PunishmentEntry {
  id: string;
  reason: string;
  notes: string;
  o1: string;
  o2: string;
  o3: string;
  o4: string;
  o5: string;
}

const DEFAULT_PUNISHMENT_DATA: PunishmentEntry[] = [
  {
    id: "hacks",
    reason: "Hacks/Cheats",
    notes: "-",
    o1: "3d jail",
    o2: "7d jail",
    o3: "21d ban",
    o4: "Perm ban",
    o5: "-",
  },
  {
    id: "scamming",
    reason: "Scamming",
    notes: "Severity matches prior offense if items returned",
    o1: "1h jail",
    o2: "8h jail",
    o3: "1d jail",
    o4: "3d jail",
    o5: "7d ban",
  },
  {
    id: "griefing",
    reason: "Griefing/killing active builders",
    notes: "If someone says they want to build, killing them = griefing",
    o1: "30m jail",
    o2: "1h jail",
    o3: "3h jail",
    o4: "8h jail",
    o5: "-",
  },
  {
    id: "advertising",
    reason: "Advertising",
    notes: "-",
    o1: "8h mute",
    o2: "1d mute",
    o3: "3d mute",
    o4: "7d mute",
    o5: "14d mute",
  },
  {
    id: "inappropriate-builds",
    reason: "Inappropriate builds",
    notes:
      "WW2 german symbol = perm ban no appeal; extremely sexually inappropriate builds = perm ban no appeal",
    o1: "Perm ban no appeal",
    o2: "-",
    o3: "-",
    o4: "-",
    o5: "-",
  },
  {
    id: "dox-threats",
    reason: "Dox/DDos threats",
    notes: "-",
    o1: "depending ban",
    o2: "-",
    o3: "-",
    o4: "-",
    o5: "-",
  },
  {
    id: "dox",
    reason: "Dox/DDos",
    notes: "Appeal only if not really doxing but making up information",
    o1: "Perm Ban",
    o2: "-",
    o3: "-",
    o4: "-",
    o5: "-",
  },
  {
    id: "bug-abuse",
    reason: "Bug abuse",
    notes:
      "No punishment for 1st offense if they found a bug and cooperate with staff",
    o1: "1d jail",
    o2: "3d jail",
    o3: "7d jail",
    o4: "14d ban",
    o5: "Perm ban no appeal",
  },
  {
    id: "ban-evasion",
    reason: "Ban evasion",
    notes: "-",
    o1: "14d ban",
    o2: "30d ban",
    o3: "Perm ban no appeal",
    o4: "-",
    o5: "-",
  },
  {
    id: "staff-impersonation",
    reason: "Staff impersonation",
    notes: "-",
    o1: "Verbal Warn",
    o2: "1d jail",
    o3: "3d jail",
    o4: "7d ban",
    o5: "21d ban",
  },
  {
    id: "not-listening",
    reason: "Not listening to staff orders",
    notes: "-",
    o1: "1d jail",
    o2: "3d jail",
    o3: "7d jail",
    o4: "-",
    o5: "-",
  },
  {
    id: "nsfw-name",
    reason: "NSFW team/name",
    notes: "-",
    o1: "Verbal Warning",
    o2: "3d ban",
    o3: "7d ban",
    o4: "1 Month ban",
    o5: "Perm ban",
  },
  {
    id: "duping",
    reason: "Duping",
    notes: "If they cooperate to fix it and return items they can appeal",
    o1: "Perm ban",
    o2: "-",
    o3: "-",
    o4: "-",
    o5: "-",
  },
  {
    id: "illegal-items",
    reason: "Illegal items",
    notes: "If they come clean no punishment",
    o1: "1d jail",
    o2: "3d jail",
    o3: "7d jail",
    o4: "14d jail",
    o5: "-",
  },
  {
    id: "political",
    reason: "Political discussion",
    notes: "-",
    o1: "15m mute",
    o2: "1h mute",
    o3: "3h mute",
    o4: "8h mute",
    o5: "-",
  },
  {
    id: "self-harm",
    reason: "Encouraging self harm",
    notes: "-",
    o1: "3d mute",
    o2: "7d mute",
    o3: "14d mute",
    o4: "30d mute",
    o5: "Perm mute",
  },
  {
    id: "staff-disrespect",
    reason: "Staff disrespect",
    notes: "Staff will not comment or enforce",
    o1: "Verbal Warning",
    o2: "15m-30m mute",
    o3: "30m-1h mute",
    o4: "1h-2h mute",
    o5: "-",
  },
  {
    id: "toxicity",
    reason: "Toxicity",
    notes: "-",
    o1: "Verbal Warning",
    o2: "1h mute",
    o3: "12h mute",
    o4: "1d mute",
    o5: "3d mute",
  },
  {
    id: "nsfw",
    reason: "NSFW",
    notes: "-",
    o1: "12h mute",
    o2: "3d mute",
    o3: "7d mute",
    o4: "14d mute",
    o5: "Perm mute",
  },
  {
    id: "mute-evasion",
    reason: "Mute evasion",
    notes: "-",
    o1: "7d mute",
    o2: "14d mute",
    o3: "30d mute",
    o4: "Perm mute",
    o5: "-",
  },
  {
    id: "sexism",
    reason: "Sexism/Homophobia/Racism",
    notes: "-",
    o1: "3h mute",
    o2: "8h mute",
    o3: "1d mute",
    o4: "7d mute",
    o5: "-",
  },
  {
    id: "spam",
    reason: "Spam in chat",
    notes: "-",
    o1: "Verbal Warning",
    o2: "30m mute",
    o3: "1h mute",
    o4: "8h mute",
    o5: "1d mute",
  },
];

const STORAGE_KEY = "lbs_punishment_data";

function loadData(): PunishmentEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PunishmentEntry[];
  } catch {
    // ignore
  }
  return DEFAULT_PUNISHMENT_DATA;
}

function saveData(data: PunishmentEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function isPermanent(text: string): boolean {
  return text.toLowerCase().includes("perm");
}

function PunishmentCell({ value }: { value: string }) {
  if (value === "-") {
    return <span style={{ color: "var(--text-muted)", opacity: 0.4 }}>—</span>;
  }
  if (isPermanent(value)) {
    return <span className="perm-ban-cell">{value}</span>;
  }
  return <span>{value}</span>;
}

interface EditFormState {
  reason: string;
  notes: string;
  o1: string;
  o2: string;
  o3: string;
  o4: string;
  o5: string;
}

interface PunishmentMatrixPageProps {
  currentUser: PublicUser;
}

export function PunishmentMatrixPage({
  currentUser,
}: PunishmentMatrixPageProps) {
  const [search, setSearch] = useState("");
  const [data, setData] = useState<PunishmentEntry[]>(loadData);

  // Edit dialog
  const [editingEntry, setEditingEntry] = useState<PunishmentEntry | null>(
    null,
  );
  const [editForm, setEditForm] = useState<EditFormState | null>(null);

  // Delete confirm
  const [deletingEntry, setDeletingEntry] = useState<PunishmentEntry | null>(
    null,
  );

  const filtered = data.filter(
    (entry) =>
      entry.reason.toLowerCase().includes(search.toLowerCase()) ||
      entry.notes.toLowerCase().includes(search.toLowerCase()),
  );

  const openEdit = (entry: PunishmentEntry) => {
    setEditingEntry(entry);
    setEditForm({
      reason: entry.reason,
      notes: entry.notes,
      o1: entry.o1,
      o2: entry.o2,
      o3: entry.o3,
      o4: entry.o4,
      o5: entry.o5,
    });
  };

  const handleEditSave = () => {
    if (!editingEntry || !editForm) return;
    const before = editingEntry;
    const updated = data.map((e) =>
      e.id === editingEntry.id ? { ...e, ...editForm } : e,
    );
    setData(updated);
    saveData(updated);
    addAuditEntry({
      action: "edit",
      ruleId: before.id,
      ruleName: before.reason,
      performedBy: currentUser.username,
      details: `Rule "${before.reason}" was modified`,
    });
    setEditingEntry(null);
    setEditForm(null);
  };

  const handleDelete = () => {
    if (!deletingEntry) return;
    const updated = data.filter((e) => e.id !== deletingEntry.id);
    setData(updated);
    saveData(updated);
    addAuditEntry({
      action: "delete",
      ruleId: deletingEntry.id,
      ruleName: deletingEntry.reason,
      performedBy: currentUser.username,
      details: `Rule "${deletingEntry.reason}" was deleted`,
    });
    setDeletingEntry(null);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    background: "var(--bg-deep)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "6px",
    color: "var(--text-primary)",
    fontSize: "13px",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };

  const handleFocusStyle = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    e.target.style.borderColor = "var(--border-glow)";
    e.target.style.boxShadow = "0 0 8px var(--accent-purple-glow)";
  };
  const handleBlurStyle = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
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
          <Gavel size={20} style={{ color: "var(--accent-purple-bright)" }} />
        </div>
        <div>
          <h1 className="page-header">PUNISHMENT MATRIX</h1>
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              marginTop: "2px",
            }}
          >
            Official punishment guidelines for Lucky Block Survival
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6" style={{ maxWidth: "400px" }}>
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--text-muted)" }}
        />
        <input
          data-ocid="punishment_matrix.search_input"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search offenses... (e.g. Hacks)"
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

      {/* Legend */}
      <div className="flex items-center gap-4 mb-5">
        <div className="flex items-center gap-2">
          <span className="perm-ban-cell" style={{ fontSize: "10px" }}>
            Perm ban
          </span>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            = Permanent punishment
          </span>
        </div>
        {search && (
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            Showing {filtered.length} of {data.length} rules
          </span>
        )}
      </div>

      {/* Table */}
      <div
        className="neon-border rounded-lg overflow-hidden"
        style={{ background: "var(--bg-surface)" }}
      >
        <div className="overflow-x-auto">
          <table
            data-ocid="punishment_matrix.table"
            className="staff-table"
            style={{ minWidth: "980px" }}
          >
            <thead>
              <tr>
                <th style={{ minWidth: "180px" }}>REASON</th>
                <th style={{ minWidth: "220px" }}>NOTES</th>
                <th style={{ minWidth: "100px" }}>OFFENCE 1</th>
                <th style={{ minWidth: "100px" }}>OFFENCE 2</th>
                <th style={{ minWidth: "100px" }}>OFFENCE 3</th>
                <th style={{ minWidth: "100px" }}>OFFENCE 4</th>
                <th style={{ minWidth: "100px" }}>OFFENCE 5</th>
                <th style={{ minWidth: "80px" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-12"
                    style={{ color: "var(--text-muted)", fontSize: "12px" }}
                  >
                    No offenses found matching "{search}"
                  </td>
                </tr>
              ) : (
                filtered.map((entry, _idx) => {
                  const originalIdx = data.indexOf(entry) + 1;
                  return (
                    <tr
                      key={entry.id}
                      data-ocid={`punishment_matrix.row.${originalIdx}`}
                    >
                      <td
                        style={{
                          fontWeight: 700,
                          color: "var(--text-primary)",
                        }}
                      >
                        {entry.reason}
                      </td>
                      <td
                        style={{ fontSize: "12px", color: "var(--text-muted)" }}
                      >
                        {entry.notes === "-" ? (
                          <span style={{ opacity: 0.4 }}>—</span>
                        ) : (
                          entry.notes
                        )}
                      </td>
                      <td>
                        <PunishmentCell value={entry.o1} />
                      </td>
                      <td>
                        <PunishmentCell value={entry.o2} />
                      </td>
                      <td>
                        <PunishmentCell value={entry.o3} />
                      </td>
                      <td>
                        <PunishmentCell value={entry.o4} />
                      </td>
                      <td>
                        <PunishmentCell value={entry.o5} />
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            data-ocid={`punishment_matrix.edit_button.${originalIdx}`}
                            onClick={() => openEdit(entry)}
                            title="Edit rule"
                            style={{
                              background: "rgba(124, 58, 237, 0.12)",
                              border: "1px solid rgba(124, 58, 237, 0.3)",
                              borderRadius: "4px",
                              padding: "4px 7px",
                              cursor: "pointer",
                              color: "var(--accent-purple-bright)",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            data-ocid={`punishment_matrix.delete_button.${originalIdx}`}
                            onClick={() => setDeletingEntry(entry)}
                            title="Delete rule"
                            style={{
                              background: "rgba(239, 68, 68, 0.1)",
                              border: "1px solid rgba(239, 68, 68, 0.3)",
                              borderRadius: "4px",
                              padding: "4px 7px",
                              cursor: "pointer",
                              color: "#ef4444",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p
        className="mt-4"
        style={{ fontSize: "11px", color: "var(--text-muted)" }}
      >
        {data.length} total offense categories • All edits and deletions are
        recorded in the audit log
      </p>

      {/* =================== EDIT DIALOG =================== */}
      {editingEntry && editForm && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0, 0, 0, 0.8)" }}
        >
          <div
            data-ocid="punishment_matrix.edit_dialog"
            className="neon-card relative"
            style={{
              padding: "32px",
              width: "520px",
              maxWidth: "94vw",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setEditingEntry(null);
                setEditForm(null);
              }}
              className="absolute top-4 right-4"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
              }}
            >
              <XCircle size={18} />
            </button>
            <h3
              className="font-pixel mb-6"
              style={{
                fontSize: "10px",
                color: "var(--accent-purple-bright)",
                letterSpacing: "0.08em",
              }}
            >
              EDIT RULE — {editingEntry.reason.toUpperCase()}
            </h3>
            <div className="flex flex-col gap-4">
              {(["reason", "notes", "o1", "o2", "o3", "o4", "o5"] as const).map(
                (field) => (
                  <div key={field}>
                    <label
                      htmlFor={`edit-field-${field}`}
                      className="block font-pixel mb-1.5"
                      style={{
                        fontSize: "9px",
                        color: "var(--text-muted)",
                        letterSpacing: "0.1em",
                      }}
                    >
                      {field === "reason"
                        ? "REASON"
                        : field === "notes"
                          ? "NOTES"
                          : `OFFENCE ${field.slice(1)}`}
                    </label>
                    <input
                      id={`edit-field-${field}`}
                      type="text"
                      value={editForm[field]}
                      onChange={(e) =>
                        setEditForm({ ...editForm, [field]: e.target.value })
                      }
                      style={inputStyle}
                      onFocus={handleFocusStyle}
                      onBlur={handleBlurStyle}
                    />
                  </div>
                ),
              )}
              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  data-ocid="punishment_matrix.edit_dialog"
                  onClick={() => {
                    setEditingEntry(null);
                    setEditForm(null);
                  }}
                  className="flex-1 py-2 rounded-md"
                  style={{
                    background: "rgba(148, 163, 184, 0.08)",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
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
                  data-ocid="punishment_matrix.save_edit_button"
                  onClick={handleEditSave}
                  className="flex-1 btn-neon py-2 rounded-md flex items-center justify-center gap-2"
                  style={{ fontSize: "10px" }}
                >
                  <Pencil size={12} />
                  SAVE CHANGES
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================== DELETE CONFIRM DIALOG =================== */}
      {deletingEntry && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0, 0, 0, 0.8)" }}
        >
          <div
            data-ocid="punishment_matrix.delete_dialog"
            className="neon-card"
            style={{ padding: "32px", width: "420px", maxWidth: "90vw" }}
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Trash2 size={22} style={{ color: "#ef4444" }} />
              </div>
              <div>
                <h3
                  className="font-pixel mb-2"
                  style={{
                    fontSize: "10px",
                    color: "#ef4444",
                    letterSpacing: "0.08em",
                  }}
                >
                  DELETE RULE
                </h3>
                <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                  Are you sure you want to delete the rule for{" "}
                  <span
                    style={{ color: "var(--text-primary)", fontWeight: 600 }}
                  >
                    "{deletingEntry.reason}"
                  </span>
                  ? This will be recorded in the audit log.
                </p>
              </div>
              <div className="flex gap-3 w-full mt-2">
                <button
                  type="button"
                  data-ocid="punishment_matrix.delete_dialog"
                  onClick={() => setDeletingEntry(null)}
                  className="flex-1 py-2.5 rounded-md"
                  style={{
                    background: "rgba(148, 163, 184, 0.08)",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
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
                  data-ocid="punishment_matrix.confirm_delete_button"
                  onClick={handleDelete}
                  className="flex-1 py-2.5 rounded-md flex items-center justify-center gap-2"
                  style={{
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.5)",
                    color: "#ef4444",
                    fontSize: "10px",
                    fontFamily: '"JetBrains Mono", monospace',
                    fontWeight: 700,
                    cursor: "pointer",
                    letterSpacing: "0.06em",
                  }}
                >
                  <Trash2 size={12} />
                  DELETE
                </button>
              </div>
            </div>
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
