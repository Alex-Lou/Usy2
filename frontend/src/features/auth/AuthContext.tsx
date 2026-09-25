import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiRequest, clearToken, getToken, setToken } from "../../lib/api/client";
import { unsubscribeThisDevice } from "../notifications/push";
import { fetchMe, login as loginRequest, type User } from "./api";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  updateCompanion: (species: string) => void;
  refreshUser: () => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On startup, if a token is present, try to resolve the current user.
  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const me = await fetchMe();
        if (!cancelled) {
          setUser(me);
        }
      } catch {
        clearToken();
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const response = await loginRequest(username, password);
    setToken(response.token);
    setUser(response.user);
  }, []);

  const logout = useCallback(() => {
    void unsubscribeThisDevice(); // no more notifications for this account here
    clearToken();
    setUser(null);
  }, []);

  // Optimistic local update + persist to the server so the partner sees it too.
  const updateCompanion = useCallback((companion: string) => {
    setUser((u) => (u ? { ...u, companion } : u));
    apiRequest("/api/profiles/me/companion", { method: "PUT", body: { companion } }).catch(() => {
      /* keep optimistic value; will reconcile on next load */
    });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      setUser(await fetchMe());
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, logout, updateCompanion, refreshUser }),
    [user, loading, login, logout, updateCompanion, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
