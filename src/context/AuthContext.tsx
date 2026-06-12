import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import type { User } from 'firebase/auth';

import { isFirebaseConfigured } from '../config/firebase';
import {
  observeAuth,
  loginWithEmail,
  logoutFirebase,
  registerWithEmail,
  sendResetPasswordEmail,
} from '../services/authService';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setUser, clearAuth, setAuthReady } from '../store/authSlice';

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

// Firebase User nesnesi serileştirilemez; Redux için düz objeye çevir
function toSerializable(u: User | null) {
  if (!u) return null;
  return {
    uid: u.uid,
    email: u.email,
    displayName: u.displayName,
    photoURL: u.photoURL,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const reduxUser = useAppSelector((s) => s.auth.user);
  const authReady = useAppSelector((s) => s.auth.authReady);

  const firebaseConfigured = isFirebaseConfigured();

  useEffect(() => {
    if (!firebaseConfigured) {
      dispatch(clearAuth());
      return;
    }
    const unsub = observeAuth((u: User | null) => {
      if (u) {
        dispatch(setUser(toSerializable(u)));
      } else {
        dispatch(setUser(null));
        dispatch(setAuthReady());
      }
    });
    return unsub;
  }, [firebaseConfigured, dispatch]);

  const signIn = useCallback(async (email: string, password: string) => {
    await loginWithEmail(email, password);
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    await registerWithEmail(email, password, displayName);
  }, []);

  const signOut = useCallback(async () => {
    if (!firebaseConfigured) return;
    await logoutFirebase();
    dispatch(clearAuth());
  }, [firebaseConfigured, dispatch]);

  const resetPassword = useCallback(async (email: string) => {
    await sendResetPasswordEmail(email);
  }, []);

  // Context değeri Firebase User uyumluluğu için reduxUser'ı user olarak sunar
  const value = useMemo(
    () => ({
      user: reduxUser as unknown as User | null,
      authReady,
      firebaseConfigured,
      signIn,
      signUp,
      signOut,
      resetPassword,
    }),
    [reduxUser, authReady, firebaseConfigured, signIn, signUp, signOut, resetPassword],
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
