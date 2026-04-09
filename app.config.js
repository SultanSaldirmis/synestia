/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Expo bu dosyayı Node.js ortamında çalıştırır; dotenv ile .env yüklenir.
 * Böylece EXPO_PUBLIC_* değerleri `expo.extra` içine aktarılır (Metro bazen .env'i kaçırabiliyordu).
 */
const path = require('path');
const { withSettingsGradle } = require('@expo/config-plugins');

require('dotenv').config({ path: path.join(__dirname, '.env') });

/**
 * settings.gradle içindeki pluginManagement.repositories bloğuna Maven mirror'ları enjekte eder.
 * Bu sayede Gradle plugin çözümlemesi (settings.gradle aşaması) Maven Central'a ulaşmadan önce
 * JetBrains ve Alibaba mirror'larını dener — HTTP 429 rate limit hatası önlenir.
 */
const withMavenMirrors = (appConfig) =>
  withSettingsGradle(appConfig, (mod) => {
    const mirrors = [
      'maven { url "https://cache-redirector.jetbrains.com/repo1.maven.org/maven2" }',
      'maven { url "https://cache-redirector.jetbrains.com/plugins.gradle.org/m2" }',
      'maven { url "https://maven.aliyun.com/repository/central" }',
      'maven { url "https://maven.aliyun.com/repository/gradle-plugin" }',
    ]
      .map((m) => '        ' + m)
      .join('\n');

    if (!mod.modResults.contents.includes('cache-redirector.jetbrains.com')) {
      mod.modResults.contents = mod.modResults.contents.replace(
        /(pluginManagement[\s\S]*?repositories\s*\{)/,
        `$1\n${mirrors}`
      );
    }
    return mod;
  });

module.exports = ({ config }) => {
  let appConfig = {
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
              'https://cache-redirector.jetbrains.com/repo1.maven.org/maven2',
              'https://maven.aliyun.com/repository/central',
              'https://maven.google.com',
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
  };

  return withMavenMirrors(appConfig);
};
