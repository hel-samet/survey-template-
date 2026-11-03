import Button from '../components/common/Button.jsx';
import { useLanguage } from '../hooks/useLanguage.js';

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="container">
      <div className="card result">
        <div className="result__code">404</div>
        <h1>{t('notFound.title')}</h1>
        <p className="muted">{t('notFound.message')}</p>
        <Button to="/" variant="secondary" icon="home">
          {t('common.backHome')}
        </Button>
      </div>
    </div>
  );
}
