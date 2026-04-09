import Constants from 'expo-constants';

export type ExpoFirebaseExtra = {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
};

export function getFirebaseExtra(): ExpoFirebaseExtra {
  const extra = Constants.expoConfig?.extra as
    | { firebase?: ExpoFirebaseExtra }
    | undefined;
  return extra?.firebase ?? {};
}
