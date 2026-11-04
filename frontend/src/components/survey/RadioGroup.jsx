import { useLanguage } from '../../hooks/useLanguage.js';
import { OTHER_ID } from '../../questionTypes.js';
import Checkbox from '../common/Checkbox.jsx';
import OtherChoice from './OtherChoice.jsx';

// layout="row" places options side by side (used for Yes / No).
export default function RadioGroup({ name, options, value, onChange, layout = 'column', otherText, onOtherChange }) {
  const { tl } = useLanguage();

  return (
    <div className={`choice-list ${layout === 'row' ? 'choice-list--row' : ''}`} role="radiogroup">
      {options.map((option) =>
        option.id === OTHER_ID ? (
          <OtherChoice
            key={option.id}
            type="radio"
            name={name}
            checked={value === OTHER_ID}
            onToggle={() => onChange(OTHER_ID)}
            text={otherText}
            onTextChange={onOtherChange}
          />
        ) : (
          <Checkbox
            key={option.id}
            type="radio"
            name={name}
            value={option.id}
            label={tl(option.label)}
            checked={value === option.id}
            onChange={() => onChange(option.id)}
          />
        ),
      )}
    </div>
  );
}
