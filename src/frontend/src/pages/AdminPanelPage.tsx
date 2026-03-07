import { Principal } from "@icp-sdk/core/principal";
import {
  CheckCircle,
  Loader2,
  Plus,
  ScrollText,
  Settings,
  Shield,
  Users,
  Webhook,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { PublicUser, PunishmentLog } from "../backend.d";
import { Role } from "../backend.d";
import { useActor } from "../hooks/useActor";
import { sha256Hex } from "../lib/crypto";

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

function formatTimestamp(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface AdminPanelPageProps {
  currentUser: PublicUser;
}

export function AdminPanelPage({ currentUser }: AdminPanelPageProps) {
  const { actor } = useActor();
  const [activeTab, setActiveTab] = useState<"staff" | "webhook" | "logs">(
    "staff",
  );

  // Staff management
  const [users, setUsers] = useState<PublicUser[]>([]);
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
  const [punishmentWebhook, setPunishmentWebhook] = useState("");
  const [loaWebhook, setLoaWebhook] = useState("");
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookSaveSuccess, setWebhookSaveSuccess] = useState(false);
  const [webhookSaveError, setWebhookSaveError] = useState("");
  const [webhookFetching, setWebhookFetching] = useState(true);

  // All logs
  const [logs, setLogs] = useState<PunishmentLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  const isOwner = currentUser.role === Role.Owner;

  const fetchUsers = () => {
    if (!actor) {
      setUsersLoading(false);
      return;
    }
    setUsersLoading(true);
    actor
      .getAllUsers()
      .then((result) => {
        if (result.__kind__ === "ok") setUsers(result.ok);
        // If err — show empty list (backend not initialized)
      })
      .catch(() => {
        // Silently ignore — backend not initialized; show empty list
      })
      .finally(() => setUsersLoading(false));
  };

  const fetchWebhookConfig = () => {
    if (!actor) {
      setWebhookFetching(false);
      return;
    }
    setWebhookFetching(true);
    actor
      .getWebhookConfig()
      .then((result) => {
        if (result.__kind__ === "ok") {
          setPunishmentWebhook(result.ok.punishmentWebhookUrl);
          setLoaWebhook(result.ok.loaWebhookUrl);
        }
        // If err — silently show the form with empty defaults (backend not initialized)
      })
      .catch(() => {
        // Silently ignore — backend not initialized; show form with empty defaults
      })
      .finally(() => setWebhookFetching(false));
  };

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
        // If err — show empty state, backend not initialized
      })
      .catch(() => {
        // Silently ignore — backend not initialized; show empty state
      })
      .finally(() => setLogsLoading(false));
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: fetch functions defined inside component, depend on actor
  useEffect(() => {
    if (!actor || !isOwner) return;
    if (activeTab === "staff") fetchUsers();
    if (activeTab === "webhook") fetchWebhookConfig();
    if (activeTab === "logs") fetchLogs();
  }, [actor, activeTab, isOwner]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor) return;
    setCreateLoading(true);
    setCreateError("");
    setCreateSuccess(false);
    try {
      const hashedPassword = await sha256Hex(newPassword);
      const anonPrincipal = Principal.anonymous();
      const result = await actor.createStaffAccount(
        anonPrincipal,
        newUsername,
        hashedPassword,
        newRole,
      );
      if (result.__kind__ === "ok") {
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
        setCreateError(result.err || "Failed to create account.");
      }
    } catch {
      setCreateError("Connection error. Please try again.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor) return;
    setWebhookLoading(true);
    setWebhookSaveError("");
    setWebhookSaveSuccess(false);
    try {
      const result = await actor.setWebhookConfig(
        punishmentWebhook,
        loaWebhook,
      );
      if (result.__kind__ === "ok") {
        setWebhookSaveSuccess(true);
        setTimeout(() => setWebhookSaveSuccess(false), 3000);
      } else {
        setWebhookSaveError(
          "Webhook config could not be saved — backend not initialized. Please contact your server admin.",
        );
      }
    } catch {
      setWebhookSaveError(
        "Webhook config could not be saved — backend not initialized. Please contact your server admin.",
      );
    } finally {
      setWebhookLoading(false);
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
      label: "STAFF MANAGEMENT",
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
                      onClick={() => setShowCreateDialog(false)}
                      data-ocid="admin.create_account_dialog"
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
                      <th>USERNAME</th>
                      <th>ROLE</th>
                      <th>CREATED AT</th>
                      <th>ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={String(user.id)}>
                        <td style={{ fontWeight: 700 }}>
                          {user.username}
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
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
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
            Note: Rank changes and account removal require principal-level
            access (ICP identity management).
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
              submitted, a notification will be sent to these webhooks.
            </p>
          </div>

          {webhookFetching ? (
            <div
              className="flex items-center justify-center py-12 gap-3"
              style={{ color: "var(--text-muted)" }}
            >
              <Loader2
                size={18}
                className="animate-spin"
                style={{ color: "#f59e0b" }}
              />
              Loading webhook configuration...
            </div>
          ) : (
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
                  value={punishmentWebhook}
                  onChange={(e) => setPunishmentWebhook(e.target.value)}
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
          )}
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
                <table className="staff-table" style={{ minWidth: "800px" }}>
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
                    {logs.map((log) => (
                      <tr key={String(log.id)}>
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
