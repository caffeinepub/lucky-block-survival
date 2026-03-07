import {
  AlertTriangle,
  BookOpen,
  Eye,
  Lock,
  MessageSquare,
  Shield,
  Star,
  Zap,
} from "lucide-react";

interface ConductSection {
  title: string;
  icon: React.ReactNode;
  color: string;
  items: string[];
}

const CONDUCT_SECTIONS: ConductSection[] = [
  {
    title: "Professionalism",
    icon: <Star size={16} />,
    color: "#f59e0b",
    items: [
      "Remain professional at all times across all platforms including other servers.",
      "Avoid swearing or offensive language directed at players.",
    ],
  },
  {
    title: "Abusing Permissions",
    icon: <AlertTriangle size={16} />,
    color: "#ef4444",
    items: [
      "Any abuse of staff permissions whether serious or joking results in demotion.",
    ],
  },
  {
    title: "Punishment Privacy",
    icon: <Eye size={16} />,
    color: "#60a5fa",
    items: [
      "Do not disclose to players who punished them.",
      "If you punished a player you may choose to tell them at your own risk.",
      "Never provide evidence to a player about their punishment — direct them to submit an appeal.",
      "If a player asks how long they are punished you are obligated to tell them according to punishment logs.",
    ],
  },
  {
    title: "Staff-Only Information",
    icon: <Lock size={16} />,
    color: "#a78bfa",
    items: [
      "Confidential info must remain within the team.",
      "Sharing staff guides, appeal data, or reports is strictly prohibited and will result in punishment.",
    ],
  },
  {
    title: "Ban Appeals & Punishments",
    icon: <Shield size={16} />,
    color: "#34d399",
    items: [
      "Appeals handled by co-owners and above.",
      "If a player wants to appeal, direct them to create an appeal ticket.",
    ],
  },
  {
    title: "Staff Expectations",
    icon: <Star size={16} />,
    color: "#9333ea",
    items: [
      "Lead by example, follow all game and Discord rules.",
      "Use permissions for moderation purposes only.",
      "Jokingly punishing players or other staff is not tolerated unless they give consent.",
      "Update #loa if taking time off.",
      "Always check punishment history before issuing new punishments.",
      "Spend at least 1-2 hours per week active on the server; go LOA if inactive.",
    ],
  },
  {
    title: "3-Strike System",
    icon: <AlertTriangle size={16} />,
    color: "#fb923c",
    items: [
      "3 chances total; each strike = 1 less chance.",
      "Each major mistake = 1 strike.",
      "Every 3-5 minor mistakes = 1 strike.",
      "Strikes can be erased by owner or co-owners if you contribute enough.",
      "Owners and co-owners responsible for giving and erasing strikes.",
      "Staff punishments can be appealed by owner and co-owners.",
    ],
  },
  {
    title: "Staff Permissions",
    icon: <Zap size={16} />,
    color: "#4ade80",
    items: [
      "All staff given permissions based on their role.",
      "If permissions are missing or broken, notify the Owner immediately.",
      "Do not try to change or bypass permissions.",
    ],
  },
];

export function StaffConductPage() {
  return (
    <div className="p-8">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-8">
        <div
          className="flex items-center justify-center rounded-lg"
          style={{
            width: "40px",
            height: "40px",
            background: "rgba(124, 58, 237, 0.15)",
            border: "1px solid var(--border-glow)",
          }}
        >
          <BookOpen
            size={20}
            style={{ color: "var(--accent-purple-bright)" }}
          />
        </div>
        <div>
          <h1 className="page-header">STAFF CONDUCT</h1>
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              marginTop: "2px",
            }}
          >
            Official rules, guidelines, and expectations for all staff members
          </p>
        </div>
      </div>

      {/* Important banner */}
      <div
        className="rounded-lg mb-8 flex items-center gap-3"
        style={{
          background: "rgba(239, 68, 68, 0.08)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          padding: "14px 18px",
        }}
      >
        <AlertTriangle size={16} style={{ color: "#ef4444", flexShrink: 0 }} />
        <p style={{ fontSize: "12px", color: "#ef4444", fontWeight: 600 }}>
          All staff members are expected to read, understand, and comply with
          these guidelines. Violations may result in strikes, demotion, or
          removal.
        </p>
      </div>

      {/* Sections grid */}
      <div
        className="grid gap-5"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(500px, 1fr))" }}
      >
        {CONDUCT_SECTIONS.map((section, idx) => (
          <div
            key={section.title}
            data-ocid={`staff_conduct.section.${idx + 1}`}
            className="conduct-card"
            style={{ borderLeftColor: section.color }}
          >
            {/* Section header */}
            <div className="flex items-center gap-2 mb-4">
              <div
                className="flex items-center justify-center rounded"
                style={{
                  width: "30px",
                  height: "30px",
                  background: `${section.color}20`,
                  border: `1px solid ${section.color}40`,
                  color: section.color,
                  flexShrink: 0,
                }}
              >
                {section.icon}
              </div>
              <h3
                className="font-pixel"
                style={{
                  fontSize: "10px",
                  color: section.color,
                  letterSpacing: "0.08em",
                }}
              >
                {section.title}
              </h3>
            </div>

            {/* Items */}
            <ul className="flex flex-col gap-2">
              {section.items.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2"
                  style={{
                    fontSize: "13px",
                    color: "var(--text-primary)",
                    lineHeight: 1.6,
                  }}
                >
                  <span
                    style={{
                      color: section.color,
                      marginTop: "5px",
                      flexShrink: 0,
                      width: "6px",
                      height: "6px",
                      borderRadius: "1px",
                      background: section.color,
                      display: "inline-block",
                    }}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Summary footer */}
      <div
        className="mt-8 rounded-lg flex items-center gap-4"
        style={{
          background:
            "linear-gradient(135deg, rgba(124, 58, 237, 0.08), rgba(147, 51, 234, 0.05))",
          border: "1px solid var(--border-subtle)",
          padding: "20px 24px",
        }}
      >
        <BookOpen
          size={24}
          style={{ color: "var(--accent-purple)", flexShrink: 0 }}
        />
        <div>
          <p
            className="font-pixel"
            style={{
              fontSize: "9px",
              color: "var(--accent-purple-bright)",
              marginBottom: "6px",
            }}
          >
            REMEMBER
          </p>
          <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            As a staff member, you represent Lucky Block Survival. Your conduct
            reflects on the entire server. Lead by example and create a positive
            environment for all players.
          </p>
        </div>
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
