import { useLanguage } from '../../hooks/useLanguage.js';
import Checkbox from '../common/Checkbox.jsx';

export default function RadioGroup({ name, options, value, onChange }) {
  const { tl } = useLanguage();

  return (
    <div className="choice-list" role="radiogroup">
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
