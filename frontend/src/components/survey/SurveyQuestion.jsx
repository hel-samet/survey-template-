import { useLanguage } from '../../hooks/useLanguage.js';
import Icon from '../common/Icon.jsx';
import CheckboxGroup from './CheckboxGroup.jsx';
import RadioGroup from './RadioGroup.jsx';

export default function SurveyQuestion({ question, index, value, onChange, error, answered = false }) {
  const { t, tl } = useLanguage();
  const name = `q-${question.id}`;
  const hint =
    question.type === 'checkbox' ? t('survey.selectAll') : question.type === 'radio' ? t('survey.selectOne') : null;
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
      </legend>
      {hint && <p className="question__hint">{hint}</p>}

      {question.type === 'checkbox' && (
        <CheckboxGroup options={question.options} value={value || []} onChange={onChange} />
      )}
      {question.type === 'radio' && (
        <RadioGroup name={name} options={question.options} value={value} onChange={onChange} />
      )}
      {question.type === 'text' && (
        <textarea
          className="field__control"
          rows={4}
          maxLength={2000}
          value={value || ''}
          placeholder={t('survey.textPlaceholder')}
          aria-label={tl(question.text)}
          onChange={(event) => onChange(event.target.value)}
        />
      )}

      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
