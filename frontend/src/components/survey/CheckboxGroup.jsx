import { useLanguage } from '../../hooks/useLanguage.js';
import Checkbox from '../common/Checkbox.jsx';

export default function CheckboxGroup({ options, value = [], onChange }) {
  const { tl } = useLanguage();

  // Keep selections in option order so stored answers are stable.
  const toggle = (optionId, checked) => {
    const next = options
      .map((option) => option.id)
      .filter((id) => (id === optionId ? checked : value.includes(id)));
    onChange(next);
  };

  return (
    <div className="choice-list">
      {options.map((option) => (
        <Checkbox
          key={option.id}
          label={tl(option.label)}
          checked={value.includes(option.id)}
          onChange={(checked) => toggle(option.id, checked)}
        />
      ))}
    </div>
  );
}
