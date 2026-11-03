import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useLanguage } from '../../hooks/useLanguage.js';
import Icon from '../common/Icon.jsx';
import LanguageSwitcher from '../common/LanguageSwitcher.jsx';

const NAV = [
  { to: '/admin', icon: 'dashboard', label: 'admin.nav.dashboard', end: true },
  { to: '/admin/surveys', icon: 'clipboard', label: 'admin.nav.surveys' },
  { to: '/admin/telegram', icon: 'send', label: 'admin.nav.telegram' },
];

export default function AdminLayout() {
  const { isAuthenticated, user, logout } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return (
    <div className="admin">
      <aside className="admin__sidebar">
        <Link to="/admin" className="brand brand--inverse">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" width="32" height="32" />
          <span>{t('common.appName')}</span>
        </Link>

        <nav className="admin__nav">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              <Icon name={item.icon} />
              <span>{t(item.label)}</span>
            </NavLink>
          ))}
          <Link to="/" target="_blank" className="admin__nav-external">
            <Icon name="external" />
            <span>{t('admin.nav.viewSite')}</span>
          </Link>
        </nav>

        <div className="admin__sidebar-footer">
          <LanguageSwitcher />
          <div className="admin__user">
            <span className="avatar" aria-hidden="true">
              {user.username.slice(0, 1).toUpperCase()}
            </span>
            <span className="admin__user-name" title={t('admin.nav.signedInAs', { name: user.username })}>
              {user.username}
            </span>
            <button type="button" className="admin__logout" onClick={logout} title={t('admin.nav.logout')}>
              <Icon name="logout" />
              <span className="sr-only">{t('admin.nav.logout')}</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="admin__main">
        <div className="admin__content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
