import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { firebaseConfig, isFirebaseConfigured } from '../config/firebase';

let app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null;
  if (!app) {
    app = getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);
  }
  return app;
}

let auth: Auth | null = null;

/**
 * Mümkünse AsyncStorage kalıcılığı; aksi halde getAuth (ders ortamında güvenli geri dönüş).
 */
export function getFirebaseAuth(): Auth {
  const a = getFirebaseApp();
  if (!a) {
    throw new Error('Firebase yapılandırılmadı (.env EXPO_PUBLIC_FIREBASE_*).');
  }
  if (!auth) {
    try {
      type AuthWithReactNativePersistence = typeof import('firebase/auth') & {
        getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
      };
      const authModule = require('firebase/auth') as AuthWithReactNativePersistence;
      auth = initializeAuth(a, {
        persistence: authModule.getReactNativePersistence(AsyncStorage),
      });
    } catch {
      // initializeAuth may throw if already initialized in hot-reload.
      auth = getAuth(a);
    }
  }
  return auth;
}
