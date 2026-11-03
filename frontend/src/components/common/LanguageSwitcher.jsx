import { useLanguage } from '../../hooks/useLanguage.js';
import { LANGUAGES } from '../../i18n/index.js';

export default function LanguageSwitcher() {
  const { lang, setLang, t } = useLanguage();

  return (
    <div className="lang-switch" role="group" aria-label={t('common.language')}>
      {LANGUAGES.map((language) => (
        <button
          key={language.code}
          type="button"
          lang={language.code}
          title={language.label}
          className={`lang-switch__btn ${lang === language.code ? 'is-active' : ''}`}
          aria-pressed={lang === language.code}
          onClick={() => setLang(language.code)}
        >
          {language.short}
        </button>
      ))}
    </div>
  );
}
