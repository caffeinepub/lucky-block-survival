import {
  BookOpen,
  ChevronRight,
  ClipboardList,
  Clock,
  FileSearch,
  Gavel,
  LayoutGrid,
  LogOut,
  ScrollText,
  Settings,
  Terminal,
  Wrench,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import type { PublicUser } from "../backend.d";
import { Role } from "../backend.d";
import { getDiscordAvatarUrl, useAuth } from "../contexts/AuthContext";
import { getMaintenanceMode } from "../lib/moderationSettings";
import { getPendingAppealsCount } from "../lib/portalData";

function roleLevel(role: Role): number {
  if (role === Role.Owner) return 2;
  if (role === Role.CoOwner) return 1;
  return 0;
}

interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  minRoleLevel: number;
  ocid: string;
  showBadge?: boolean;
}

const navItems: NavItem[] = [
  {
    id: "dashboard",
    label: "DASHBOARD",
    icon: <LayoutGrid size={16} />,
    minRoleLevel: 0,
    ocid: "nav.dashboard_link",
  },
  {
    id: "punishment-logger",
    label: "PUNISHMENT LOGGER",
    icon: <ClipboardList size={16} />,
    minRoleLevel: 0,
    ocid: "nav.punishment_logger_link",
  },
  {
    id: "staff-logs",
    label: "PLAYER LOGS",
    icon: <ScrollText size={16} />,
    minRoleLevel: 0,
    ocid: "nav.staff_logs_link",
  },
  {
    id: "punishment-matrix",
    label: "PUNISHMENT MATRIX",
    icon: <Gavel size={16} />,
    minRoleLevel: 1,
    ocid: "nav.punishment_matrix_link",
  },
  {
    id: "command-vault",
    label: "COMMAND VAULT",
    icon: <Terminal size={16} />,
    minRoleLevel: 1,
    ocid: "nav.command_vault_link",
  },
  {
    id: "leave-requests",
    label: "LEAVE REQUESTS",
    icon: <Clock size={16} />,
    minRoleLevel: 1,
    ocid: "nav.leave_requests_link",
  },
  {
    id: "appeals",
    label: "APPEALS",
    icon: <FileSearch size={16} />,
    minRoleLevel: 1,
    ocid: "nav.appeals_link",
    showBadge: true,
  },
  {
    id: "staff-conduct",
    label: "STAFF CONDUCT",
    icon: <BookOpen size={16} />,
    minRoleLevel: 0,
    ocid: "nav.staff_conduct_link",
  },
  {
    id: "admin-panel",
    label: "ADMIN PANEL",
    icon: <Settings size={16} />,
    minRoleLevel: 2,
    ocid: "nav.admin_panel_link",
  },
];

function getRoleBadgeStyle(discordRole: string) {
  switch (discordRole) {
    case "Owner":
      return {
        bg: "rgba(245,158,11,0.15)",
        color: "#f59e0b",
        border: "rgba(245,158,11,0.4)",
        label: "Owner",
      };
    case "CoOwner":
      return {
        bg: "rgba(147,51,234,0.15)",
        color: "#a855f7",
        border: "rgba(147,51,234,0.4)",
        label: "Co-Owner",
      };
    case "Builder":
      return {
        bg: "rgba(74,222,128,0.12)",
        color: "#4ade80",
        border: "rgba(74,222,128,0.35)",
        label: "Builder",
      };
    default:
      return {
        bg: "rgba(96,165,250,0.12)",
        color: "#60a5fa",
        border: "rgba(96,165,250,0.35)",
        label: "Staff",
      };
  }
}

interface LayoutProps {
  children: ReactNode;
  activePage: string;
  setActivePage: (page: string) => void;
  currentUser: PublicUser;
}

