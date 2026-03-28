import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { Role } from "../backend.d";
import type { PublicUser } from "../backend.d";

export interface DiscordUser {
  token: string;
  discordId: string;
  username: string;
  avatar: string;
  role: string;
  createdAt: bigint;
}

const SESSION_TOKEN_KEY = "discord_session_token";
const SESSION_USER_KEY = "discord_user";

export function discordRoleToPublicRole(discordRole: string): Role {
  if (discordRole === "Owner") return Role.Owner;
  if (discordRole === "CoOwner") return Role.CoOwner;
  return Role.StaffBuilder;
}

export function discordUserToPublicUser(user: DiscordUser): PublicUser {
  return {
    id: BigInt(user.discordId),
    username: user.username,
    role: discordRoleToPublicRole(user.role),
    createdAt: user.createdAt,
  };
}

export function getDiscordAvatarUrl(discordId: string, avatar: string): string {
  if (!avatar) return "https://cdn.discordapp.com/embed/avatars/0.png";
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png`;
}

export function saveDiscordSession(data: DiscordUser): void {
  localStorage.setItem(SESSION_TOKEN_KEY, data.token);
  localStorage.setItem(
    SESSION_USER_KEY,
    JSON.stringify(data, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
  );
}

export function clearDiscordSession(): void {
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(SESSION_USER_KEY);
}

export function loadDiscordSession(): DiscordUser | null {
  try {
    const raw = localStorage.getItem(SESSION_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      createdAt: BigInt(parsed.createdAt ?? 0),
    } as DiscordUser;
  } catch {
    return null;
  }
}

interface AuthContextValue {
  discordUser: DiscordUser | null;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  discordUser: null,
  loading: true,
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [discordUser, setDiscordUser] = useState<DiscordUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = loadDiscordSession();
    setDiscordUser(stored);
    setLoading(false);
  }, []);

  const logout = () => {
    clearDiscordSession();
    setDiscordUser(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ discordUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
