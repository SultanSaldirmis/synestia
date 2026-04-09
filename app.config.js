/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Expo bu dosyayı Node.js ortamında çalıştırır; dotenv ile .env yüklenir.
 * Böylece EXPO_PUBLIC_* değerleri `expo.extra` içine aktarılır (Metro bazen .env'i kaçırabiliyordu).
 */
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    [
      'expo-image-picker',
      {
        photosPermission: 'Profil fotoğrafı için galeriye erişim gerekir.',
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          extraMavenRepos: [
            'https://maven.google.com',
            'https://jcenter.bintray.com',
          ],
        },
      },
    ],
  ],
  extra: {
    ...(config.extra ?? {}),
    firebase: {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
    },
    tmdbApiKey: process.env.EXPO_PUBLIC_TMDB_API_KEY ?? '',
    spotifyClientId: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? '',
    spotifyClientSecret: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_SECRET ?? '',
  },
});
