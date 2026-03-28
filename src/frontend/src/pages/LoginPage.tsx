import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Scroll, Shield } from "lucide-react";
import { useState } from "react";
import { SiDiscord } from "react-icons/si";

const STAFF_RULES = `STAFF RULES & EXPECTATIONS — Lucky Block Survival 4

1. Professionalism & Conduct
• Constant Professionalism: You represent the server at all times. No offensive language directed at players.
• Lead by Example: Follow all game and Discord rules.
• Zero Abuse Tolerance: Any abuse of permissions results in immediate demotion.

2. Punishment & Privacy Protocols
• Confidentiality: Do not disclose who issued a punishment.
• Evidence Handling: Internal evidence is Staff-Only. Never share with players. Direct to Appeal Ticket system.
• Obligation to Inform: Tell players their punishment duration exactly as recorded.
• Logging Requirement: You must log every punishment. Failure results in disciplinary action.

3. Operational Standards
• LOA Policy: Update the LOA section if taking time off. Active LOAs prevent Ghost Staff flags.
• Activity Requirements: Maintain at least 1–2 hours of active moderation per week.
• Hierarchy Respect: Lower-ranking staff may not modify or override higher-ranking staff actions.
• Fairness: Always check player history including alts before issuing punishment.

4. Technical Commands
• Staff/Builder: /staffme, /jail, /free, /checknick, /h kick, /h mute, /checkstats, /checkitem
• Co-Owner: All above + /selfadmin, /clearinv, /h ban, /adminmenu
• Owner: Full system access and key generation`;

export function LoginPage() {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDiscordLogin = () => {
    if (!agreed || loading) return;
    setLoading(true);
    window.location.href =
      "https://discord.com/oauth2/authorize?client_id=1487232430279622879&response_type=code&redirect_uri=https%3A%2F%2Flucky-block-survival-o1t.caffeine.xyz%2F&scope=identify+guilds.members.read";
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "var(--bg-deep)" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(124, 58, 237, 0.08) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage:
            "linear-gradient(rgba(124, 58, 237, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(124, 58, 237, 0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 w-full max-w-lg px-6">
        <div className="flex flex-col items-center mb-8 gap-4">
          <div
            className="flex items-center justify-center rounded-xl animate-neon-pulse"
            style={{
              width: "88px",
              height: "88px",
              background:
                "linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(147, 51, 234, 0.1))",
              border: "1px solid var(--border-glow)",
              boxShadow: "0 0 30px rgba(124, 58, 237, 0.3)",
              overflow: "hidden",
            }}
          >
            <img
              src="/assets/uploads/colosseum_inside-019d317c-6bae-74f9-a799-9394318dfaeb-1.png"
              alt="Lucky Block Survival 4"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  "/assets/generated/lucky-block-logo-transparent.dim_200x200.png";
                (e.currentTarget as HTMLImageElement).style.objectFit =
                  "contain";
              }}
            />
          </div>
          <div className="text-center">
            <h1
              className="font-pixel neon-glow-text"
              style={{
                fontSize: "13px",
                letterSpacing: "0.06em",
                marginBottom: "6px",
              }}
            >
              LUCKY BLOCK SURVIVAL 4
            </h1>
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-secondary)",
                marginBottom: "4px",
              }}
            >
              Staff Portal
            </p>
            <p
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
              }}
            >
              <Shield size={11} />
              Authorized Discord staff members only
            </p>
          </div>
        </div>

        <div className="neon-card scanlines" style={{ padding: "32px 28px" }}>
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <Scroll
                size={12}
                style={{ color: "var(--accent-purple-bright)" }}
              />
              <span
                className="font-pixel"
                style={{
                  fontSize: "9px",
                  color: "var(--text-muted)",
                  letterSpacing: "0.1em",
                }}
              >
                STAFF RULES & EXPECTATIONS
              </span>
            </div>
            <ScrollArea
              className="rounded-md"
              style={{
                height: "200px",
                background: "var(--bg-deep)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div
                className="p-4"
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  lineHeight: 1.7,
                  whiteSpace: "pre-line",
                }}
              >
                {STAFF_RULES}
              </div>
            </ScrollArea>
          </div>

          <div
            className="flex items-start gap-3 rounded-md p-3 mb-6"
            style={{
              background: "rgba(124, 58, 237, 0.06)",
              border: "1px solid rgba(124, 58, 237, 0.2)",
            }}
          >
            <Checkbox
              id="agree-rules"
              data-ocid="login.checkbox"
              checked={agreed}
              onCheckedChange={(v) => setAgreed(!!v)}
              className="mt-0.5 flex-shrink-0"
            />
            <Label
              htmlFor="agree-rules"
              style={{
                fontSize: "11px",
                color: "var(--text-secondary)",
                lineHeight: 1.5,
                cursor: "pointer",
              }}
            >
              I have read the Staff Rules and agree to maintain the integrity of
              the server.
            </Label>
          </div>

          <button
            type="button"
            data-ocid="login.primary_button"
            onClick={handleDiscordLogin}
            disabled={!agreed || loading}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-lg transition-all duration-200"
            style={{
              background:
                agreed && !loading ? "#5865F2" : "rgba(88, 101, 242, 0.2)",
              border: "1px solid rgba(88, 101, 242, 0.5)",
              color: agreed && !loading ? "#ffffff" : "rgba(255,255,255,0.3)",
              cursor: agreed && !loading ? "pointer" : "not-allowed",
              fontSize: "13px",
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 700,
              letterSpacing: "0.04em",
              boxShadow:
                agreed && !loading
                  ? "0 0 20px rgba(88, 101, 242, 0.4)"
                  : "none",
            }}
            onMouseEnter={(e) => {
              if (!agreed || loading) return;
              e.currentTarget.style.boxShadow =
                "0 0 32px rgba(88, 101, 242, 0.6)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow =
                agreed && !loading
                  ? "0 0 20px rgba(88, 101, 242, 0.4)"
                  : "none";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {loading ? (
              <>
                <div
                  className="animate-spin rounded-full flex-shrink-0"
                  style={{
                    width: "18px",
                    height: "18px",
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "white",
                  }}
                />
                REDIRECTING...
              </>
            ) : (
              <>
                <SiDiscord size={20} />
                LOGIN WITH DISCORD
              </>
            )}
          </button>
        </div>

        <p
          className="text-center mt-6"
          style={{ fontSize: "10px", color: "var(--text-muted)" }}
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
        </p>
      </div>
    </div>
  );
}
