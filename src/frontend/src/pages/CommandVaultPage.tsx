import { Check, Copy, Terminal } from "lucide-react";
import { useState } from "react";
import type { PublicUser } from "../backend.d";
import { Role } from "../backend.d";

interface Command {
  cmd: string;
  description: string;
}

const STAFF_COMMANDS: Command[] = [
  { cmd: "/staffme", description: "Targets yourself" },
  { cmd: "/jail [player]", description: "Jail a player" },
  { cmd: "/free [player]", description: "Free a jailed player" },
  { cmd: "/checknick [player]", description: "Check player nickname" },
  { cmd: "/h kick [player]", description: "Kick a player from server" },
  { cmd: "/h mute [player]", description: "Mute a player" },
  { cmd: "/checkstats [player]", description: "Check player statistics" },
  { cmd: "/checkitem [player]", description: "Check player held item" },
];

const COOWNER_EXTRA_COMMANDS: Command[] = [
  { cmd: "/selfadmin", description: "Targets yourself — co-owner admin mode" },
  { cmd: "/clearinv [player]", description: "Clear a player's inventory" },
  { cmd: "/h ban [player]", description: "Ban a player from server" },
  { cmd: "/adminmenu", description: "Open the admin menu" },
];

interface CommandCardProps {
  cmd: string;
  description: string;
  index: number;
}

function CommandCard({ cmd, description, index }: CommandCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(cmd.split(" ")[0]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="code-block"
      data-ocid={`command_vault.copy_button.${index}`}
    >
      <div className="flex-1 min-w-0">
        <span className="code-block-text">{cmd}</span>
        <p
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            marginTop: "4px",
          }}
        >
          {description}
        </p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded transition-all duration-200 flex-shrink-0"
        style={{
          background: copied
            ? "rgba(74, 222, 128, 0.15)"
            : "rgba(124, 58, 237, 0.15)",
          border: copied
            ? "1px solid rgba(74, 222, 128, 0.4)"
            : "1px solid rgba(124, 58, 237, 0.4)",
          color: copied ? "#4ade80" : "var(--accent-purple-bright)",
          fontSize: "10px",
          fontFamily: '"JetBrains Mono", monospace',
          fontWeight: 700,
          cursor: "pointer",
          letterSpacing: "0.06em",
        }}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? "COPIED!" : "COPY"}
      </button>
    </div>
  );
}

interface CommandVaultPageProps {
  currentUser: PublicUser;
}

export function CommandVaultPage({ currentUser }: CommandVaultPageProps) {
  const [activeTab, setActiveTab] = useState("staff");

  const isOwner = currentUser.role === Role.Owner;
  const isCoOwner = currentUser.role === Role.CoOwner || isOwner;

  const tabs = [
    {
      id: "staff",
      label: "Staff/Builder",
      show: true,
      ocid: "command_vault.staff_tab",
    },
    {
      id: "coowner",
      label: "Co-Owner",
      show: isCoOwner,
      ocid: "command_vault.coowner_tab",
    },
    {
      id: "owner",
      label: "Owner",
      show: isOwner,
      ocid: "command_vault.owner_tab",
    },
  ].filter((t) => t.show);

  const staffCmds = STAFF_COMMANDS;
  const coOwnerCmds = [...STAFF_COMMANDS, ...COOWNER_EXTRA_COMMANDS];
  const ownerCmds = coOwnerCmds;

  const getCommandsForTab = (tabId: string): Command[] => {
    switch (tabId) {
      case "staff":
        return staffCmds;
      case "coowner":
        return coOwnerCmds;
      case "owner":
        return ownerCmds;
      default:
        return staffCmds;
    }
  };

  const currentCommands = getCommandsForTab(activeTab);

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
          <Terminal
            size={20}
            style={{ color: "var(--accent-purple-bright)" }}
          />
        </div>
        <div>
          <h1 className="page-header">THE COMMAND VAULT</h1>
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              marginTop: "2px",
            }}
          >
            Staff commands organized by permission level
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div
        className="rounded-lg mb-6 flex items-center gap-3"
        style={{
          background: "rgba(124, 58, 237, 0.08)",
          border: "1px solid var(--border-subtle)",
          padding: "12px 16px",
        }}
      >
        <Terminal
          size={14}
          style={{ color: "var(--accent-purple)", flexShrink: 0 }}
        />
        <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
          Commands shown are based on your permission level.{" "}
          <span style={{ color: "var(--text-primary)" }}>
            You are viewing commands for: {currentUser.role}
          </span>
        </p>
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
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            data-ocid={tab.ocid}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2 rounded-md transition-all duration-200"
            style={{
              fontSize: "10px",
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: "pointer",
              border:
                activeTab === tab.id
                  ? "1px solid var(--border-glow)"
                  : "1px solid transparent",
              background:
                activeTab === tab.id
                  ? "rgba(124, 58, 237, 0.2)"
                  : "transparent",
              color:
                activeTab === tab.id
                  ? "var(--accent-purple-bright)"
                  : "var(--text-muted)",
              boxShadow:
                activeTab === tab.id
                  ? "0 0 10px var(--accent-purple-glow)"
                  : "none",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Commands grid */}
      <div
        className="neon-border rounded-lg p-6"
        style={{ background: "var(--bg-surface)" }}
      >
        {/* Tab note for owner */}
        {activeTab === "owner" && (
          <div
            className="flex items-center gap-2 rounded mb-5 py-3 px-4"
            style={{
              background: "rgba(245, 158, 11, 0.08)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
            }}
          >
            <span style={{ fontSize: "12px", color: "#f59e0b" }}>
              ⭐ Owner has access to all commands from all permission levels.
            </span>
          </div>
        )}
        {activeTab === "coowner" && (
          <div
            className="flex items-center gap-2 rounded mb-5 py-3 px-4"
            style={{
              background: "rgba(147, 51, 234, 0.08)",
              border: "1px solid rgba(147, 51, 234, 0.3)",
            }}
          >
            <span
              style={{ fontSize: "12px", color: "var(--accent-purple-bright)" }}
            >
              Co-Owner commands include all Staff/Builder permissions plus
              additional admin tools.
            </span>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {currentCommands.map((cmd, idx) => (
            <CommandCard
              key={cmd.cmd}
              cmd={cmd.cmd}
              description={cmd.description}
              index={idx + 1}
            />
          ))}
        </div>

        <p
          className="mt-5 font-pixel"
          style={{
            fontSize: "9px",
            color: "var(--text-muted)",
            letterSpacing: "0.08em",
          }}
        >
          {currentCommands.length} commands available for{" "}
          {activeTab === "staff"
            ? "Staff/Builder"
            : activeTab === "coowner"
              ? "Co-Owner"
              : "Owner"}
        </p>
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
