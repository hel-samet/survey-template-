import { NavLink } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage.js';
import Icon from '../common/Icon.jsx';

// `newTab` tabs open a standalone page in their own browser tab (the full-screen Live monitor).
const TABS = [
  { key: 'edit', icon: 'edit' },
  { key: 'questions', icon: 'list' },
  { key: 'responses', icon: 'inbox' },
  { key: 'reports', icon: 'chart' },
  { key: 'live', icon: 'users', newTab: true },
];

export default function SurveyTabs({ surveyId }) {
  const { t } = useLanguage();

  return (
    <nav className="tabs">
      {TABS.map((tab) => (
        <NavLink
          key={tab.key}
          to={`/admin/surveys/${surveyId}/${tab.key}`}
          className={`tabs__link ${tab.newTab ? 'tabs__link--live' : ''}`}
          {...(tab.newTab && { target: '_blank', rel: 'noopener', title: t('live.opensNewTab') })}
        >
          {tab.newTab ? <span className="live-dot" aria-hidden="true" /> : <Icon name={tab.icon} size={16} />}
          {t(`admin.tabs.${tab.key}`)}
          {tab.newTab && <Icon name="external" size={13} className="tabs__external" />}
        </NavLink>
      ))}
    </nav>
  );
}
