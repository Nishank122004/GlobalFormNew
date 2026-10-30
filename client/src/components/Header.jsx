import React from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSelector from './LanguageSelector.jsx';

export default function Header() {
  const { t } = useTranslation();

  return (
    <header className="app-header">
      <div className="header-top-row">
        <div className="brand-logo">
          <span className="logo-icon">🌐</span>
          <span className="brand-name">GlobalForm</span>
        </div>
        <LanguageSelector />
      </div>

      <div className="header-content">
        <h1 className="header-title">{t('app.title')}</h1>
        <p className="header-subtitle">{t('app.subtitle')}</p>
      </div>
    </header>
  );
}
