import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User, AppTab } from "../types/index.js";

// ---------------------------------------------------------------------------
// URL ↔ AppTab mapping (matches docs/lab-03/ui-spec.md §5 Standard Page URLs)
// ---------------------------------------------------------------------------
const TAB_TO_PATH: Record<AppTab, string> = {
  "my-tickets":     "/my-tickets",
  "create-ticket":  "/create-ticket",
  "ticket-detail":  "/tickets",       // /tickets/:id — id appended separately
  "ticket-queue":   "/staff/queue",
  "user-management": "/admin/users",
};

const AUTH_PATHS: Record<string, AppTab> = {
  "/my-tickets":     "my-tickets",
  "/create-ticket":  "create-ticket",
  "/staff/queue":    "ticket-queue",
  "/admin/users":    "user-management",
};

/** Derive AppTab from the current browser path. Returns null for /login, /change-password, and unknown paths. */
function pathToTab(pathname: string): AppTab | null {
  if (pathname.startsWith("/tickets/") || pathname.startsWith("/staff/tickets/")) return "ticket-detail";
  return AUTH_PATHS[pathname] ?? null;
}

/** Push a new history entry only when the path actually changes. */
function syncUrl(tab: AppTab, ticketId?: number | null, userRole?: string) {
  const isTest =
    (typeof import.meta !== "undefined" && import.meta.env?.MODE === "test") ||
    (typeof process !== "undefined" && process?.env?.NODE_ENV === "test");
  if (isTest) return; // don't touch window.location in tests

  let path = TAB_TO_PATH[tab];
  if (tab === "ticket-detail" && ticketId) {
    path = (userRole === "IT_STAFF" || userRole === "ADMINISTRATOR")
      ? `/staff/tickets/${ticketId}`
      : `/tickets/${ticketId}`;
  }

  if (window.location.pathname !== path) {
    window.history.pushState({ tab, ticketId: ticketId ?? null }, "", path);
  }
}

const TOKEN_KEY = "toktickit_auth_token";
const USER_KEY = "toktickit_auth_user";

export function getDefaultTab(role?: string): AppTab {
  if (role === "IT_STAFF") return "ticket-queue";
  if (role === "ADMINISTRATOR") return "user-management";
  return "my-tickets";
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  activeTab: AppTab;
  selectedTicketId: number | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  setActiveTab: (tab: AppTab, ticketId?: number | null) => void;
  setSelectedTicketId: (id: number | null) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTabRaw] = useState<AppTab>(() => {
    // 1. Try to restore from current URL path
    const fromPath = typeof window !== "undefined" ? pathToTab(window.location.pathname) : null;
    if (fromPath) return fromPath;
    // 2. Fall back to role-based default from saved user
    const saved = localStorage.getItem(USER_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return getDefaultTab(parsed?.role);
      } catch {}
    }
    return "my-tickets";
  });
  const [selectedTicketId, setSelectedTicketIdRaw] = useState<number | null>(() => {
    // Restore ticket id from path like /tickets/42 or /staff/tickets/42
    if (typeof window !== "undefined") {
      const m = window.location.pathname.match(/^\/(?:staff\/)?tickets\/(\d+)$/);
      if (m) return Number(m[1]);
    }
    return null;
  });

  // Wrapped setters that keep URL in sync
  const setActiveTab = useCallback((tab: AppTab, ticketId?: number | null) => {
    setActiveTabRaw(tab);
    if (tab === "ticket-detail") {
      const detailTicketId = ticketId ?? selectedTicketId;
      if (detailTicketId !== null && detailTicketId !== undefined) {
        syncUrl(tab, detailTicketId, user?.role);
      }
    } else {
      syncUrl(tab, undefined, user?.role);
    }
  }, [selectedTicketId, user?.role]);

  const setSelectedTicketId = useCallback((id: number | null) => {
    setSelectedTicketIdRaw(id);
    if (id !== null) syncUrl("ticket-detail", id, user?.role);
  }, [user?.role]);

  // Handle browser back / forward
  useEffect(() => {
    function onPopState(event: PopStateEvent) {
      const state = event.state as { tab?: AppTab; ticketId?: number | null } | null;
      if (state?.tab) {
        setActiveTabRaw(state.tab);
        setSelectedTicketIdRaw(state.ticketId ?? null);
      } else {
        // Fallback: derive from current path
        const tab = pathToTab(window.location.pathname);
        if (tab) setActiveTabRaw(tab);
        const m = window.location.pathname.match(/^\/(?:staff\/)?tickets\/(\d+)$/);
        setSelectedTicketIdRaw(m ? Number(m[1]) : null);
      }
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Verify stored token on mount
  useEffect(() => {
    async function verifyToken() {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        return;
      }

      const isTestEnv =
        (typeof import.meta !== "undefined" && import.meta.env?.MODE === "test") ||
        (typeof process !== "undefined" && process?.env?.NODE_ENV === "test");

      if (isTestEnv && !(window as any).__VERIFY_AUTH_IN_TEST__) {
        return;
      }

      try {
        const res = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        } else {
          // Token invalid or expired
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          setUser(null);
          setToken(null);
        }
      } catch {
        // Network offline or failed - keep local user if available
      } finally {
        setIsLoading(false);
      }
    }

    verifyToken();
  }, []);

  async function login(email: string, password: string): Promise<User> {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Invalid email or password");
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setSelectedTicketIdRaw(null);
      const defaultTab = getDefaultTab(data.user.role);
      setActiveTabRaw(defaultTab);
      syncUrl(defaultTab);
      return data.user;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to sign in";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  async function logout() {
    setIsLoading(true);
    try {
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setSelectedTicketIdRaw(null);
      setActiveTabRaw("my-tickets");
      // Redirect to /login on logout
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.history.pushState({}, "", "/login");
      }
      setIsLoading(false);
    }
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to change password");
      }

      if (user) {
        const updatedUser = { ...user, mustChangePassword: false };
        setUser(updatedUser);
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to change password";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  function clearError() {
    setError(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        error,
        activeTab,
        selectedTicketId,
        login,
        logout,
        changePassword,
        setActiveTab,
        setSelectedTicketId,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
