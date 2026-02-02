import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { StoredUser } from '../auth/storage';
import { clearAuth, getStoredToken, getStoredUser, setStoredToken, setStoredUser } from '../auth/storage';

type AuthContextValue = {
  user: StoredUser | null;
  token: string | null;
  isLoading: boolean;
  setAuth: (user: StoredUser | null, token: string | null) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [t, u] = await Promise.all([getStoredToken(), getStoredUser()]);
      setTokenState(t);
      setUser(u);
      setIsLoading(false);
    })();
  }, []);

  const setAuth = useCallback(async (newUser: StoredUser | null, newToken: string | null) => {
    await setStoredToken(newToken);
    await setStoredUser(newUser);
    setTokenState(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(async () => {
    await clearAuth();
    setTokenState(null);
    setUser(null);
  }, []);

  const value: AuthContextValue = { user, token, isLoading, setAuth, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
