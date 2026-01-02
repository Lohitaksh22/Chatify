"use client"

import { createContext, useState, useContext } from "react";
import { Dispatch, SetStateAction } from "react";

type AuthContextType = {
  token: string | null;
  setToken: Dispatch<SetStateAction<string | null>>;
};


const AuthContext = createContext<AuthContextType | null>(null);


export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  return (
    <AuthContext.Provider value={{ token, setToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);