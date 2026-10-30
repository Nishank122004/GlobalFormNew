import React from 'react';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' }
];

export default function LanguageSelector() {
  const { i18n, t } = useTranslation();

  // Normalize language code to 2-letter prefix (e.g. 'en-US' -> 'en')
  const currentLang = (i18n.language || 'en').split('-')[0];

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    i18n.changeLanguage(newLang);
  };

  return (
    <div className="language-selector-container">
      <label htmlFor="global-language-select" className="language-label">
        🌐 <span className="sr-only">{t('languageSelector.label')}:</span>
      </label>
      <select
        id="global-language-select"
        value={currentLang}
        onChange={handleLanguageChange}
        className="language-select"
        aria-label={t('languageSelector.label')}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}
