import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  subtitle?: string;
  "data-ocid"?: string;
}

export function StatCard({
  label,
  value,
  icon,
  subtitle,
  "data-ocid": dataOcid,
}: StatCardProps) {
  return (
    <div
      data-ocid={dataOcid}
      className="neon-card relative overflow-hidden flex-1 min-w-[200px]"
      style={{ padding: "20px 24px" }}
    >
      {/* Background glow effect */}
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10"
        style={{
          background:
            "radial-gradient(circle, var(--accent-purple-bright), transparent)",
          transform: "translate(30%, -30%)",
        }}
      />
      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1">
          <p
            className="font-pixel"
            style={{
              fontSize: "9px",
              color: "var(--text-muted)",
              marginBottom: "12px",
              letterSpacing: "0.12em",
            }}
          >
            {label}
          </p>
          <p className="stat-number">{value}</p>
          {subtitle && (
            <p
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                marginTop: "6px",
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        <div
          className="flex items-center justify-center rounded-lg"
          style={{
            width: "44px",
            height: "44px",
            background: "rgba(124, 58, 237, 0.15)",
            border: "1px solid rgba(124, 58, 237, 0.3)",
            color: "var(--accent-purple-bright)",
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
