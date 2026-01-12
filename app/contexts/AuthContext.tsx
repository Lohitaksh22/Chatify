"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";

type AuthContextType = {
  token: string | null;
  setToken: React.Dispatch<React.SetStateAction<string | null>>;
  logout: () => Promise<void>;
  refresh: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextType | null>(null);

function decodeJwtPayload(token: string | null) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload as { exp?: number } | null;
  } catch {
    return null;
  }
}

let sharedRefreshing: Promise<string | null> | null = null;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const bcRef = useRef<BroadcastChannel | null>(null);

  async function refresh(): Promise<string | null> {
    if (sharedRefreshing) return sharedRefreshing;
    sharedRefreshing = (async () => {
      try {
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) {
          setToken(null);
          return null;
        }
        const j = await res.json();
        const newToken = j.accessToken ?? null;
        if (newToken) {
          setToken(newToken);
          try {
            const bc = new BroadcastChannel("auth");
            bc.postMessage({ type: "refreshed", token: newToken });
            bc.close();
          } catch {}
        }
        return newToken;
      } catch {
        setToken(null);
        return null;
      } finally {
        sharedRefreshing = null;
      }
    })();
    return sharedRefreshing;
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setToken(null);
      try {
        const bc = new BroadcastChannel("auth");
        bc.postMessage({ type: "logout" });
        bc.close();
      } catch {}
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await refresh();
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!token) return;
    const payload = decodeJwtPayload(token);
    if (!payload?.exp) return;
    const expiresAt = payload.exp * 1000;
    const now = Date.now();
    const msUntilRefresh = Math.max(0, expiresAt - now - 60_000);
    timerRef.current = window.setTimeout(() => {
      refresh();
    }, msUntilRefresh);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [token]);

  useEffect(() => {
    try {
      const bc = new BroadcastChannel("auth");
      bcRef.current = bc;
      bc.onmessage = (ev) => {
        const data = ev.data;
        if (!data) return;
        if (data.type === "refreshed") {
          setToken(data.token ?? null);
        } else if (data.type === "logout") {
          setToken(null);
        }
      };
      return () => {
        bc.close();
        bcRef.current = null;
      };
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    const onVis = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ token, setToken, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
