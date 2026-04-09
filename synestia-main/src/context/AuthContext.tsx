import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';

import { isFirebaseConfigured } from '../config/firebase';
import {
  observeAuth,
  loginWithEmail,
  logoutFirebase,
  registerWithEmail,
  sendResetPasswordEmail,
} from '../services/authService';

type AuthContextValue = {
  user: User | null;
  authReady: boolean;
  firebaseConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const firebaseConfigured = isFirebaseConfigured();

  useEffect(() => {
    if (!firebaseConfigured) {
      setUser(null);
      setAuthReady(true);
      return;
    }
    const unsub = observeAuth((u) => {
      setUser(u);
      setAuthReady(true);
    });
    return unsub;
  }, [firebaseConfigured]);

  const signIn = useCallback(async (email: string, password: string) => {
    await loginWithEmail(email, password);
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    await registerWithEmail(email, password, displayName);
  }, []);

  const signOut = useCallback(async () => {
    if (!firebaseConfigured) return;
    await logoutFirebase();
  }, [firebaseConfigured]);

  const resetPassword = useCallback(async (email: string) => {
    await sendResetPasswordEmail(email);
  }, []);

  const value = useMemo(
    () => ({
      user,
      authReady,
      firebaseConfigured,
      signIn,
      signUp,
      signOut,
      resetPassword,
    }),
    [user, authReady, firebaseConfigured, signIn, signUp, signOut, resetPassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth yalnızca AuthProvider içinde kullanılabilir.');
  }
  return ctx;
}
