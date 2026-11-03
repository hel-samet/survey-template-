import { Link, Outlet } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage.js';
import Icon from '../common/Icon.jsx';
import LanguageSwitcher from '../common/LanguageSwitcher.jsx';

export default function PublicLayout() {
  const { t } = useLanguage();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container topbar__inner">
          <Link to="/" className="brand">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" width="34" height="34" />
            <span>{t('common.appName')}</span>
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container footer__inner">
          <span>
            © {new Date().getFullYear()} {t('common.appName')}
          </span>
          <Link to="/admin" className="footer__admin">
            <Icon name="lock" size={14} />
            {t('admin.nav.admin')}
          </Link>
        </div>
      </footer>
    </div>
  );
}
