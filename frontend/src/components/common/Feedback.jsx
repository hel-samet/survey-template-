import { useLanguage } from '../../hooks/useLanguage.js';
import Button from './Button.jsx';
import Icon from './Icon.jsx';

export function Loading() {
  const { t } = useLanguage();
  return (
    <div className="state" role="status">
      <span className="spinner spinner--lg" aria-hidden="true" />
      <span className="muted">{t('common.loading')}</span>
    </div>
  );
}

export function ErrorMessage({ error, onRetry }) {
  const { t } = useLanguage();
  return (
    <div className="alert alert--error" role="alert">
      <span>{error?.message || t('common.error')}</span>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ icon = 'inbox', title, message, action }) {
  return (
    <div className="state state--empty card">
      <span className="state__icon">
        <Icon name={icon} size={26} />
      </span>
      {title && <h2 className="state__title">{title}</h2>}
      {message && <p className="muted">{message}</p>}
      {action}
    </div>
  );
}
