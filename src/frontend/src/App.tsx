import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";
import type { PublicUser } from "./backend.d";
import { Layout } from "./components/Layout";
import { useActor } from "./hooks/useActor";
import { AdminPanelPage } from "./pages/AdminPanelPage";
import { CommandVaultPage } from "./pages/CommandVaultPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LeaveRequestsPage } from "./pages/LeaveRequestsPage";
import { LoginPage } from "./pages/LoginPage";
import { PunishmentMatrixPage } from "./pages/PunishmentMatrixPage";
import { StaffConductPage } from "./pages/StaffConductPage";
import { StaffLogsPage } from "./pages/StaffLogsPage";

const SESSION_KEY = "staff_session";
const CURRENT_OWNER_USERNAME = "Sirbrit_";

function loadSessionFromStorage(): PublicUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as PublicUser;
    // Clear stale sessions from old owner usernames so they don't cause "invalid session" errors
    if (
      (user.role as string) === "Owner" &&
      user.username !== CURRENT_OWNER_USERNAME
    ) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

export default function App() {
  const { isFetching } = useActor();
  const [currentUser, setCurrentUser] = useState<PublicUser | null>(() =>
    loadSessionFromStorage(),
  );
  const [activePage, setActivePage] = useState("dashboard");

  const handleLogin = (user: PublicUser) => {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify(user, (_, v) =>
        typeof v === "bigint" ? v.toString() : v,
      ),
    );
    setCurrentUser(user);
    setActivePage("dashboard");
  };

  const handleLogout = async () => {
    localStorage.removeItem(SESSION_KEY);
    setCurrentUser(null);
  };

  // Show loading spinner while the actor/canister connection is being established
  if (isFetching) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg-deep)" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="animate-neon-pulse rounded-lg flex items-center justify-center"
            style={{
              width: "60px",
              height: "60px",
              background: "rgba(124, 58, 237, 0.15)",
              border: "1px solid var(--border-glow)",
            }}
          >
            <div
              className="animate-spin rounded-full"
              style={{
                width: "24px",
                height: "24px",
                border: "2px solid rgba(124, 58, 237, 0.3)",
                borderTopColor: "var(--accent-purple-bright)",
              }}
            />
          </div>
          <p
            className="font-pixel"
            style={{
              fontSize: "9px",
              color: "var(--accent-purple)",
              letterSpacing: "0.1em",
            }}
          >
            CONNECTING...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <Toaster />
      </>
    );
  }

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return (
          <DashboardPage
            currentUser={currentUser}
            setActivePage={setActivePage}
          />
        );
      case "punishment-matrix":
        return <PunishmentMatrixPage currentUser={currentUser} />;
      case "command-vault":
        return <CommandVaultPage currentUser={currentUser} />;
      case "staff-logs":
        return <StaffLogsPage currentUser={currentUser} />;
      case "leave-requests":
        return <LeaveRequestsPage currentUser={currentUser} />;
      case "staff-conduct":
        return <StaffConductPage />;
      case "admin-panel":
        return <AdminPanelPage currentUser={currentUser} />;
      default:
        return (
          <DashboardPage
            currentUser={currentUser}
            setActivePage={setActivePage}
          />
        );
    }
  };

  return (
    <>
      <Layout
        activePage={activePage}
        setActivePage={setActivePage}
        currentUser={currentUser}
        onLogout={handleLogout}
      >
        {renderPage()}
      </Layout>
      <Toaster />
    </>
  );
}
