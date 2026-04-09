/**
 * Firebase Web SDK yapılandırması.
 * 1) process.env.EXPO_PUBLIC_* (Metro / Babel)
 * 2) expo.extra.firebase (app.config.js + dotenv ile yüklenen .env)
 */
import { getFirebaseExtra } from './expoExtra';

const extra = getFirebaseExtra();

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || extra.apiKey || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || extra.authDomain || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || extra.projectId || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || extra.storageBucket || '',
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || extra.messagingSenderId || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || extra.appId || '',
};

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.appId &&
      firebaseConfig.authDomain,
  );
}
