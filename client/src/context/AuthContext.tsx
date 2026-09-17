import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "../types/index.js";

const TOKEN_KEY = "toktickit_auth_token";
const USER_KEY = "toktickit_auth_user";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  activeTab: "my-tickets" | "create-ticket" | "ticket-detail";
  selectedTicketId: number | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  setActiveTab: (tab: "my-tickets" | "create-ticket" | "ticket-detail") => void;
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
  const [activeTab, setActiveTab] = useState<"my-tickets" | "create-ticket" | "ticket-detail">("my-tickets");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

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
      setSelectedTicketId(null);
      setActiveTab("my-tickets");
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
      setSelectedTicketId(null);
      setActiveTab("my-tickets");
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
