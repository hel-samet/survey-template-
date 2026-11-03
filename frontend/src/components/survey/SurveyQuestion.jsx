import { useLanguage } from '../../hooks/useLanguage.js';
import { rangeOf } from '../../questionTypes.js';
import Icon from '../common/Icon.jsx';
import CheckboxGroup from './CheckboxGroup.jsx';
import RadioGroup from './RadioGroup.jsx';
import ScaleInput from './ScaleInput.jsx';
import StarRating from './StarRating.jsx';

const HINTS = {
  checkbox: 'survey.selectAll',
  radio: 'survey.selectOne',
  dropdown: 'survey.selectOne',
  yesno: 'survey.selectOne',
  rating: 'survey.rateHint',
  scale: 'survey.selectOne',
};

// Single-line inputs: [html type, inputMode, autoComplete, placeholder key]
const INPUTS = {
  text: ['text', undefined, 'off', 'survey.textPlaceholder'],
  number: ['text', 'decimal', 'off', 'survey.numberPlaceholder'],
  email: ['email', 'email', 'email', 'survey.emailPlaceholder'],
  phone: ['tel', 'tel', 'tel', 'survey.phonePlaceholder'],
  date: ['date', undefined, 'off', null],
};

function AnswerInput({ question, name, value, onChange }) {
  const { t, tl } = useLanguage();
  const label = tl(question.text);

  switch (question.type) {
    case 'checkbox':
      return <CheckboxGroup options={question.options} value={value || []} onChange={onChange} />;
    case 'radio':
      return <RadioGroup name={name} options={question.options} value={value} onChange={onChange} />;
    case 'yesno':
      return <RadioGroup name={name} options={question.options} value={value} onChange={onChange} layout="row" />;
    case 'dropdown':
      return (
        <select
          className="field__control field__control--select"
          aria-label={label}
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{t('survey.selectPlaceholder')}</option>
          {question.options.map((option) => (
            <option key={option.id} value={option.id}>
              {tl(option.label)}
            </option>
          ))}
        </select>
      );
    case 'rating':
      return <StarRating name={name} max={rangeOf(question).max} value={value} onChange={onChange} />;
    case 'scale': {
      const { min, max } = rangeOf(question);
      return (
        <ScaleInput
          name={name}
          min={min}
          max={max}
          minLabel={question.settings?.minLabel}
          maxLabel={question.settings?.maxLabel}
          value={value}
          onChange={onChange}
        />
      );
    }
    case 'paragraph':
      return (
        <textarea
          className="field__control"
          rows={4}
          maxLength={2000}
          value={value || ''}
          placeholder={t('survey.textPlaceholder')}
          aria-label={label}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    default: {
      const [type, inputMode, autoComplete, placeholder] = INPUTS[question.type] ?? INPUTS.text;
      return (
        <input
          className={`field__control field__control--${question.type}`}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          maxLength={question.type === 'text' ? 500 : 254}
          value={value ?? ''}
          placeholder={placeholder ? t(placeholder) : undefined}
          aria-label={label}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    }
  }
}

export default function SurveyQuestion({ question, index, value, onChange, error, answered = false }) {
  const { t, tl } = useLanguage();
  const name = `q-${question.id}`;
  const hint = HINTS[question.type] ? t(HINTS[question.type]) : null;
  const classes = ['card', 'question', answered && 'question--answered', error && 'question--error']
    .filter(Boolean)
    .join(' ');

  return (
    <fieldset id={name} className={classes}>
      <legend className="question__title">
        <span className="question__number" aria-hidden="true">
          {answered ? <Icon name="check" size={15} strokeWidth={3} /> : index + 1}
        </span>
        <span>
          {tl(question.text)}
          {question.isRequired && (
            <span className="required" title={t('common.required')}>
              {' '}
              *
            </span>
          )}
        </span>
        {question.settings?.points > 0 && (
          <span className="question__points">{t('questions.pointsValue', { count: question.settings.points })}</span>
        )}
      </legend>
      {hint && <p className="question__hint">{hint}</p>}

      <div className="question__answer">
        <AnswerInput question={question} name={name} value={value} onChange={onChange} />
      </div>

      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
