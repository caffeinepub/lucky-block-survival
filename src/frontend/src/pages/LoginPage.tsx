import { Eye, EyeOff, Shield, Sword } from "lucide-react";
import { useState } from "react";
import type { PublicUser } from "../backend.d";
import { useActor } from "../hooks/useActor";
import { sha256Hex } from "../lib/crypto";

interface LoginPageProps {
  onLogin: (user: PublicUser) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const { actor } = useActor();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor) {
      setError("Connection error. Please try again.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const hashedPassword = await sha256Hex(password);
      const loginResult = await actor.login(username, hashedPassword);
      if (loginResult.__kind__ === "err") {
        setError("Invalid credentials. Access denied.");
        return;
      }
      onLogin(loginResult.ok);
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "var(--bg-deep)" }}
    >
      {/* Background atmospheric effects */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(124, 58, 237, 0.08) 0%, transparent 70%)",
        }}
      />
      {/* Grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage:
            "linear-gradient(rgba(124, 58, 237, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(124, 58, 237, 0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo / Icon */}
        <div className="flex justify-center mb-8">
          <div
            className="flex items-center justify-center rounded-xl animate-neon-pulse"
            style={{
              width: "80px",
              height: "80px",
              background:
                "linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(147, 51, 234, 0.1))",
              border: "1px solid var(--border-glow)",
              boxShadow: "0 0 30px rgba(124, 58, 237, 0.3)",
            }}
          >
            <Shield
              size={36}
              style={{ color: "var(--accent-purple-bright)" }}
            />
          </div>
        </div>

        {/* Main card */}
        <div
          className="neon-card scanlines relative"
          style={{ padding: "40px 36px" }}
        >
          {/* Title */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Sword
                size={14}
                style={{ color: "var(--accent-purple-bright)" }}
              />
              <h1
                className="font-pixel neon-glow-text"
                style={{ fontSize: "11px", letterSpacing: "0.08em" }}
              >
                STAFF CREDENTIALS REQUIRED
              </h1>
              <Sword
                size={14}
                style={{
                  color: "var(--accent-purple-bright)",
                  transform: "scaleX(-1)",
                }}
              />
            </div>
            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Lucky Block Survival — Staff Portal
            </p>
          </div>

          {/* Divider */}
          <div
            className="mb-8"
            style={{
              height: "1px",
              background:
                "linear-gradient(90deg, transparent, var(--border-glow), transparent)",
            }}
          />

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label
                htmlFor="login-username"
                className="block font-pixel mb-2"
                style={{
                  fontSize: "9px",
                  color: "var(--text-muted)",
                  letterSpacing: "0.1em",
                }}
              >
                USERNAME
              </label>
              <input
                id="login-username"
                data-ocid="login.username_input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                className="dark-input w-full rounded-md"
                style={{
                  padding: "10px 14px",
                  fontSize: "13px",
                  background: "var(--bg-deep)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                  outline: "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--border-glow)";
                  e.target.style.boxShadow =
                    "0 0 8px var(--accent-purple-glow)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--border-subtle)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block font-pixel mb-2"
                style={{
                  fontSize: "9px",
                  color: "var(--text-muted)",
                  letterSpacing: "0.1em",
                }}
              >
                PASSWORD
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  data-ocid="login.password_input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="dark-input w-full rounded-md"
                  style={{
                    padding: "10px 40px 10px 14px",
                    fontSize: "13px",
                    background: "var(--bg-deep)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                    outline: "none",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--border-glow)";
                    e.target.style.boxShadow =
                      "0 0 8px var(--accent-purple-glow)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--border-subtle)";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  data-ocid="login.toggle_password_button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    padding: "2px",
                    display: "flex",
                    alignItems: "center",
                  }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error state */}
            {error && (
              <div
                data-ocid="login.error_state"
                className="flex items-center gap-2 rounded-md py-3 px-4"
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  color: "#ef4444",
                  fontSize: "12px",
                }}
              >
                <Shield size={14} />
                {error}
              </div>
            )}

            <button
              data-ocid="login.submit_button"
              type="submit"
              disabled={loading}
              className="btn-neon w-full rounded-md py-3 mt-2 flex items-center justify-center gap-2"
              style={{ fontSize: "11px", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? (
                <>
                  <div
                    className="animate-spin rounded-full"
                    style={{
                      width: "14px",
                      height: "14px",
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "white",
                    }}
                  />
                  AUTHENTICATING...
                </>
              ) : (
                <>
                  <Sword size={14} />
                  AUTHENTICATE
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <p
            className="text-center mt-6"
            style={{ fontSize: "10px", color: "var(--text-muted)" }}
          >
            Authorized staff only. Unauthorized access is prohibited.
          </p>
        </div>

        {/* Brand footer */}
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
