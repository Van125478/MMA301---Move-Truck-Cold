import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  changeRequiredPassword,
  fetchCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  registerAccount,
  type RegisterInput,
} from "../../services/api/auth";
import type { AuthUser } from "../../types/auth";

export type SessionState =
  | { status: "loading" }
  | { status: "offline" }
  | { status: "anonymous" }
  | { status: "authenticated"; user: AuthUser };

type AuthContextValue = {
  session: SessionState;
  login: (identifier: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (password: string) => Promise<void>;
  retry: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void (async () => {
      setSession({ status: "loading" });
      try {
        const user = await fetchCurrentUser();
        if (!active) return;
        setSession(user ? { status: "authenticated", user } : { status: "anonymous" });
      } catch {
        if (!active) return;
        setSession({ status: "offline" });
      }
    })();
    return () => {
      active = false;
    };
  }, [attempt]);

  const login = useCallback(async (identifier: string, password: string) => {
    const user = await loginRequest(identifier, password);
    setSession({ status: "authenticated", user });
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const user = await registerAccount(input);
    setSession({ status: "authenticated", user });
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setSession({ status: "anonymous" });
    }
  }, []);

  const changePassword = useCallback(async (password: string) => {
    const user = await changeRequiredPassword(password);
    setSession({ status: "authenticated", user });
  }, []);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  const value = useMemo(
    () => ({ session, login, register, logout, changePassword, retry }),
    [session, login, register, logout, changePassword, retry],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth phải nằm trong AuthProvider.");
  return value;
}
