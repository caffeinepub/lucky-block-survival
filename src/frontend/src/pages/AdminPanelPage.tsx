import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  CheckCircle,
  Copy,
  Download,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  ScrollText,
  Settings,
  Shield,
  Trash2,
  Upload,
  Users,
  Webhook,
  Wrench,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PublicUser } from "../backend.d";
import { Role } from "../backend.d";
import {
  getMaintenanceMode,
  getWebhookConfig,
  saveWebhookConfig,
  setMaintenanceMode,
} from "../lib/moderationSettings";
import {
  type LocalPunishmentLog,
  getAllPunishmentLogs,
} from "../lib/portalData";
import {
  type StaffAccount,
  addStrike,
  createAccount,
  getAllAccounts,
  removeAccount,
  removeStrike,
} from "../lib/staffAccounts";
import { generateSyncCode, importSyncCode } from "../lib/syncCode";

function getRoleDisplayName(role: Role): string {
  switch (role) {
    case Role.Owner:
      return "Owner";
    case Role.CoOwner:
      return "Co-Owner";
    default:
      return "Staff/Builder";
  }
}

function getRoleBadgeClass(role: Role): string {
  switch (role) {
    case Role.Owner:
      return "rank-owner";
    case Role.CoOwner:
      return "rank-coowner";
    default:
      return "rank-staff";
  }
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatLogTimestamp(ts: number): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---- Strike Progress Bar Component -----------------------------------------

function StrikeBar({
  strikes,
  userId,
  currentUserRole,
  onStrikeChange,
}: {
  strikes: number;
  userId: number;
  currentUserRole: Role;
  onStrikeChange: () => void;
}) {
  const count = strikes ?? 0;

  function getSegmentColor(segIndex: number): string {
    if (segIndex >= count) return "rgba(148,163,184,0.2)";
    if (count === 1) return "#22c55e";
    if (count === 2) return "#f97316";
    return "#ef4444"; // 3 strikes
  }

  const canAdd =
    currentUserRole === Role.Owner || currentUserRole === Role.CoOwner;
  const canRemove = currentUserRole === Role.Owner;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (count >= 3) return;
    addStrike(userId);
    onStrikeChange();
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (count <= 0) return;
    removeStrike(userId);
    onStrikeChange();
  };

  return (
    <div className="flex items-center gap-2 mt-1.5">
      {/* 3 segment bar */}
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: "28px",
              height: "8px",
              borderRadius: "3px",
              background: getSegmentColor(i),
              transition: "background 0.25s",
              boxShadow:
                i < count && count === 3
                  ? "0 0 6px rgba(239,68,68,0.6)"
                  : "none",
            }}
          />
        ))}
      </div>

      {/* REVIEW badge */}
      {count >= 3 && (
        <span
          className="font-pixel"
          style={{
            fontSize: "7px",
            padding: "2px 5px",
            borderRadius: "3px",
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.5)",
            color: "#ef4444",
            letterSpacing: "0.06em",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        >
          REVIEW
        </span>
      )}

      <span
        style={{
          fontSize: "10px",
          fontFamily: '"JetBrains Mono", monospace',
          color:
            count === 0
              ? "var(--text-muted)"
              : count === 3
                ? "#ef4444"
                : count === 2
                  ? "#f97316"
                  : "#22c55e",
          minWidth: "14px",
        }}
      >
        {count}/3
      </span>

      {/* Controls */}
      {canAdd && (
        <button
          type="button"
          data-ocid="admin.staff.strike_add_button"
          onClick={handleAdd}
          disabled={count >= 3}
          title="Add strike"
          style={{
            width: "18px",
            height: "18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              count >= 3 ? "rgba(148,163,184,0.05)" : "rgba(239,68,68,0.08)",
            border: `1px solid ${count >= 3 ? "rgba(148,163,184,0.15)" : "rgba(239,68,68,0.3)"}`,
            borderRadius: "3px",
            color: count >= 3 ? "var(--text-muted)" : "#ef4444",
            cursor: count >= 3 ? "not-allowed" : "pointer",
            padding: 0,
          }}
        >
          <Plus size={10} />
        </button>
      )}
      {canRemove && (
        <button
          type="button"
          data-ocid="admin.staff.strike_remove_button"
          onClick={handleRemove}
          disabled={count <= 0}
          title="Remove strike"
          style={{
            width: "18px",
            height: "18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              count <= 0 ? "rgba(148,163,184,0.05)" : "rgba(74,222,128,0.08)",
            border: `1px solid ${count <= 0 ? "rgba(148,163,184,0.15)" : "rgba(74,222,128,0.3)"}`,
            borderRadius: "3px",
            color: count <= 0 ? "var(--text-muted)" : "#4ade80",
            cursor: count <= 0 ? "not-allowed" : "pointer",
            padding: 0,
          }}
        >
          <Minus size={10} />
        </button>
      )}
    </div>
  );
}