export function Layout({
  children,
  activePage,
  setActivePage,
  currentUser,
}: LayoutProps) {
  const { discordUser, logout } = useAuth();
  const [maintenanceMode, setMaintenanceModeState] = useState(false);
  const [pendingAppeals, setPendingAppeals] = useState(0);

  useEffect(() => {
    setMaintenanceModeState(getMaintenanceMode());
    setPendingAppeals(getPendingAppealsCount());
    const interval = setInterval(() => {
      setMaintenanceModeState(getMaintenanceMode());
      setPendingAppeals(getPendingAppealsCount());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const userRoleLevel = roleLevel(currentUser.role);
  const visibleNavItems = navItems.filter(
    (item) => userRoleLevel >= item.minRoleLevel,
  );

  const discordRole = discordUser?.role ?? "Staff";
  const roleBadge = getRoleBadgeStyle(discordRole);
  const avatarUrl = discordUser
    ? getDiscordAvatarUrl(discordUser.discordId, discordUser.avatar)
    : "https://cdn.discordapp.com/embed/avatars/0.png";
  const displayName = discordUser?.username ?? currentUser.username;
  const maintenanceOffset = maintenanceMode ? "37px" : "0";

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-base)" }}>
      {/* Maintenance Banner */}
      {maintenanceMode && (
        <div
          data-ocid="layout.maintenance_banner"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            background: "rgba(239, 68, 68, 0.92)",
            backdropFilter: "blur(8px)",
            borderBottom: "1px solid rgba(239, 68, 68, 0.5)",
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            boxShadow: "0 2px 16px rgba(239, 68, 68, 0.4)",
          }}
        >
          <Wrench size={14} style={{ color: "white", flexShrink: 0 }} />
          <span
            style={{
              fontSize: "11px",
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "white",
            }}
          >
            🔧 MAINTENANCE MODE — System is currently read-only
          </span>
        </div>
      )}

      {/* Sidebar */}
      <aside
        className="fixed left-0 h-full flex flex-col z-50"
        style={{
          top: maintenanceOffset,
          width: "240px",
          background: "var(--bg-deep)",
          borderRight: "1px solid var(--border-glow)",
          boxShadow: "4px 0 20px rgba(124, 58, 237, 0.15)",
          transition: "top 0.2s",
        }}
      >
        {/* Sidebar header */}
        <div
          className="flex items-center gap-3 px-5"
          style={{
            height: "70px",
            borderBottom: "1px solid var(--border-subtle)",
            background:
              "linear-gradient(180deg, rgba(124, 58, 237, 0.1) 0%, transparent 100%)",
            flexShrink: 0,
          }}
        >
          <div
            className="flex items-center justify-center rounded"
            style={{
              width: "32px",
              height: "32px",
              background: "rgba(124, 58, 237, 0.2)",
              border: "1px solid var(--border-glow)",
              boxShadow: "0 0 10px rgba(124, 58, 237, 0.3)",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <img
              src="/assets/uploads/lbsleakpvp-picsart-aiimageenhancer-019d3518-77e8-775a-891a-286b41767600-4.png"
              alt="LBS4 Portal"
              style={{ width: "32px", height: "32px", objectFit: "cover" }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  "/assets/generated/lucky-block-logo-transparent.dim_200x200.png";
                (e.currentTarget as HTMLImageElement).style.objectFit =
                  "contain";
              }}
            />
          </div>
          <div>
            <p
              className="font-pixel neon-glow-text"
              style={{ fontSize: "8px", lineHeight: 1.4 }}
            >
              ⚡ LUCKY BLOCK
            </p>
            <p
              style={{
                fontSize: "9px",
                color: "var(--text-muted)",
                marginTop: "2px",
              }}
            >
              Staff Portal
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const badgeCount = item.showBadge ? pendingAppeals : 0;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-ocid={item.ocid}
                onClick={() => setActivePage(item.id)}
                className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-all duration-200 ${isActive ? "nav-active" : ""}`}
                style={{
                  color: isActive
                    ? "var(--accent-purple-bright)"
                    : "var(--text-muted)",
                  fontSize: "10px",
                  fontFamily: '"JetBrains Mono", monospace',
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  borderLeft: isActive
                    ? "3px solid var(--accent-purple-bright)"
                    : "3px solid transparent",
                  cursor: "pointer",
                  background: "none",
                  border: "none",
                  position: "relative",
                }}
              >
                <span
                  style={{
                    opacity: isActive ? 1 : 0.6,
                    color: isActive
                      ? "var(--accent-purple-bright)"
                      : "var(--text-muted)",
                  }}
                >
                  {item.icon}
                </span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {badgeCount > 0 && (
                  <span
                    className="font-pixel"
                    style={{
                      fontSize: "7px",
                      padding: "2px 5px",
                      borderRadius: "3px",
                      background: "rgba(245,158,11,0.2)",
                      border: "1px solid rgba(245,158,11,0.5)",
                      color: "#f59e0b",
                      flexShrink: 0,
                    }}
                  >
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar bottom: user info + logout */}
        <div
          className="px-4 py-4"
          style={{ borderTop: "1px solid var(--border-subtle)", flexShrink: 0 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <img
              src={avatarUrl}
              alt={displayName}
              className="rounded-full flex-shrink-0"
              style={{
                width: "36px",
                height: "36px",
                border: `1px solid ${roleBadge.border}`,
                objectFit: "cover",
              }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  "https://cdn.discordapp.com/embed/avatars/0.png";
              }}
            />
            <div className="flex-1 min-w-0">
              <p
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {displayName}
              </p>
              <span
                className="inline-block font-pixel"
                style={{
                  fontSize: "8px",
                  padding: "1px 7px",
                  borderRadius: "4px",
                  background: roleBadge.bg,
                  color: roleBadge.color,
                  border: `1px solid ${roleBadge.border}`,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {roleBadge.label}
              </span>
            </div>
          </div>
          <button
            type="button"
            data-ocid="nav.logout_button"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded transition-all duration-200"
            style={{
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#ef4444",
              fontSize: "10px",
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 700,
              letterSpacing: "0.06em",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)";
              e.currentTarget.style.boxShadow =
                "0 0 8px rgba(239, 68, 68, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <LogOut size={12} />
            LOGOUT
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div
        className="flex-1 flex flex-col"
        style={{
          marginLeft: "240px",
          minHeight: "100vh",
          paddingTop: maintenanceOffset,
          transition: "padding-top 0.2s",
        }}
      >
        {/* Topbar */}
        <header
          className="sticky top-0 z-40 flex items-center justify-between px-6"
          style={{
            height: "54px",
            background: "rgba(13, 13, 26, 0.92)",
            borderBottom: "1px solid var(--border-subtle)",
            backdropFilter: "blur(10px)",
            flexShrink: 0,
          }}
        >
          {/* Breadcrumb */}
          <div className="flex items-center gap-2">
            <span
              style={{
                fontSize: "10px",
                color: "var(--text-muted)",
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              LBS4
            </span>
            <ChevronRight
              size={12}
              style={{ color: "var(--text-muted)", opacity: 0.5 }}
            />
            <span
              className="font-pixel"
              style={{
                fontSize: "10px",
                color: "var(--accent-purple-bright)",
                letterSpacing: "0.06em",
              }}
            >
              {navItems.find((n) => n.id === activePage)?.label ?? "DASHBOARD"}
            </span>
          </div>

          {/* User info */}
          <div className="flex items-center gap-3">
            <span
              className="font-pixel hidden sm:inline-block"
              style={{
                fontSize: "8px",
                padding: "2px 8px",
                borderRadius: "4px",
                background: roleBadge.bg,
                color: roleBadge.color,
                border: `1px solid ${roleBadge.border}`,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {roleBadge.label}
            </span>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--text-primary)",
                maxWidth: "130px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {displayName}
            </span>
            <img
              src={avatarUrl}
              alt="avatar"
              className="rounded-full"
              style={{
                width: "32px",
                height: "32px",
                border: `1px solid ${roleBadge.border}`,
                objectFit: "cover",
                flexShrink: 0,
              }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  "https://cdn.discordapp.com/embed/avatars/0.png";
              }}
            />
            <button
              type="button"
              data-ocid="topbar.logout_button"
              onClick={logout}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded transition-all duration-150"
              style={{
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#ef4444",
                fontSize: "10px",
                fontFamily: '"JetBrains Mono", monospace',
                fontWeight: 700,
                letterSpacing: "0.06em",
                cursor: "pointer",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)";
              }}
            >
              <LogOut size={11} />
              LOGOUT
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
