
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslations from './locales/en.json';
import skTranslations from './locales/sk.json';
import csTranslations from './locales/cs.json';

const resources = {
  en: {
    translation: enTranslations,
  },
  sk: {
    translation: skTranslations,
  },
  cs: {
    translation: csTranslations,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
