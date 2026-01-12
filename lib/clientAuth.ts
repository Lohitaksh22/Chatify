import { useCallback } from "react";
import { useAuth } from "@/app/contexts/AuthContext";

let isRefreshing: Promise<string | null> | null = null;

export function useClientFetch() {
  const auth = useAuth();
  const setToken = auth?.setToken ?? (() => {});

  return useCallback(
    async (input: RequestInfo, init: RequestInit = {}) => {
      const currentToken = auth?.token ?? null;
      
      const headers = new Headers(init.headers ?? {});

      if (currentToken) {
        headers.set("Authorization", `Bearer ${currentToken}`);
      }

      const res = await fetch(input, {
        ...init,
        headers,
        credentials: "include",
      });

      if (res.status !== 401) {
        return res;
      }

      console.log("useClientFetch - got 401, starting refresh");

      if (!isRefreshing) {
        isRefreshing = fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        })
          .then(async newRes => {
            console.log("refresh response status:", newRes.status);
            if (!newRes.ok) return null;
            const payload = await newRes.json();
            console.log("refresh payload:", payload);
            return payload.accessToken ?? null;
          })
          .finally(() => {
            isRefreshing = null;
          });
      } else {
        console.log("useClientFetch - waiting for ongoing refresh");
      }

      const newToken = await isRefreshing;

      if (!newToken) {
        console.log("useClientFetch - refresh failed");
        setToken(null);
        return res;
      }

      console.log("useClientFetch - refresh succeeded, newToken:", Boolean(newToken));
      setToken(newToken);
      headers.set("Authorization", `Bearer ${newToken}`);

      return fetch(input, {
        ...init,
        headers,
        credentials: "include",
      });
    },
    
    [auth, setToken]
  );
}
