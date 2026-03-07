import {
  BookOpen,
  Clock,
  Gavel,
  LayoutGrid,
  LogOut,
  ScrollText,
  Settings,
  Terminal,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import type { PublicUser } from "../backend.d";
import { Role } from "../backend.d";

interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  roleRequired?: Role[];
  ocid: string;
}

const navItems: NavItem[] = [
  {
    id: "dashboard",
    label: "DASHBOARD",
    icon: <LayoutGrid size={16} />,
    ocid: "nav.dashboard_link",
  },
  {
    id: "punishment-matrix",
    label: "PUNISHMENT MATRIX",
    icon: <Gavel size={16} />,
    ocid: "nav.punishment_matrix_link",
  },
  {
    id: "command-vault",
    label: "COMMAND VAULT",
    icon: <Terminal size={16} />,
    ocid: "nav.command_vault_link",
  },
  {
    id: "staff-logs",
    label: "STAFF LOGS",
    icon: <ScrollText size={16} />,
    ocid: "nav.staff_logs_link",
  },
  {
    id: "leave-requests",
    label: "LEAVE REQUESTS",
    icon: <Clock size={16} />,
    ocid: "nav.leave_requests_link",
  },
  {
    id: "staff-conduct",
    label: "STAFF CONDUCT",
    icon: <BookOpen size={16} />,
    ocid: "nav.staff_conduct_link",
  },
  {
    id: "admin-panel",
    label: "ADMIN PANEL",
    icon: <Settings size={16} />,
    roleRequired: [Role.Owner],
    ocid: "nav.admin_panel_link",
  },
];

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

interface LayoutProps {
  children: ReactNode;
  activePage: string;
  setActivePage: (page: string) => void;
  currentUser: PublicUser;
  onLogout: () => void;
}

export function Layout({
  children,
  activePage,
  setActivePage,
  currentUser,
  onLogout,
}: LayoutProps) {
  const visibleNavItems = navItems.filter((item) => {
    if (!item.roleRequired) return true;
    return item.roleRequired.includes(currentUser.role);
  });

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-base)" }}>
      {/* Sidebar */}
      <aside
        className="fixed left-0 top-0 h-full flex flex-col z-50"
        style={{
          width: "240px",
          background: "var(--bg-deep)",
          borderRight: "1px solid var(--border-glow)",
          boxShadow: "4px 0 20px rgba(124, 58, 237, 0.15)",
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
            }}
          >
            <Zap size={16} style={{ color: "var(--accent-purple-bright)" }} />
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

        {/* Nav items */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {visibleNavItems.map((item) => (
            <button
              key={item.id}
              type="button"
              data-ocid={item.ocid}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-all duration-200 ${
                activePage === item.id ? "nav-active" : ""
              }`}
              style={{
                color:
                  activePage === item.id
                    ? "var(--accent-purple-bright)"
                    : "var(--text-muted)",
                fontSize: "10px",
                fontFamily: '"JetBrains Mono", monospace',
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                borderLeft:
                  activePage === item.id
                    ? "3px solid var(--accent-purple-bright)"
                    : "3px solid transparent",
                cursor: "pointer",
                background: "none",
                border: "none",
              }}
            >
              <span
                style={{
                  opacity: activePage === item.id ? 1 : 0.6,
                  color:
                    activePage === item.id
                      ? "var(--accent-purple-bright)"
                      : "var(--text-muted)",
                }}
              >
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Bottom: User info + logout */}
        <div
          className="px-4 py-4"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
              style={{
                width: "36px",
                height: "36px",
                background: "rgba(124, 58, 237, 0.2)",
                border: "1px solid var(--border-glow)",
                color: "var(--accent-purple-bright)",
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              {currentUser.username.charAt(0).toUpperCase()}
            </div>
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
                {currentUser.username}
              </p>
              <span
                className={`inline-block text-xs px-2 py-0.5 rounded font-pixel ${getRoleBadgeClass(currentUser.role)}`}
                style={{ fontSize: "8px" }}
              >
                {getRoleDisplayName(currentUser.role)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
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

      {/* Main content */}
      <main
        className="flex-1 overflow-y-auto"
        style={{ marginLeft: "240px", minHeight: "100vh" }}
      >
        {children}
      </main>
    </div>
  );
}
