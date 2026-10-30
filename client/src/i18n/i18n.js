import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import hi from './locales/hi.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import ar from './locales/ar.json';

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  fr: { translation: fr },
  es: { translation: es },
  ar: { translation: ar }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'hi', 'fr', 'es', 'ar'],
    interpolation: {
      escapeValue: false // React already escapes values to prevent XSS
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

/**
 * Sync document direction (RTL vs LTR) and HTML lang attribute
 * whenever the active UI language changes.
 */
function updateDocumentDirection(lang) {
  if (typeof document !== 'undefined') {
    const isRtl = lang === 'ar';
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }
}

// Set direction initially on startup
updateDocumentDirection(i18n.language || 'en');

// Re-evaluate whenever language changes
i18n.on('languageChanged', (lng) => {
  updateDocumentDirection(lng);
});

export default i18n;
