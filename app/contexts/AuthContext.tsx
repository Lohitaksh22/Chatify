"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";

type AuthContextType = {
  token: string | null;
  setToken: React.Dispatch<React.SetStateAction<string | null>>;
  logout: () => Promise<void>;
  refresh: () => Promise<string | null>;
  socket: React.RefObject<Socket | null>;
};

const AuthContext = createContext<AuthContextType | null>(null);

function decodeJwtPayload(token: string | null) {
  if (!token) return null;
  try {
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    return payload as { exp?: number } | null;
  } catch {
    return null;
  }
}

let sharedRefreshing: Promise<string | null> | null = null;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);

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

    socketRef.current?.disconnect();
    socketRef.current = null;
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
    if (!token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    const socket = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000",
      {
        auth: { token },
        withCredentials: true,
        autoConnect: true
      }
    );

    socketRef.current = socket;

    socket.on("connect_error", async (err) => {
      if (err.message === "Unauthorized") {
        const newToken = await refresh();
        
        if (newToken && socketRef.current) {
          socketRef.current.auth = { token: newToken };
          socketRef.current.connect();
        }
      }
    });
     

    return () => {
      socket.disconnect()
  socketRef.current = null
      
    };
  }, [token]);

  return (
    <AuthContext.Provider
      value={{ token, setToken, logout, refresh, socket: socketRef }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