interface AdminPanelPageProps {
  currentUser: PublicUser;
}

export function AdminPanelPage({ currentUser }: AdminPanelPageProps) {
  const [activeTab, setActiveTab] = useState<
    "staff" | "webhook" | "logs" | "sync" | "maintenance"
  >("staff");

  // Staff management
  const [users, setUsers] = useState<StaffAccount[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // Create account dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>(Role.StaffBuilder);
  const [createLoading, setCreateLoading] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [createError, setCreateError] = useState("");

  // Webhook config
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [loaWebhook, setLoaWebhook] = useState("");
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookSaveSuccess, setWebhookSaveSuccess] = useState(false);
  const [webhookSaveError, setWebhookSaveError] = useState("");

  // All logs
  const [logs, setLogs] = useState<LocalPunishmentLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  // Maintenance mode
  const [maintenanceMode, setMaintenanceModeState] = useState(false);

  // Sync
  const [syncCode, setSyncCode] = useState("");
  const [syncGenerated, setSyncGenerated] = useState(false);
  const [importInput, setImportInput] = useState("");
  const [importResult, setImportResult] = useState<string>("");
  const [importError, setImportError] = useState<string>("");
  const [copySuccess, setCopySuccess] = useState(false);
  const syncTextareaRef = useRef<HTMLTextAreaElement>(null);

  const isOwner = currentUser.role === Role.Owner;

  const fetchUsers = () => {
    setUsersLoading(true);
    try {
      setUsers(getAllAccounts());
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchWebhookConfig = () => {
    const config = getWebhookConfig();
    setWebhookUrl(config.url);
    setWebhookEnabled(config.enabled);
    const loa = localStorage.getItem("portal_webhook_loa") ?? "";
    setLoaWebhook(loa);
  };

  const fetchLogs = () => {
    setLogsLoading(true);
    try {
      setLogs(getAllPunishmentLogs());
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchMaintenance = () => {
    setMaintenanceModeState(getMaintenanceMode());
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: fetch functions are defined inside component and stable per render
  useEffect(() => {
    if (!isOwner) return;
    if (activeTab === "staff") fetchUsers();
    if (activeTab === "webhook") fetchWebhookConfig();
    if (activeTab === "logs") fetchLogs();
    if (activeTab === "maintenance") fetchMaintenance();
  }, [activeTab, isOwner]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError("");
    setCreateSuccess(false);
    try {
      const result = await createAccount(newUsername, newPassword, newRole);
      if (result.success) {
        setCreateSuccess(true);
        setNewUsername("");
        setNewPassword("");
        setNewRole(Role.StaffBuilder);
        fetchUsers();
        setTimeout(() => {
          setCreateSuccess(false);
          setShowCreateDialog(false);
        }, 2000);
      } else {
        setCreateError(result.error || "Failed to create account.");
      }
    } catch {
      setCreateError("An unexpected error occurred. Please try again.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteAccount = (accountId: number) => {
    removeAccount(accountId);
    fetchUsers();
  };

  const handleSaveWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    setWebhookLoading(true);
    setWebhookSaveError("");
    setWebhookSaveSuccess(false);
    try {
      saveWebhookConfig({ url: webhookUrl, enabled: webhookEnabled });
      localStorage.setItem("portal_webhook_loa", loaWebhook);
      setWebhookSaveSuccess(true);
      setTimeout(() => setWebhookSaveSuccess(false), 3000);
    } catch {
      setWebhookSaveError("Failed to save webhook config. Please try again.");
    } finally {
      setWebhookLoading(false);
    }
  };

  const handleToggleMaintenance = (enabled: boolean) => {
    setMaintenanceMode(enabled);
    setMaintenanceModeState(enabled);
  };

  const handleGenerateSyncCode = () => {
    const code = generateSyncCode();
    setSyncCode(code);
    setSyncGenerated(true);
  };

  const handleCopySyncCode = async () => {
    if (!syncCode) return;
    try {
      await navigator.clipboard.writeText(syncCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      syncTextareaRef.current?.select();
    }
  };

  const handleImportSyncCode = () => {
    setImportResult("");
    setImportError("");
    if (!importInput.trim()) {
      setImportError("Please paste a sync code first.");
      return;
    }
    const result = importSyncCode(importInput);
    if (result.success) {
      setImportResult(
        `Imported: ${result.accountsAdded} account${
          result.accountsAdded !== 1 ? "s" : ""
        }, ${result.logsAdded} log${
          result.logsAdded !== 1 ? "s" : ""
        }, ${result.loasAdded} LOA${result.loasAdded !== 1 ? "s" : ""} added.`,
      );
      setImportInput("");
      fetchUsers();
    } else {
      setImportError(result.error ?? "Import failed.");
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
    {
      id: "staff" as const,
      label: "ROLES & STRIKES",
      icon: <Users size={13} />,
      ocid: "admin.staff_management_tab",
    },
    {
      id: "webhook" as const,
      label: "WEBHOOKS",
      icon: <Webhook size={13} />,
      ocid: "admin.webhook_tab",
    },
    {
      id: "logs" as const,
      label: "ALL LOGS",
      icon: <ScrollText size={13} />,
      ocid: "admin.logs_tab",
    },
    {
      id: "sync" as const,
      label: "SYNC DATA",
      icon: <RefreshCw size={13} />,
      ocid: "admin.sync_tab",
    },
    {
      id: "maintenance" as const,
      label: "MAINTENANCE",
      icon: <Wrench size={13} />,
      ocid: "admin.maintenance_tab",
    },
  ];

  // Access guard — all hooks must be called before this
  if (!isOwner) {
    return (
      <div
        className="p-8 flex flex-col items-center justify-center"
        style={{ minHeight: "60vh" }}
      >
        <div
          className="neon-card flex flex-col items-center gap-4 text-center"
          style={{ padding: "48px 64px", maxWidth: "400px" }}
        >
          <Shield size={48} style={{ color: "#ef4444", opacity: 0.7 }} />
          <h2
            className="font-pixel"
            style={{
              fontSize: "11px",
              color: "#ef4444",
              letterSpacing: "0.08em",
            }}
          >
            ACCESS DENIED
          </h2>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            Admin Panel access is restricted to the server Owner only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="flex items-center justify-center rounded-lg"
          style={{
            width: "40px",
            height: "40px",
            background: "rgba(245, 158, 11, 0.15)",
            border: "1px solid rgba(245, 158, 11, 0.4)",
          }}
        >
          <Settings size={20} style={{ color: "#f59e0b" }} />
        </div>
        <div>
          <h1 className="page-header" style={{ color: "#f59e0b" }}>
            ADMIN PANEL
          </h1>
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              marginTop: "2px",
            }}
          >
            Owner-level system administration
          </p>
        </div>
      </div>

      {/* Owner badge */}
      <div
        className="inline-flex items-center gap-2 rounded-md mb-6 py-2 px-4"
        style={{
          background: "rgba(245, 158, 11, 0.08)",
          border: "1px solid rgba(245, 158, 11, 0.3)",
          fontSize: "11px",
          color: "#f59e0b",
        }}
      >
        <Shield size={13} />
        Logged in as Owner — full access granted
      </div>

      {/* Tabs */}
      <div
        className="flex gap-2 mb-6 p-1 rounded-lg flex-wrap"
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
            data-ocid={tab.ocid}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md transition-all duration-200"
            style={{
              fontSize: "10px",
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: "pointer",
              border:
                activeTab === tab.id
                  ? "1px solid rgba(245, 158, 11, 0.5)"
                  : "1px solid transparent",
              background:
                activeTab === tab.id
                  ? "rgba(245, 158, 11, 0.12)"
                  : "transparent",
              color: activeTab === tab.id ? "#f59e0b" : "var(--text-muted)",
              boxShadow:
                activeTab === tab.id
                  ? "0 0 10px rgba(245, 158, 11, 0.15)"
                  : "none",
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* =================== STAFF MANAGEMENT TAB =================== */}
      {activeTab === "staff" && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              {users.length} staff account{users.length !== 1 ? "s" : ""}
            </p>
            <button
              type="button"
              data-ocid="admin.create_account_button"
              onClick={() => {
                setShowCreateDialog(true);
                setCreateError("");
                setCreateSuccess(false);
              }}
              className="btn-neon flex items-center gap-2 py-2 px-4 rounded-md"
              style={{ fontSize: "10px" }}
            >
              <Plus size={13} />
              CREATE ACCOUNT
            </button>
          </div>

          {/* Create account dialog */}
          {showCreateDialog && (
            <div
              className="fixed inset-0 flex items-center justify-center z-50"
              style={{ background: "rgba(0, 0, 0, 0.75)" }}
            >
              <div
                data-ocid="admin.create_account_dialog"
                className="neon-card relative"
                style={{ padding: "32px", width: "440px", maxWidth: "90vw" }}
              >
                <button
                  type="button"
                  data-ocid="admin.create_account_dialog.close_button"
                  onClick={() => setShowCreateDialog(false)}
                  className="absolute top-4 right-4"
                  style={{
                    color: "var(--text-muted)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <XCircle size={18} />
                </button>
                <h3
                  className="font-pixel mb-6"
                  style={{
                    fontSize: "10px",
                    color: "var(--accent-purple-bright)",
                  }}
                >
                  CREATE STAFF ACCOUNT
                </h3>
                <form
                  onSubmit={handleCreateAccount}
                  className="flex flex-col gap-4"
                >
                  <div>
                    <label
                      htmlFor="admin-new-username"
                      className="block font-pixel mb-2"
                      style={{
                        fontSize: "9px",
                        color: "var(--text-muted)",
                        letterSpacing: "0.1em",
                      }}
                    >
                      USERNAME
                    </label>
                    <input
                      id="admin-new-username"
                      data-ocid="admin.new_username_input"
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="Staff username"
                      required
                      style={inputStyle}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="admin-new-password"
                      className="block font-pixel mb-2"
                      style={{
                        fontSize: "9px",
                        color: "var(--text-muted)",
                        letterSpacing: "0.1em",
                      }}
                    >
                      PASSWORD
                    </label>
                    <input
                      id="admin-new-password"
                      data-ocid="admin.new_password_input"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Initial password"
                      required
                      style={inputStyle}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="admin-new-role"
                      className="block font-pixel mb-2"
                      style={{
                        fontSize: "9px",
                        color: "var(--text-muted)",
                        letterSpacing: "0.1em",
                      }}
                    >
                      ROLE
                    </label>
                    <select
                      id="admin-new-role"
                      data-ocid="admin.new_role_select"
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as Role)}
                      style={{ ...inputStyle, cursor: "pointer" }}
                    >
                      <option
                        value={Role.StaffBuilder}
                        style={{ background: "var(--bg-deep)" }}
                      >
                        Staff/Builder
                      </option>
                      <option
                        value={Role.CoOwner}
                        style={{ background: "var(--bg-deep)" }}
                      >
                        Co-Owner
                      </option>
                    </select>
                  </div>

                  {createSuccess && (
                    <div
                      data-ocid="admin.create_account.success_state"
                      className="flex items-center gap-2 rounded-md py-3 px-4"
                      style={{
                        background: "rgba(74, 222, 128, 0.1)",
                        border: "1px solid rgba(74, 222, 128, 0.4)",
                        color: "#4ade80",
                        fontSize: "12px",
                      }}
                    >
                      <CheckCircle size={14} /> Account created successfully!
                    </div>
                  )}
                  {createError && (
                    <div
                      data-ocid="admin.create_account.error_state"
                      className="flex items-center gap-2 rounded-md py-3 px-4"
                      style={{
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.4)",
                        color: "#ef4444",
                        fontSize: "12px",
                      }}
                    >
                      <XCircle size={14} /> {createError}
                    </div>
                  )}

                  <div className="flex gap-3 mt-2">
                    <button
                      type="button"
                      data-ocid="admin.create_account_dialog.cancel_button"
                      onClick={() => setShowCreateDialog(false)}
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
                      type="submit"
                      data-ocid="admin.create_account_dialog.submit_button"
                      disabled={createLoading}
                      className="flex-1 btn-neon py-2 rounded-md flex items-center justify-center gap-2"
                      style={{
                        fontSize: "10px",
                        opacity: createLoading ? 0.7 : 1,
                      }}
                    >
                      {createLoading ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Plus size={12} />
                      )}
                      {createLoading ? "CREATING..." : "CREATE"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Users table */}
          <div
            className="neon-border rounded-lg overflow-hidden"
            style={{ background: "var(--bg-surface)" }}
          >
            {usersLoading ? (
              <div
                className="flex items-center justify-center py-16 gap-3"
                style={{ color: "var(--text-muted)" }}
              >
                <Loader2
                  size={20}
                  className="animate-spin"
                  style={{ color: "#f59e0b" }}
                />
                Loading staff accounts...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="staff-table">
                  <thead>
                    <tr>
                      <th>USERNAME &amp; STRIKES</th>
                      <th>ROLE</th>
                      <th>CREATED AT</th>
                      <th>ID</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, idx) => (
                      <tr
                        key={String(user.id)}
                        data-ocid={
                          idx < 3 ? `admin.staff.row.${idx + 1}` : undefined
                        }
                      >
                        <td style={{ fontWeight: 700 }}>
                          <div>
                            <span>{user.username}</span>
                            {user.username === currentUser.username && (
                              <span
                                className="ml-2 font-pixel"
                                style={{
                                  fontSize: "8px",
                                  background: "rgba(245, 158, 11, 0.15)",
                                  border: "1px solid rgba(245, 158, 11, 0.3)",
                                  color: "#f59e0b",
                                  padding: "1px 5px",
                                  borderRadius: "3px",
                                }}
                              >
                                YOU
                              </span>
                            )}
                            <StrikeBar
                              strikes={user.strikes ?? 0}
                              userId={user.id}
                              currentUserRole={currentUser.role}
                              onStrikeChange={fetchUsers}
                            />
                          </div>
                        </td>
                        <td>
                          <span
                            className={`font-pixel inline-block px-2 py-0.5 rounded ${getRoleBadgeClass(user.role)}`}
                            style={{ fontSize: "8px" }}
                          >
                            {getRoleDisplayName(user.role)}
                          </span>
                        </td>
                        <td
                          style={{
                            fontSize: "12px",
                            color: "var(--text-muted)",
                          }}
                        >
                          {formatTimestamp(user.createdAt)}
                        </td>
                        <td
                          style={{
                            fontSize: "11px",
                            color: "var(--text-muted)",
                            fontFamily: '"JetBrains Mono", monospace',
                          }}
                        >
                          #{String(user.id)}
                        </td>
                        <td>
                          {user.role !== Role.Owner && (
                            <button
                              type="button"
                              data-ocid={
                                idx < 3
                                  ? `admin.staff.delete_button.${idx + 1}`
                                  : "admin.staff.delete_button"
                              }
                              onClick={() => handleDeleteAccount(user.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded transition-all duration-200"
                              style={{
                                background: "rgba(239, 68, 68, 0.08)",
                                border: "1px solid rgba(239, 68, 68, 0.3)",
                                color: "#ef4444",
                                fontSize: "9px",
                                fontFamily: '"JetBrains Mono", monospace',
                                fontWeight: 700,
                                cursor: "pointer",
                                letterSpacing: "0.06em",
                              }}
                              title="Remove account"
                            >
                              <Trash2 size={10} />
                              REMOVE
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          data-ocid="admin.staff.empty_state"
                          className="text-center py-12"
                          style={{
                            color: "var(--text-muted)",
                            fontSize: "12px",
                          }}
                        >
                          No staff accounts found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <p
            className="mt-3"
            style={{ fontSize: "11px", color: "var(--text-muted)" }}
          >
            All account data is stored locally. Use the SYNC DATA tab to share
            accounts with staff on other devices.
          </p>
        </div>
      )}

      {/* =================== WEBHOOK TAB =================== */}
      {activeTab === "webhook" && (
        <div style={{ maxWidth: "560px" }}>
          <div
            className="rounded-lg mb-6 flex items-start gap-3"
            style={{
              background: "rgba(96, 165, 250, 0.06)",
              border: "1px solid rgba(96, 165, 250, 0.2)",
              padding: "12px 16px",
            }}
          >
            <Webhook
              size={14}
              style={{ color: "#60a5fa", marginTop: "2px", flexShrink: 0 }}
            />
            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Configure Discord Webhook URLs. When a punishment log or LOA is
              submitted, a notification will be sent to these webhooks. URLs are
              stored locally on this device.
            </p>
          </div>

          {/* Auto-send toggle */}
          <div
            className="neon-card mb-5 flex items-center justify-between"
            style={{ padding: "18px 24px" }}
          >
            <div>
              <p
                className="font-pixel"
                style={{
                  fontSize: "10px",
                  color: "var(--text-primary)",
                  letterSpacing: "0.08em",
                }}
              >
                AUTO-SEND TO DISCORD
              </p>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                }}
              >
                Auto-send to Discord when punishment is logged.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Label
                htmlFor="webhook-toggle"
                style={{
                  fontSize: "10px",
                  fontFamily: '"JetBrains Mono", monospace',
                  fontWeight: 700,
                  color: webhookEnabled ? "#4ade80" : "var(--text-muted)",
                }}
              >
                {webhookEnabled ? "ON" : "OFF"}
              </Label>
              <Switch
                id="webhook-toggle"
                data-ocid="admin.webhook_enabled_toggle"
                checked={webhookEnabled}
                onCheckedChange={(checked) => {
                  setWebhookEnabled(checked);
                  saveWebhookConfig({ url: webhookUrl, enabled: checked });
                }}
              />
            </div>
          </div>

          <form
            onSubmit={handleSaveWebhook}
            className="neon-card flex flex-col gap-5"
            style={{ padding: "28px 32px" }}
          >
            <div>
              <label
                htmlFor="admin-punishment-webhook"
                className="block font-pixel mb-2"
                style={{
                  fontSize: "9px",
                  color: "var(--text-muted)",
                  letterSpacing: "0.1em",
                }}
              >
                PUNISHMENT LOG WEBHOOK URL
              </label>
              <input
                id="admin-punishment-webhook"
                data-ocid="admin.punishment_webhook_input"
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>

            <div>
              <label
                htmlFor="admin-loa-webhook"
                className="block font-pixel mb-2"
                style={{
                  fontSize: "9px",
                  color: "var(--text-muted)",
                  letterSpacing: "0.1em",
                }}
              >
                LOA WEBHOOK URL
              </label>
              <input
                id="admin-loa-webhook"
                data-ocid="admin.loa_webhook_input"
                type="text"
                value={loaWebhook}
                onChange={(e) => setLoaWebhook(e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>

            {webhookSaveSuccess && (
              <div
                data-ocid="admin.webhook.success_state"
                className="flex items-center gap-2 rounded-md py-3 px-4"
                style={{
                  background: "rgba(74, 222, 128, 0.1)",
                  border: "1px solid rgba(74, 222, 128, 0.4)",
                  color: "#4ade80",
                  fontSize: "12px",
                }}
              >
                <CheckCircle size={14} /> Webhook configuration saved!
              </div>
            )}
            {webhookSaveError && (
              <div
                data-ocid="admin.webhook.error_state"
                className="flex items-center gap-2 rounded-md py-3 px-4"
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  color: "#ef4444",
                  fontSize: "12px",
                }}
              >
                <XCircle size={14} /> {webhookSaveError}
              </div>
            )}

            <button
              data-ocid="admin.save_webhook_button"
              type="submit"
              disabled={webhookLoading}
              className="btn-neon flex items-center justify-center gap-2 py-3 rounded-md"
              style={{ fontSize: "11px", opacity: webhookLoading ? 0.7 : 1 }}
            >
              {webhookLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> SAVING...
                </>
              ) : (
                <>
                  <Webhook size={14} /> SAVE CONFIG
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* =================== ALL LOGS TAB =================== */}
      {activeTab === "logs" && (
        <div>
          <div
            className="neon-border rounded-lg overflow-hidden"
            style={{ background: "var(--bg-surface)" }}
          >
            {logsLoading ? (
              <div
                data-ocid="admin.logs.loading_state"
                className="flex items-center justify-center py-16 gap-3"
                style={{ color: "var(--text-muted)" }}
              >
                <Loader2
                  size={20}
                  className="animate-spin"
                  style={{ color: "#f59e0b" }}
                />
                Loading all punishment logs...
              </div>
            ) : logs.length === 0 ? (
              <div
                data-ocid="admin.logs.empty_state"
                className="flex flex-col items-center justify-center py-16"
                style={{ color: "var(--text-muted)" }}
              >
                <ScrollText
                  size={36}
                  style={{ opacity: 0.25, marginBottom: "14px" }}
                />
                <p style={{ fontSize: "12px" }}>No punishment logs found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table
                  data-ocid="admin.logs.table"
                  className="staff-table"
                  style={{ minWidth: "800px" }}
                >
                  <thead>
                    <tr>
                      <th>IGN</th>
                      <th>REASON &amp; DATE</th>
                      <th>OFFENSE</th>
                      <th>PROOF</th>
                      <th>SUBMITTED BY</th>
                      <th>TIMESTAMP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, idx) => (
                      <tr
                        key={String(log.id)}
                        data-ocid={
                          idx < 3 ? `admin.logs.row.${idx + 1}` : undefined
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
                          {formatLogTimestamp(log.timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {!logsLoading && (
            <p
              className="mt-3"
              style={{ fontSize: "11px", color: "var(--text-muted)" }}
            >
              {logs.length} total punishment log{logs.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}

      {/* =================== SYNC TAB =================== */}
      {activeTab === "sync" && (
        <div style={{ maxWidth: "640px" }}>
          <div
            className="rounded-lg mb-6 flex items-start gap-3"
            style={{
              background: "rgba(245, 158, 11, 0.06)",
              border: "1px solid rgba(245, 158, 11, 0.25)",
              padding: "12px 16px",
            }}
          >
            <RefreshCw
              size={14}
              style={{ color: "#f59e0b", marginTop: "2px", flexShrink: 0 }}
            />
            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Since all data is stored locally, use the sync code to share
              accounts, punishment logs, and LOAs with staff on other devices.
              Data merges — existing entries are never overwritten.
            </p>
          </div>

          <div className="neon-card mb-6" style={{ padding: "28px 32px" }}>
            <h3
              className="font-pixel mb-2"
              style={{
                fontSize: "10px",
                color: "#f59e0b",
                letterSpacing: "0.08em",
              }}
            >
              <Download
                size={11}
                style={{ display: "inline", marginRight: "6px" }}
              />
              EXPORT SYNC CODE
            </h3>
            <p
              style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                marginBottom: "16px",
              }}
            >
              Share this code with your staff so they can import all accounts,
              logs, and LOAs on their device.
            </p>

            <div className="flex gap-3 mb-4">
              <button
                type="button"
                data-ocid="admin.sync.generate_button"
                onClick={handleGenerateSyncCode}
                className="btn-neon flex items-center gap-2 py-2 px-4 rounded-md"
                style={{ fontSize: "10px" }}
              >
                <RefreshCw size={12} />
                GENERATE CODE
              </button>
              {syncGenerated && (
                <button
                  type="button"
                  data-ocid="admin.sync.copy_button"
                  onClick={handleCopySyncCode}
                  className="flex items-center gap-2 py-2 px-4 rounded-md transition-all duration-200"
                  style={{
                    fontSize: "10px",
                    fontFamily: '"JetBrains Mono", monospace',
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    background: copySuccess
                      ? "rgba(74, 222, 128, 0.12)"
                      : "rgba(245, 158, 11, 0.1)",
                    border: copySuccess
                      ? "1px solid rgba(74, 222, 128, 0.4)"
                      : "1px solid rgba(245, 158, 11, 0.4)",
                    color: copySuccess ? "#4ade80" : "#f59e0b",
                    cursor: "pointer",
                  }}
                >
                  {copySuccess ? (
                    <>
                      <CheckCircle size={12} /> COPIED!
                    </>
                  ) : (
                    <>
                      <Copy size={12} /> COPY
                    </>
                  )}
                </button>
              )}
            </div>

            {syncGenerated && (
              <textarea
                ref={syncTextareaRef}
                readOnly
                value={syncCode}
                rows={5}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "var(--bg-deep)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "6px",
                  color: "var(--text-muted)",
                  fontSize: "11px",
                  fontFamily: '"JetBrains Mono", monospace',
                  outline: "none",
                  resize: "vertical",
                  wordBreak: "break-all",
                }}
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                onKeyDown={(e) => {
                  if (e.key === "a" && (e.ctrlKey || e.metaKey)) {
                    (e.target as HTMLTextAreaElement).select();
                  }
                }}
              />
            )}
          </div>

          <div className="neon-card" style={{ padding: "28px 32px" }}>
            <h3
              className="font-pixel mb-2"
              style={{
                fontSize: "10px",
                color: "#f59e0b",
                letterSpacing: "0.08em",
              }}
            >
              <Upload
                size={11}
                style={{ display: "inline", marginRight: "6px" }}
              />
              IMPORT SYNC CODE
            </h3>
            <p
              style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                marginBottom: "16px",
              }}
            >
              Paste a sync code from the Owner to load all staff data onto this
              device.
            </p>

            <textarea
              data-ocid="admin.sync.import_textarea"
              value={importInput}
              onChange={(e) => setImportInput(e.target.value)}
              placeholder="Paste sync code here..."
              rows={4}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "var(--bg-deep)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "6px",
                color: "var(--text-primary)",
                fontSize: "12px",
                fontFamily: '"JetBrains Mono", monospace',
                outline: "none",
                resize: "vertical",
                marginBottom: "12px",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "rgba(245, 158, 11, 0.5)";
                e.target.style.boxShadow = "0 0 8px rgba(245, 158, 11, 0.15)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--border-subtle)";
                e.target.style.boxShadow = "none";
              }}
            />

            <button
              type="button"
              data-ocid="admin.sync.import_button"
              onClick={handleImportSyncCode}
              className="flex items-center gap-2 py-2 px-4 rounded-md transition-all duration-200"
              style={{
                fontSize: "10px",
                fontFamily: '"JetBrains Mono", monospace',
                fontWeight: 700,
                letterSpacing: "0.06em",
                background: "rgba(245, 158, 11, 0.12)",
                border: "1px solid rgba(245, 158, 11, 0.4)",
                color: "#f59e0b",
                cursor: "pointer",
              }}
            >
              <Upload size={12} />
              IMPORT
            </button>

            {importResult && (
              <div
                data-ocid="admin.sync.import.success_state"
                className="flex items-center gap-2 rounded-md py-3 px-4 mt-4"
                style={{
                  background: "rgba(74, 222, 128, 0.1)",
                  border: "1px solid rgba(74, 222, 128, 0.4)",
                  color: "#4ade80",
                  fontSize: "12px",
                }}
              >
                <CheckCircle size={14} /> {importResult}
              </div>
            )}
            {importError && (
              <div
                data-ocid="admin.sync.import.error_state"
                className="flex items-center gap-2 rounded-md py-3 px-4 mt-4"
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  color: "#ef4444",
                  fontSize: "12px",
                }}
              >
                <XCircle size={14} /> {importError}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================== MAINTENANCE TAB =================== */}
      {activeTab === "maintenance" && (
        <div style={{ maxWidth: "560px" }}>
          {/* Info banner */}
          <div
            className="rounded-lg mb-6 flex items-start gap-3"
            style={{
              background: "rgba(239, 68, 68, 0.06)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              padding: "12px 16px",
            }}
          >
            <Wrench
              size={14}
              style={{ color: "#ef4444", marginTop: "2px", flexShrink: 0 }}
            />
            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Maintenance Mode makes the system read-only for all staff. Only
              the Owner can submit punishments or override actions while
              maintenance is active.
            </p>
          </div>

          <div className="neon-card" style={{ padding: "32px 36px" }}>
            {/* Big toggle section */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3
                  className="font-pixel"
                  style={{
                    fontSize: "13px",
                    letterSpacing: "0.1em",
                    color: maintenanceMode ? "#ef4444" : "var(--text-primary)",
                    marginBottom: "6px",
                  }}
                >
                  MAINTENANCE MODE
                </h3>
                <span
                  data-ocid="admin.maintenance.status_badge"
                  className="font-pixel"
                  style={{
                    fontSize: "9px",
                    padding: "3px 10px",
                    borderRadius: "4px",
                    background: maintenanceMode
                      ? "rgba(239, 68, 68, 0.15)"
                      : "rgba(74, 222, 128, 0.1)",
                    border: maintenanceMode
                      ? "1px solid rgba(239, 68, 68, 0.4)"
                      : "1px solid rgba(74, 222, 128, 0.3)",
                    color: maintenanceMode ? "#ef4444" : "#4ade80",
                  }}
                >
                  {maintenanceMode ? "ON" : "OFF"}
                </span>
              </div>
              <Switch
                id="maintenance-toggle"
                data-ocid="admin.maintenance.toggle"
                checked={maintenanceMode}
                onCheckedChange={handleToggleMaintenance}
                style={{
                  // Style via CSS variables for the red glow
                  filter: maintenanceMode
                    ? "drop-shadow(0 0 6px rgba(239,68,68,0.5))"
                    : "none",
                }}
              />
            </div>

            <p
              style={{
                fontSize: "13px",
                color: "var(--text-muted)",
                lineHeight: 1.7,
                borderTop: "1px solid var(--border-subtle)",
                paddingTop: "16px",
              }}
            >
              When enabled, all staff submissions are disabled system-wide. Only
              the Owner can override.
            </p>

            {maintenanceMode && (
              <div
                data-ocid="admin.maintenance.active_warning"
                className="mt-4 flex items-center gap-2 rounded-md py-3 px-4"
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  color: "#ef4444",
                  fontSize: "12px",
                  animation: "pulse 2s ease-in-out infinite",
                }}
              >
                <Wrench size={14} /> System is currently in maintenance mode.
                All staff submissions are blocked.
              </div>
            )}
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
