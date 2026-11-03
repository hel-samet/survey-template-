import { useLanguage } from '../../hooks/useLanguage.js';
import Checkbox from '../common/Checkbox.jsx';

// layout="row" places options side by side (used for Yes / No).
export default function RadioGroup({ name, options, value, onChange, layout = 'column' }) {
  const { tl } = useLanguage();

  return (
    <div className={`choice-list ${layout === 'row' ? 'choice-list--row' : ''}`} role="radiogroup">
      {options.map((option) => (
        <Checkbox
          key={option.id}
          type="radio"
          name={name}
          value={option.id}
          label={tl(option.label)}
          checked={value === option.id}
          onChange={() => onChange(option.id)}
        />
      ))}
    </div>
  );
}
