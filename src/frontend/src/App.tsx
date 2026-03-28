import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";
import type { PublicUser } from "./backend.d";
import { Layout } from "./components/Layout";
import {
  AuthProvider,
  discordUserToPublicUser,
  useAuth,
} from "./contexts/AuthContext";
import { AdminPanelPage } from "./pages/AdminPanelPage";
import { AppealsPage } from "./pages/AppealsPage";
import { CallbackPage } from "./pages/CallbackPage";
import { CommandVaultPage } from "./pages/CommandVaultPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LeaveRequestsPage } from "./pages/LeaveRequestsPage";
import { LoginPage } from "./pages/LoginPage";
import { PunishmentLoggerPage } from "./pages/PunishmentLoggerPage";
import { PunishmentMatrixPage } from "./pages/PunishmentMatrixPage";
import { StaffConductPage } from "./pages/StaffConductPage";
import { StaffLogsPage } from "./pages/StaffLogsPage";

function AppShell() {
  const { discordUser, loading } = useAuth();
  const [activePage, setActivePage] = useState("dashboard");

  if (loading) {
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
            LOADING...
          </p>
        </div>
      </div>
    );
  }

  if (!discordUser) {
    return (
      <>
        <LoginPage />
        <Toaster />
      </>
    );
  }

  const currentUser: PublicUser = discordUserToPublicUser(discordUser);

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return (
          <DashboardPage
            currentUser={currentUser}
            setActivePage={setActivePage}
          />
        );
      case "punishment-logger":
        return <PunishmentLoggerPage currentUser={currentUser} />;
      case "punishment-matrix":
        return <PunishmentMatrixPage currentUser={currentUser} />;
      case "command-vault":
        return <CommandVaultPage currentUser={currentUser} />;
      case "staff-logs":
        return <StaffLogsPage currentUser={currentUser} />;
      case "leave-requests":
        return <LeaveRequestsPage currentUser={currentUser} />;
      case "appeals":
        return <AppealsPage currentUser={currentUser} />;
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
      >
        {renderPage()}
      </Layout>
      <Toaster />
    </>
  );
}

export default function App() {
  const path = window.location.pathname;
  const isCallback =
    path === "/callback" ||
    path.endsWith("/callback") ||
    path.includes("/callback?");

  if (isCallback) {
    return (
      <AuthProvider>
        <CallbackPage />
        <Toaster />
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
