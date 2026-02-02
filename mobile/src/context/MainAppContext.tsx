import React, { createContext, useContext } from 'react';
import type { StoredUser } from '../auth/storage';

type MainAppContextValue = {
  user: StoredUser;
  token: string;
  onLogout: () => Promise<void>;
};

const MainAppContext = createContext<MainAppContextValue | null>(null);

export function useMainApp(): MainAppContextValue {
  const ctx = useContext(MainAppContext);
  if (!ctx) throw new Error('useMainApp must be used within MainAppProvider');
  return ctx;
}

export function MainAppProvider({
  user,
  token,
  onLogout,
  children,
}: MainAppContextValue & { children: React.ReactNode }) {
  const value = { user, token, onLogout };
  return <MainAppContext.Provider value={value}>{children}</MainAppContext.Provider>;
}
