import { doc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  type User,
} from 'firebase/auth';

import { isFirebaseConfigured } from '../config/firebase';
import { getFirebaseApp, getFirebaseAuth } from './firebaseApp';

export function observeAuth(callback: (user: User | null) => void): () => void {
  if (!isFirebaseConfigured()) {
    callback(null);
    return () => {};
  }
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<User> {
  const auth = getFirebaseAuth();
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const name = displayName.trim();
  if (name) {
    await updateProfile(cred.user, { displayName: name });
  }
  const app = getFirebaseApp();
  if (app) {
    const db = getFirestore(app);
    await setDoc(
      doc(db, 'users', cred.user.uid),
      {
        email: email.trim(),
        displayName: name || null,
        bio: '',
        profileImageUrl: '',
        followersCount: 0,
        followingCount: 0,
        collectionsCount: 0,
        isPrivate: false,
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );
  }
  return cred.user;
}

export async function loginWithEmail(email: string, password: string): Promise<void> {
  const auth = getFirebaseAuth();
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function logoutFirebase(): Promise<void> {
  const auth = getFirebaseAuth();
  await signOut(auth);
}

export async function sendResetPasswordEmail(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  await sendPasswordResetEmail(auth, email.trim());
}
