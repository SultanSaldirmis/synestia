import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import tr from './tr.json';
import en from './en.json';

void i18n.use(initReactI18next).init({
  lng: 'tr',
  fallbackLng: 'tr',
  resources: {
    tr: { translation: tr },
    en: { translation: en },
  },
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

export default i18n;
