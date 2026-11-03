import { useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage.js';
import { range } from '../../questionTypes.js';
import Icon from '../common/Icon.jsx';

export default function StarRating({ name, max = 5, value, onChange }) {
  const { t } = useLanguage();
  const [hovered, setHovered] = useState(0);
  const shown = hovered || value || 0;

  return (
    <div className="rating" role="radiogroup" onMouseLeave={() => setHovered(0)}>
      {range(1, max).map((point) => (
        <label
          key={point}
          className={`rating__star ${point <= shown ? 'is-on' : ''}`}
          onMouseEnter={() => setHovered(point)}
          title={t('survey.ratingOf', { value: point, max })}
        >
          <input
            type="radio"
            className="sr-only"
            name={name}
            value={point}
            checked={value === point}
            onChange={() => onChange(point)}
          />
          <Icon name="star" size={34} strokeWidth={1.6} />
          <span className="sr-only">{t('survey.ratingOf', { value: point, max })}</span>
        </label>
      ))}
      {value ? <span className="rating__value">{t('survey.ratingOf', { value, max })}</span> : null}
    </div>
  );
}
