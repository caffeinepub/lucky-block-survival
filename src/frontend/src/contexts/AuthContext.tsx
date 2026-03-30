import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { createActorWithConfig } from "../config";
import { sha256Hex } from "../lib/crypto";
import { type PublicUser, Role, UserStatus } from "../types";

const SESSION_TOKEN_KEY = "lbs4_session_token";

interface AuthContextValue {
  currentUser: PublicUser | null;
  sessionToken: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  currentUser: null,
  sessionToken: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

/**
 * Ensure a PublicUser always has a `status` field.
 * After backend.d.ts regenerates this cast is unnecessary, but kept for safety.
 */
function coerceUser(raw: any): PublicUser {
  return {
    id: raw.id ?? BigInt(0),
    username: raw.username ?? "",
    role: raw.role ?? Role.Staff,
    status: raw.status ?? UserStatus.Active,
    createdAt: raw.createdAt ?? BigInt(0),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<PublicUser | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount: validate any stored session token
  useEffect(() => {
    const storedToken = localStorage.getItem(SESSION_TOKEN_KEY);
    if (!storedToken) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const actor = (await createActorWithConfig()) as any;
        const result = await actor.validateSession(storedToken);
        if (result?.__kind__ === "ok") {
          setCurrentUser(coerceUser(result.ok));
          setSessionToken(storedToken);
        } else {
          localStorage.removeItem(SESSION_TOKEN_KEY);
        }
      } catch {
        localStorage.removeItem(SESSION_TOKEN_KEY);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /**
   * Login with username and password.
   * Hashes the password with SHA-256 before sending.
   * Throws with an error message on failure.
   */
  const login = async (username: string, password: string): Promise<void> => {
    const hash = await sha256Hex(password);
    const actor = (await createActorWithConfig()) as any;
    const result = await actor.loginWithCredentials(username, hash);
    if (result?.__kind__ === "err") {
      throw new Error(result.err as string);
    }
    if (!result || result.__kind__ !== "ok") {
      throw new Error("Unexpected response from server.");
    }
    const sessionData = result.ok;
    const token: string = sessionData.token;
    localStorage.setItem(SESSION_TOKEN_KEY, token);
    setSessionToken(token);
    // Fetch the full user via validateSession
    const userResult = await actor.validateSession(token);
    if (userResult?.__kind__ === "ok") {
      setCurrentUser(coerceUser(userResult.ok));
    } else {
      throw new Error("Failed to load user profile after login.");
    }
  };

  const logout = async (): Promise<void> => {
    const token = localStorage.getItem(SESSION_TOKEN_KEY);
    if (token) {
      try {
        const actor = (await createActorWithConfig()) as any;
        await actor.logoutSession(token);
      } catch {
        // Ignore logout errors — local state is still cleared
      }
    }
    localStorage.removeItem(SESSION_TOKEN_KEY);
    setCurrentUser(null);
    setSessionToken(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider
      value={{ currentUser, sessionToken, loading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
