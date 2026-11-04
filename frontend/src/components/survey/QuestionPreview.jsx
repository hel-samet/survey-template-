import { useLanguage } from '../../hooks/useLanguage.js';
import { CHOICE_TYPES, OTHER_ID, range, rangeOf, TYPE_ICONS } from '../../questionTypes.js';
import Icon from '../common/Icon.jsx';

// Compact, read-only picture of how a question looks to respondents (used in the builder list).
export default function QuestionPreview({ question }) {
  const { t, tl } = useLanguage();
  const { type } = question;

  if (CHOICE_TYPES.includes(type)) {
    const box = type === 'checkbox' ? 'checkbox' : 'radio';
    const correct = new Set(question.settings?.correct ?? []);
    return (
      <ul className={`option-preview ${type === 'yesno' ? 'option-preview--row' : ''}`}>
        {question.options.map((option) => (
          <li key={option.id} className={correct.has(option.id) ? 'is-correct' : undefined}>
            {type === 'dropdown' ? (
              <Icon name="chevronDown" size={14} />
            ) : (
              <span className={`choice__box choice__box--${box}`} aria-hidden="true" />
            )}
            {option.id === OTHER_ID ? t('questions.otherPlaceholder') : tl(option.label)}
            {correct.has(option.id) && (
              <span className="correct-tag">
                <Icon name="check" size={12} strokeWidth={3} />
                {t('questions.correct')}
              </span>
            )}
          </li>
        ))}
      </ul>
    );
  }

  if (type === 'rating') {
    return (
      <div className="preview-row" aria-hidden="true">
        {range(1, rangeOf(question).max).map((point) => (
          <Icon key={point} name="star" size={20} className="preview-star" />
        ))}
      </div>
    );
  }

  if (type === 'scale') {
    const { min, max } = rangeOf(question);
    return (
      <div className="preview-scale" aria-hidden="true">
        {tl(question.settings?.minLabel) && <span className="muted small">{tl(question.settings.minLabel)}</span>}
        {range(min, max).map((point) => (
          <span key={point} className="preview-scale__point">
            {point}
          </span>
        ))}
        {tl(question.settings?.maxLabel) && <span className="muted small">{tl(question.settings.maxLabel)}</span>}
      </div>
    );
  }

  return (
    <div className={`preview-field ${type === 'paragraph' ? 'preview-field--tall' : ''}`} aria-hidden="true">
      <Icon name={TYPE_ICONS[type]} size={15} />
      {t(`questions.answerHint.${type}`)}
    </div>
  );
}
