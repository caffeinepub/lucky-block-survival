import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Lock, Scroll, Shield, User } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

const STAFF_RULES = `STAFF RULES & EXPECTATIONS — Lucky Block Survival 4

1. Professionalism & Conduct
• Constant Professionalism: You represent the server at all times. No offensive language directed at players.
• Lead by Example: Follow all game and server rules.
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
• Owner: Full system access`;

export function LoginPage() {
  const { login } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed || loading || !username.trim() || !password) return;
    setLoading(true);
    setError("");
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "var(--bg-deep)" }}
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(124, 58, 237, 0.08) 0%, transparent 70%)",
        }}
      />
      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage:
            "linear-gradient(rgba(124, 58, 237, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(124, 58, 237, 0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 w-full max-w-lg px-6">
        {/* Logo & Title */}
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
              src="/assets/uploads/lbsleakpvp-picsart-aiimageenhancer-019d3518-77e8-775a-891a-286b41767600-4.png"
              alt="Lucky Block Survival 4"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                img.src =
                  "/assets/uploads/colosseum_inside-019d317c-6bae-74f9-a799-9394318dfaeb-1.png";
                img.onerror = () => {
                  img.style.display = "none";
                };
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
              Authorized staff members only
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="neon-card scanlines" style={{ padding: "32px 28px" }}>
          {/* Staff Rules */}
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
                height: "180px",
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

          {/* Agreement checkbox */}
          <div
            className="flex items-start gap-3 rounded-md p-3 mb-5"
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

          {/* Sign-in form */}
          <form onSubmit={handleSignIn} className="space-y-3">
            <div className="relative">
              <User
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "var(--text-muted)" }}
              />
              <input
                type="text"
                data-ocid="login.input"
                placeholder="Username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={!agreed || loading}
                style={{
                  width: "100%",
                  paddingLeft: "36px",
                  paddingRight: "12px",
                  paddingTop: "10px",
                  paddingBottom: "10px",
                  background: agreed ? "var(--bg-deep)" : "rgba(13,13,26,0.4)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  fontFamily: '"JetBrains Mono", monospace',
                  outline: "none",
                  transition: "border-color 0.2s",
                  cursor: agreed ? "text" : "not-allowed",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-glow)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-subtle)";
                }}
              />
            </div>
            <div className="relative">
              <Lock
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "var(--text-muted)" }}
              />
              <input
                type="password"
                data-ocid="login.input"
                placeholder="Password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!agreed || loading}
                style={{
                  width: "100%",
                  paddingLeft: "36px",
                  paddingRight: "12px",
                  paddingTop: "10px",
                  paddingBottom: "10px",
                  background: agreed ? "var(--bg-deep)" : "rgba(13,13,26,0.4)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  fontFamily: '"JetBrains Mono", monospace',
                  outline: "none",
                  transition: "border-color 0.2s",
                  cursor: agreed ? "text" : "not-allowed",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-glow)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-subtle)";
                }}
              />
            </div>

            {/* Error message */}
            {error && (
              <div
                data-ocid="login.error_state"
                className="rounded-md px-3 py-2 flex items-center gap-2"
                style={{
                  background: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#ef4444",
                  fontSize: "11px",
                  fontFamily: '"JetBrains Mono", monospace',
                }}
              >
                ⚠ {error}
              </div>
            )}

            <Button
              type="submit"
              data-ocid="login.primary_button"
              disabled={!agreed || loading || !username.trim() || !password}
              className="w-full py-4 font-pixel tracking-widest"
              style={{
                fontSize: "11px",
                background:
                  agreed && !loading && username.trim() && password
                    ? "linear-gradient(135deg, var(--accent-purple), var(--accent-purple-bright))"
                    : "rgba(124, 58, 237, 0.15)",
                border: "1px solid rgba(124, 58, 237, 0.4)",
                color:
                  agreed && !loading && username.trim() && password
                    ? "#fff"
                    : "rgba(255,255,255,0.3)",
                boxShadow:
                  agreed && !loading && username.trim() && password
                    ? "0 0 16px rgba(124, 58, 237, 0.4)"
                    : "none",
                height: "44px",
                cursor:
                  agreed && !loading && username.trim() && password
                    ? "pointer"
                    : "not-allowed",
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  SIGNING IN...
                </span>
              ) : (
                "SIGN IN"
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
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
