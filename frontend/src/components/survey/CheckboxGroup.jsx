import { useLanguage } from '../../hooks/useLanguage.js';
import { OTHER_ID } from '../../questionTypes.js';
import Checkbox from '../common/Checkbox.jsx';
import OtherChoice from './OtherChoice.jsx';

export default function CheckboxGroup({ options, value = [], onChange, otherText, onOtherChange }) {
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
      {options.map((option) =>
        option.id === OTHER_ID ? (
          <OtherChoice
            key={option.id}
            checked={value.includes(OTHER_ID)}
            onToggle={(checked) => toggle(OTHER_ID, checked)}
            text={otherText}
            onTextChange={onOtherChange}
          />
        ) : (
          <Checkbox
            key={option.id}
            label={tl(option.label)}
            checked={value.includes(option.id)}
            onChange={(checked) => toggle(option.id, checked)}
          />
        ),
      )}
    </div>
  );
}
