import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SiDiscord } from "react-icons/si";
import { type DiscordUser, saveDiscordSession } from "../contexts/AuthContext";
import { useActor } from "../hooks/useActor";

export function CallbackPage() {
  const { actor, isFetching } = useActor();
  const [error, setError] = useState<string | null>(null);
  const hasCalledRef = useRef(false);

  useEffect(() => {
    if (isFetching || !actor || hasCalledRef.current) return;
    hasCalledRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) {
      setError("No authorization code received from Discord.");
      return;
    }

    const redirectUri = `${window.location.origin}/`;

    (async () => {
      try {
        const result = await actor.discordCallback(code, redirectUri);
        // Candid variants come as { ok: value } or { err: message } — no __kind__
        if ("ok" in result) {
          const data = result.ok as DiscordUser;
          saveDiscordSession(data);
          window.location.href = "/";
        } else {
          const errMsg =
            "err" in result && result.err
              ? String(result.err)
              : "Access denied. You do not have a valid staff role on this server.";
          setError(errMsg);
        }
      } catch (e) {
        console.error("Discord callback error:", e);
        const msg = e instanceof Error ? e.message : String(e);
        setError(`Authentication error: ${msg}`);
      }
    })();
  }, [actor, isFetching]);

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "var(--bg-deep)" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(88, 101, 242, 0.07) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center max-w-md w-full">
        <div
          className="flex items-center justify-center rounded-xl"
          style={{
            width: "72px",
            height: "72px",
            background:
              "linear-gradient(135deg, rgba(88, 101, 242, 0.2), rgba(124, 58, 237, 0.15))",
            border: "1px solid rgba(88, 101, 242, 0.3)",
            boxShadow: "0 0 24px rgba(88, 101, 242, 0.3)",
            overflow: "hidden",
          }}
        >
          <img
            src="/assets/uploads/colosseum_inside-019d317c-6bae-74f9-a799-9394318dfaeb-1.png"
            alt="LBS4"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                "/assets/generated/lucky-block-logo-transparent.dim_200x200.png";
              (e.currentTarget as HTMLImageElement).style.objectFit = "contain";
            }}
          />
        </div>

        {!error ? (
          <div
            className="neon-card p-8 w-full"
            data-ocid="callback.loading_state"
          >
            <div className="flex flex-col items-center gap-5">
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: "56px",
                  height: "56px",
                  background: "rgba(88, 101, 242, 0.12)",
                  border: "1px solid rgba(88, 101, 242, 0.3)",
                }}
              >
                {isFetching ? (
                  <Loader2
                    size={24}
                    className="animate-spin"
                    style={{ color: "#5865F2" }}
                  />
                ) : (
                  <SiDiscord size={24} style={{ color: "#5865F2" }} />
                )}
              </div>
              <div>
                <p
                  className="font-pixel neon-glow-text"
                  style={{
                    fontSize: "11px",
                    letterSpacing: "0.08em",
                    marginBottom: "8px",
                  }}
                >
                  VERIFYING DISCORD ACCOUNT
                </p>
                <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  Checking your staff role permissions...
                </p>
              </div>
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="rounded-full"
                    style={{
                      width: "6px",
                      height: "6px",
                      background: "#5865F2",
                      animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div
            className="neon-card p-8 w-full"
            data-ocid="callback.error_state"
          >
            <div className="flex flex-col items-center gap-5">
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: "56px",
                  height: "56px",
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                }}
              >
                <AlertCircle size={24} style={{ color: "#ef4444" }} />
              </div>
              <div>
                <p
                  className="font-pixel"
                  style={{
                    fontSize: "11px",
                    color: "#ef4444",
                    letterSpacing: "0.08em",
                    marginBottom: "8px",
                    textShadow: "0 0 8px rgba(239, 68, 68, 0.5)",
                  }}
                >
                  ACCESS DENIED
                </p>
                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                    marginBottom: "10px",
                  }}
                >
                  {error}
                </p>
                <p
                  style={{
                    fontSize: "10px",
                    color: "var(--text-muted)",
                    lineHeight: 1.6,
                  }}
                >
                  Common causes: Bot not in server, role not assigned, or
                  redirect URI mismatch in Discord Developer Portal.
                </p>
              </div>
              <a
                href="/"
                data-ocid="callback.primary_button"
                className="flex items-center gap-2 py-3 px-6 rounded-lg transition-all duration-200"
                style={{
                  background: "rgba(88, 101, 242, 0.12)",
                  border: "1px solid rgba(88, 101, 242, 0.4)",
                  color: "#5865F2",
                  fontSize: "11px",
                  fontFamily: '"JetBrains Mono", monospace',
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textDecoration: "none",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(88, 101, 242, 0.2)";
                  e.currentTarget.style.boxShadow =
                    "0 0 16px rgba(88, 101, 242, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(88, 101, 242, 0.12)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <SiDiscord size={14} />
                TRY AGAIN
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
