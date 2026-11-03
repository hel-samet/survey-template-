import { useLanguage } from '../../hooks/useLanguage.js';
import { TYPE_GROUPS, TYPE_ICONS } from '../../questionTypes.js';
import Icon from '../common/Icon.jsx';

// Answer-type selector shown as grouped cards instead of a plain <select>.
export default function TypePicker({ id, value, onChange }) {
  const { t } = useLanguage();

  return (
    <div className="type-picker" role="radiogroup" aria-labelledby={`${id}-label`}>
      {TYPE_GROUPS.map((group) => (
        <div key={group.key} className="type-picker__group">
          <span className="type-picker__group-label">{t(`questions.groups.${group.key}`)}</span>
          <div className="type-picker__grid">
            {group.types.map((type) => (
              <label key={type} className={`type-card ${value === type ? 'is-active' : ''}`}>
                <input
                  type="radio"
                  className="sr-only"
                  name={`${id}-type`}
                  value={type}
                  checked={value === type}
                  onChange={() => onChange(type)}
                />
                <span className="type-card__icon">
                  <Icon name={TYPE_ICONS[type]} size={18} />
                </span>
                <span className="type-card__label">{t(`questions.types.${type}`)}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
