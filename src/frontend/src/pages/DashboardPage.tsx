import { CalendarPlus, Clock, FileText, Gavel, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import type { PublicUser, PunishmentLog } from "../backend.d";
import { Role } from "../backend.d";
import { StatCard } from "../components/StatCard";
import { useActor } from "../hooks/useActor";

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

interface DashboardPageProps {
  currentUser: PublicUser;
  setActivePage: (page: string) => void;
}

export function DashboardPage({
  currentUser,
  setActivePage,
}: DashboardPageProps) {
  const { actor } = useActor();
  const [punishmentCount, setPunishmentCount] = useState<bigint>(0n);
  const [loaCount, setLoaCount] = useState<bigint>(0n);
  const [recentLogs, setRecentLogs] = useState<PunishmentLog[]>([]);
  const [recentCount, setRecentCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!actor) return;
    setLoading(true);
    Promise.all([
      actor.getPunishmentLogCount(),
      actor.getActiveLOACount(),
      actor.getAllPunishmentLogs(),
    ])
      .then(([pCount, lCount, logsResult]) => {
        setPunishmentCount(pCount);
        setLoaCount(lCount);
        if (logsResult.__kind__ === "ok") {
          const logs = logsResult.ok;
          const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          const recent = logs.filter((log) => {
            const ms = Number(log.timestamp) / 1_000_000;
            return ms > sevenDaysAgo;
          });
          setRecentCount(recent.length);
          // Show last 5 most recent
          const sorted = [...logs].sort(
            (a, b) => Number(b.timestamp) - Number(a.timestamp),
          );
          setRecentLogs(sorted.slice(0, 5));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [actor]);

  return (
    <div className="p-8">
      {/* Welcome banner */}
      <div
        className="rounded-lg mb-8 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, var(--bg-elevated), var(--bg-surface))",
          borderLeft: "4px solid var(--accent-purple-bright)",
          padding: "24px 28px",
          boxShadow: "0 0 20px rgba(124, 58, 237, 0.12)",
        }}
      >
        {/* Background decoration */}
        <div
          className="absolute right-0 top-0 bottom-0 w-64 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at right, rgba(124, 58, 237, 0.1) 0%, transparent 70%)",
          }}
        />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                marginBottom: "6px",
              }}
            >
              Welcome back,
            </p>
            <h1
              className="font-pixel"
              style={{
                fontSize: "13px",
                color: "var(--accent-purple-bright)",
                textShadow: "0 0 12px rgba(147, 51, 234, 0.4)",
                marginBottom: "10px",
              }}
            >
              {currentUser.username}
            </h1>
            <span
              className={`font-pixel inline-block px-3 py-1 rounded ${getRoleBadgeClass(currentUser.role)}`}
              style={{ fontSize: "8px" }}
            >
              ⭐ {getRoleDisplayName(currentUser.role)}
            </span>
          </div>
          <div
            className="hidden md:flex flex-col items-end gap-1"
            style={{ color: "var(--text-muted)", fontSize: "11px" }}
          >
            <p>Lucky Block Survival</p>
            <p
              style={{
                color: "var(--accent-purple)",
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "10px",
              }}
            >
              Staff Management System
            </p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      {loading ? (
        <div className="flex gap-4 mb-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex-1 neon-border rounded-lg"
              style={{
                height: "110px",
                background: "var(--bg-surface)",
                animation: "pulse 2s infinite",
              }}
            />
          ))}
        </div>
      ) : (
        <div className="flex gap-4 mb-8 flex-wrap">
          <StatCard
            data-ocid="dashboard.punishment_count_card"
            label="TOTAL PUNISHMENT LOGS"
            value={String(punishmentCount)}
            icon={<Gavel size={20} />}
            subtitle="All time"
          />
          <StatCard
            data-ocid="dashboard.loa_count_card"
            label="ACTIVE LOAs"
            value={String(loaCount)}
            icon={<Clock size={20} />}
            subtitle="Currently active"
          />
          <StatCard
            data-ocid="dashboard.recent_submissions_card"
            label="RECENT SUBMISSIONS"
            value={String(recentCount)}
            icon={<FileText size={20} />}
            subtitle="Last 7 days"
          />
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-4 mb-8 flex-wrap">
        <button
          type="button"
          data-ocid="dashboard.log_punishment_button"
          onClick={() => setActivePage("staff-logs")}
          className="btn-neon flex items-center gap-2 rounded-md py-3 px-5"
          style={{ fontSize: "11px" }}
        >
          <Plus size={14} />
          LOG PUNISHMENT
        </button>
        <button
          type="button"
          data-ocid="dashboard.submit_loa_button"
          onClick={() => setActivePage("leave-requests")}
          className="flex items-center gap-2 rounded-md py-3 px-5 transition-all duration-200"
          style={{
            fontSize: "11px",
            fontFamily: '"JetBrains Mono", monospace',
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            background: "rgba(96, 165, 250, 0.1)",
            border: "1px solid rgba(96, 165, 250, 0.4)",
            color: "var(--lb-blue, #60a5fa)",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(96, 165, 250, 0.18)";
            e.currentTarget.style.boxShadow =
              "0 0 12px rgba(96, 165, 250, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(96, 165, 250, 0.1)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <CalendarPlus size={14} />
          SUBMIT LOA
        </button>
      </div>

      {/* Recent Activity */}
      <div className="section-card">
        <h2
          className="font-pixel mb-5"
          style={{
            fontSize: "10px",
            color: "var(--text-muted)",
            letterSpacing: "0.12em",
          }}
        >
          ⚡ RECENT ACTIVITY
        </h2>
        {recentLogs.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-12"
            style={{ color: "var(--text-muted)" }}
          >
            <FileText
              size={32}
              style={{ opacity: 0.3, marginBottom: "12px" }}
            />
            <p style={{ fontSize: "12px" }}>No punishment logs yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>IGN</th>
                  <th>REASON & DATE</th>
                  <th>OFFENSE</th>
                  <th>SUBMITTED BY</th>
                  <th>TIMESTAMP</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => (
                  <tr key={String(log.id)}>
                    <td
                      style={{ fontWeight: 600, color: "var(--text-primary)" }}
                    >
                      {log.ign}
                    </td>
                    <td
                      style={{
                        color: "var(--text-muted)",
                        maxWidth: "200px",
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
                    <td style={{ color: "var(--text-muted)" }}>
                      {log.submittedBy}
                    </td>
                    <td
                      style={{ fontSize: "11px", color: "var(--text-muted)" }}
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
