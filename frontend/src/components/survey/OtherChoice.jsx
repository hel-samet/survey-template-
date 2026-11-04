import { useLanguage } from '../../hooks/useLanguage.js';
import Checkbox from '../common/Checkbox.jsx';

// The "Other" choice of a checkbox / multiple-choice question, with a text box for the respondent's own answer.
export default function OtherChoice({ type = 'checkbox', name, checked, onToggle, text = '', onTextChange }) {
  const { t } = useLanguage();

  return (
    <div className={`choice-other ${checked ? 'is-checked' : ''}`}>
      <Checkbox
        type={type}
        name={name}
        value="__other"
        label={t('survey.other')}
        checked={checked}
        onChange={(isChecked) => onToggle(isChecked)}
      />
      {checked && (
        <input
          className="field__control choice-other__input"
          autoFocus={!text}
          maxLength={500}
          value={text}
          placeholder={t('survey.otherPlaceholder')}
          aria-label={t('survey.otherPlaceholder')}
          onChange={(event) => onTextChange(event.target.value)}
        />
      )}
    </div>
  );
}
