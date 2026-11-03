import { Link } from 'react-router-dom';
import Icon from '../common/Icon.jsx';

export default function PageHeader({ title, subtitle, backTo, backLabel, actions }) {
  return (
    <div className="page-header">
      <div className="page-header__text">
        {backTo && (
          <Link to={backTo} className="page-header__back">
            <Icon name="arrowLeft" size={15} />
            {backLabel}
          </Link>
        )}
        <h1 className="page-header__title">{title}</h1>
        {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </div>
  );
}
