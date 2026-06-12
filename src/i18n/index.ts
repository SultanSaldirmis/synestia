import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import tr from './tr.json';
import en from './en.json';

const LANG_STORAGE_KEY = 'synestia_language';

const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lang: string) => void) => {
    try {
      const saved = await AsyncStorage.getItem(LANG_STORAGE_KEY);
      callback(saved ?? 'tr');
    } catch {
      callback('tr');
    }
  },
  init: () => {},
  cacheUserLanguage: async (language: string) => {
    try {
      await AsyncStorage.setItem(LANG_STORAGE_KEY, language);
    } catch {}
  },
};

void i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'tr',
    resources: {
      tr: { translation: tr },
      en: { translation: en },
    },
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
  });

export default i18n;
