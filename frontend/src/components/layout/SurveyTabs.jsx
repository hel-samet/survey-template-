import { NavLink } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage.js';
import Icon from '../common/Icon.jsx';

const TABS = [
  { key: 'edit', icon: 'edit' },
  { key: 'questions', icon: 'list' },
  { key: 'responses', icon: 'inbox' },
  { key: 'reports', icon: 'chart' },
];

export default function SurveyTabs({ surveyId }) {
  const { t } = useLanguage();

  return (
    <nav className="tabs">
      {TABS.map((tab) => (
        <NavLink key={tab.key} to={`/admin/surveys/${surveyId}/${tab.key}`} className="tabs__link">
          <Icon name={tab.icon} size={16} />
          {t(`admin.tabs.${tab.key}`)}
        </NavLink>
      ))}
    </nav>
  );
}
