import { useState } from 'react';
import { useParams } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import Checkbox from '../../components/common/Checkbox.jsx';
import Icon from '../../components/common/Icon.jsx';
import { EmptyState, ErrorMessage, Loading } from '../../components/common/Feedback.jsx';
import Input from '../../components/common/Input.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import SurveyTabs from '../../components/layout/SurveyTabs.jsx';
import QuestionPreview from '../../components/survey/QuestionPreview.jsx';
import ScaleInput from '../../components/survey/ScaleInput.jsx';
import TypePicker from '../../components/survey/TypePicker.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useLanguage } from '../../hooks/useLanguage.js';
import {
  CHOICE_TYPES,
  DEFAULT_SETTINGS,
  OPTION_TYPES,
  OTHER_ID,
  OTHER_TYPES,
  range,
  TYPE_ICONS,
} from '../../questionTypes.js';
import { questionApi, surveyApi } from '../../services/surveyService.js';

// Matches MAX_POINTS in backend/src/validators/surveyValidator.js.
const MAX_POINTS = 1000;

let draftKey = 0;
const blankOption = () => ({ key: `new-${++draftKey}`, id: undefined, en: '', km: '', correct: false });

function toDraft(question) {
  const type = question?.type || 'checkbox';
  // "Other" is shown from settings.allowOther, not edited as an option row.
  const ownOptions = question?.options.filter((o) => o.id !== OTHER_ID) ?? [];
  const hasCustomOptions = question && OPTION_TYPES.includes(type) && ownOptions.length;
  const correct = new Set(question?.settings?.correct ?? []);
  return {
    textEn: question?.text.en || '',
    textKm: question?.text.km || '',
    type,
    isRequired: question?.isRequired ?? false,
    options: hasCustomOptions
      ? ownOptions.map((o) => ({
          key: o.id,
          id: o.id,
          en: o.label.en || '',
          km: o.label.km || '',
          correct: correct.has(o.id),
        }))
      : [blankOption(), blankOption()],
    settings: { ...DEFAULT_SETTINGS[type], ...question?.settings },
  };
}

export default function Questions() {
  const { id: surveyId } = useParams();
  const { t, tl } = useLanguage();
  const { data: survey, loading, error, reload, setData } = useAsync(() => surveyApi.getAdmin(surveyId), [surveyId]);
  const [adding, setAdding] = useState(false);
  const [actionError, setActionError] = useState(null);

  const setQuestions = (updater) => setData((prev) => ({ ...prev, questions: updater(prev.questions) }));

  async function move(index, direction) {
    const list = [...survey.questions];
    const target = index + direction;
    [list[index], list[target]] = [list[target], list[index]];
    setQuestions(() => list);
    setActionError(null);
    try {
      await questionApi.reorder(Number(surveyId), list.map((q) => q.id));
    } catch (err) {
      setActionError(err);
      reload();
    }
  }

  async function remove(question) {
    if (!window.confirm(t('questions.deleteConfirm'))) return;
    setActionError(null);
    try {
      await questionApi.remove(question.id);
      setQuestions((list) => list.filter((q) => q.id !== question.id));
    } catch (err) {
      setActionError(err);
    }
  }

  if (loading) return <Loading />;
  if (error) return <ErrorMessage error={error} onRetry={reload} />;

  const { questions } = survey;

  return (
    <>
      <PageHeader
        title={tl(survey.title)}
        subtitle={t('questions.title')}
        backTo="/admin/surveys"
        backLabel={t('surveys.title')}
        actions={
          survey.isActive && (
            <Button variant="secondary" icon="eye" to={`/survey/${surveyId}`} target="_blank">
              {t('common.preview')}
            </Button>
          )
        }
      />
      <SurveyTabs surveyId={surveyId} />

      {actionError && <ErrorMessage error={actionError} />}

      {!questions.length && !adding && <EmptyState message={t('questions.empty')} />}

      <div className="stack">
        {questions.map((question, index) => (
          <QuestionItem
            key={question.id}
            question={question}
            index={index}
            isFirst={index === 0}
            isLast={index === questions.length - 1}
            onMove={(direction) => move(index, direction)}
            onDelete={() => remove(question)}
            onSaved={(saved) => setQuestions((list) => list.map((q) => (q.id === saved.id ? saved : q)))}
          />
        ))}

        {adding ? (
          <QuestionEditor
            surveyId={surveyId}
            onCancel={() => setAdding(false)}
            onSaved={(created) => {
              setQuestions((list) => [...list, created]);
              setAdding(false);
            }}
          />
        ) : (
          <button type="button" className="add-tile" onClick={() => setAdding(true)}>
            <Icon name="plus" size={20} />
            {t('questions.add')}
          </button>
        )}
      </div>
    </>
  );
}

function QuestionItem({ question, index, isFirst, isLast, onMove, onDelete, onSaved }) {
  const { t, tl } = useLanguage();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <QuestionEditor
        question={question}
        onCancel={() => setEditing(false)}
        onSaved={(saved) => {
          onSaved(saved);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <article className="card question-item">
      <div className="question-item__head">
        <div>
          <h3 className="question-item__title">
            {index + 1}. {tl(question.text)}
          </h3>
          <div className="badges">
            <span className="badge badge--type">
              <Icon name={TYPE_ICONS[question.type]} size={13} />
              {t(`questions.types.${question.type}`)}
            </span>
            {question.isRequired && <span className="badge badge--warning">{t('common.required')}</span>}
            {question.settings?.points > 0 && (
              <span className={`badge ${question.settings.correct?.length ? 'badge--points' : 'badge--error'}`}>
                <Icon name="award" size={13} />
                {question.settings.correct?.length
                  ? t('questions.pointsValue', { count: question.settings.points })
                  : t('questions.noCorrectWarning')}
              </span>
            )}
          </div>
        </div>
        <div className="row-actions">
          <Button
            size="sm"
            variant="ghost"
            icon="up"
            disabled={isFirst}
            onClick={() => onMove(-1)}
            title={t('questions.moveUp')}
            aria-label={t('questions.moveUp')}
          />
          <Button
            size="sm"
            variant="ghost"
            icon="down"
            disabled={isLast}
            onClick={() => onMove(1)}
            title={t('questions.moveDown')}
            aria-label={t('questions.moveDown')}
          />
          <Button size="sm" variant="secondary" icon="edit" onClick={() => setEditing(true)}>
            {t('common.edit')}
          </Button>
          <Button
            size="sm"
            variant="danger"
            icon="trash"
            onClick={onDelete}
            title={t('common.delete')}
            aria-label={t('common.delete')}
          />
        </div>
      </div>
      <div className="question-item__preview">
        <QuestionPreview question={question} />
      </div>
    </article>
  );
}

function QuestionEditor({ question, surveyId, onSaved, onCancel }) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState(() => toDraft(question));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isNew = !question;
  const fieldId = `q-${question?.id ?? 'new'}`;
  const hasOptions = OPTION_TYPES.includes(draft.type);
  const canHaveOther = OTHER_TYPES.includes(draft.type);
  const showOther = canHaveOther && Boolean(draft.settings.allowOther);

  const set = (patch) => setDraft((prev) => ({ ...prev, ...patch }));
  const setSettings = (patch) => set({ settings: { ...draft.settings, ...patch } });
  const setLabel = (key, lang, text) => setSettings({ [key]: { ...draft.settings[key], [lang]: text } });
  const setOption = (key, patch) =>
    set({ options: draft.options.map((o) => (o.key === key ? { ...o, ...patch } : o)) });
  const changeType = (type) => {
    // Single-answer types keep at most one correct option.
    const options =
      type === 'checkbox'
        ? draft.options
        : draft.options.map((o, i, all) => ({ ...o, correct: o.correct && all.findIndex((x) => x.correct) === i }));
    set({ type, options, settings: { ...DEFAULT_SETTINGS[type], ...draft.settings } });
  };
  const toggleCorrect = (key) =>
    set({
      options: draft.options.map((o) =>
        o.key === key ? { ...o, correct: !o.correct } : draft.type === 'checkbox' ? o : { ...o, correct: false },
      ),
    });
  const isScorable = CHOICE_TYPES.includes(draft.type);
  const points = Number(draft.settings.points) || 0;
  const isScored = points > 0;
  const hasCorrect =
    draft.type === 'yesno' ? Boolean(draft.settings.correct?.length) : draft.options.some((o) => o.correct);
  const needsCorrect = isScored && !hasCorrect;
  const setPoints = (value) => setSettings({ points: Math.min(MAX_POINTS, Math.max(0, value)) });

  async function handleSubmit(event) {
    event.preventDefault();
    const options = draft.options.filter((o) => o.en.trim() || o.km.trim());

    if (!draft.textEn.trim() && !draft.textKm.trim()) return setError(t('questions.textRequired'));
    if (hasOptions && options.length < 2) return setError(t('questions.needOptions'));

    const payload = {
      text: { en: draft.textEn, km: draft.textKm },
      type: draft.type,
      isRequired: draft.isRequired,
      options: hasOptions ? options.map((o) => ({ id: o.id, label: { en: o.en, km: o.km }, correct: o.correct })) : [],
      settings: draft.settings,
    };

    setSaving(true);
    setError('');
    try {
      const saved = isNew
        ? await questionApi.create({ ...payload, surveyId: Number(surveyId) })
        : await questionApi.update(question.id, payload);
      onSaved(saved);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <form className="card form question-editor" onSubmit={handleSubmit}>
      <div className="grid question-editor__head">
        <Input
          label={t('questions.textEn')}
          value={draft.textEn}
          maxLength={1000}
          autoFocus={isNew}
          onChange={(e) => set({ textEn: e.target.value })}
        />
        <Input
          label={t('questions.textKm')}
          lang="km"
          value={draft.textKm}
          maxLength={1000}
          onChange={(e) => set({ textKm: e.target.value })}
        />
        <div className="field">
          <span className="field__label" id={`${fieldId}-label`}>
            {t('questions.type')}
          </span>
          <TypePicker id={fieldId} value={draft.type} onChange={changeType} />
        </div>
      </div>

      <Checkbox
        compact
        label={t('questions.required')}
        checked={draft.isRequired}
        onChange={(checked) => set({ isRequired: checked })}
      />

      {draft.type === 'yesno' && <p className="note">{t('questions.yesnoNote')}</p>}

      {isScorable && (
        <div className={`scoring-editor ${isScored ? 'is-on' : ''}`}>
          <div className="scoring-editor__head">
            <span className="scoring-editor__icon" aria-hidden="true">
              <Icon name="award" size={18} />
            </span>
            <div className="scoring-editor__text">
              <span className="scoring-editor__title" id={`${fieldId}-points`}>
                {t('questions.points')}
              </span>
              <span className={`scoring-editor__hint ${needsCorrect ? 'is-warning' : ''}`}>
                {!isScored
                  ? t('questions.pointsOff')
                  : needsCorrect
                    ? t('questions.noCorrectWarning')
                    : draft.type === 'yesno'
                      ? t('questions.pointsYesNo')
                      : t(draft.type === 'checkbox' ? 'questions.markCorrectMany' : 'questions.markCorrectOne')}
              </span>
            </div>
            <div className="stepper" role="group" aria-labelledby={`${fieldId}-points`}>
              <button
                type="button"
                className="stepper__btn"
                aria-label={t('questions.pointsLess')}
                disabled={points <= 0}
                onClick={() => setPoints(Math.ceil(points) - 1)}
              >
                −
              </button>
              <input
                type="number"
                className="stepper__input"
                min={0}
                max={MAX_POINTS}
                step="0.5"
                inputMode="decimal"
                aria-labelledby={`${fieldId}-points`}
                value={draft.settings.points ?? 0}
                onChange={(e) => setPoints(e.target.value === '' ? 0 : Number(e.target.value))}
                onFocus={(e) => e.target.select()}
              />
              <button
                type="button"
                className="stepper__btn"
                aria-label={t('questions.pointsMore')}
                disabled={points >= MAX_POINTS}
                onClick={() => setPoints(Math.floor(points) + 1)}
              >
                +
              </button>
            </div>
          </div>
          {draft.type === 'yesno' && isScored && (
            <div className="field">
              <span className="field__label">{t('questions.correctAnswer')}</span>
              <div className="segmented" role="radiogroup">
                {[
                  { id: null, label: t('questions.noCorrect') },
                  { id: 'yes', label: t('survey.yes') },
                  { id: 'no', label: t('survey.no') },
                ].map((choice) => {
                  const active = (draft.settings.correct?.[0] ?? null) === choice.id;
                  return (
                    <button
                      key={choice.label}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      className={`segmented__btn ${active ? 'is-active' : ''}`}
                      onClick={() => setSettings({ correct: choice.id ? [choice.id] : [] })}
                    >
                      {choice.id && <Icon name="check" size={14} strokeWidth={2.6} />}
                      {choice.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {draft.type === 'rating' && (
        <div className="options-editor options-editor--inline">
          <label className="field">
            <span className="field__label">{t('questions.ratingMax')}</span>
            <select
              className="field__control field__control--select"
              value={draft.settings.max}
              onChange={(e) => setSettings({ max: Number(e.target.value) })}
            >
              {range(3, 10).map((n) => (
                <option key={n} value={n}>
                  {n} ★
                </option>
              ))}
            </select>
          </label>
          <QuestionPreview question={{ type: 'rating', settings: draft.settings, options: [] }} />
        </div>
      )}

      {draft.type === 'scale' && (
        <div className="options-editor">
          <div className="grid grid--pairs">
            <label className="field">
              <span className="field__label">{t('questions.scaleFrom')}</span>
              <select
                className="field__control field__control--select"
                value={draft.settings.min}
                onChange={(e) => setSettings({ min: Number(e.target.value) })}
              >
                {[0, 1].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">{t('questions.scaleTo')}</span>
              <select
                className="field__control field__control--select"
                value={draft.settings.max}
                onChange={(e) => setSettings({ max: Number(e.target.value) })}
              >
                {range(2, 10).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            {['minLabel', 'maxLabel'].map((key) =>
              ['en', 'km'].map((lang) => (
                <Input
                  key={`${key}-${lang}`}
                  label={t(`questions.${key}.${lang}`, { value: key === 'minLabel' ? draft.settings.min : draft.settings.max })}
                  lang={lang}
                  maxLength={60}
                  value={draft.settings[key]?.[lang] || ''}
                  onChange={(e) => setLabel(key, lang, e.target.value)}
                />
              )),
            )}
          </div>
          <span className="field__label">{t('questions.preview')}</span>
          <ScaleInput
            name={`${fieldId}-preview`}
            min={draft.settings.min}
            max={Math.max(draft.settings.max, draft.settings.min + 1)}
            minLabel={draft.settings.minLabel}
            maxLabel={draft.settings.maxLabel}
            onChange={() => {}}
          />
        </div>
      )}

      {!hasOptions && !['yesno', 'rating', 'scale'].includes(draft.type) && (
        <QuestionPreview question={{ type: draft.type, options: [], settings: {} }} />
      )}

      {hasOptions && (
        <fieldset className="options-editor">
          <legend className="field__label">{t('questions.options')}</legend>
          {draft.options.map((option, index) => (
            <div key={option.key} className={`options-editor__row ${option.correct ? 'is-correct' : ''}`}>
              {draft.type === 'dropdown' ? (
                <span className="options-editor__index">{index + 1}.</span>
              ) : (
                <span className={`choice__box choice__box--${draft.type}`} aria-hidden="true" />
              )}
              <input
                className="field__control"
                placeholder={t('questions.optionEn')}
                aria-label={`${t('questions.optionEn')} ${index + 1}`}
                value={option.en}
                maxLength={300}
                onChange={(e) => setOption(option.key, { en: e.target.value })}
              />
              <input
                className="field__control"
                lang="km"
                placeholder={t('questions.optionKm')}
                aria-label={`${t('questions.optionKm')} ${index + 1}`}
                value={option.km}
                maxLength={300}
                onChange={(e) => setOption(option.key, { km: e.target.value })}
              />
              <button
                type="button"
                className={`correct-toggle ${option.correct ? 'is-on' : ''}`}
                aria-pressed={option.correct}
                title={t(option.correct ? 'questions.correctMarked' : 'questions.markCorrect')}
                aria-label={t(option.correct ? 'questions.correctMarked' : 'questions.markCorrect')}
                onClick={() => toggleCorrect(option.key)}
              >
                <Icon name="check" size={15} strokeWidth={2.6} />
              </button>
              <Button
                size="sm"
                variant="ghost"
                icon="x"
                title={t('questions.removeOption')}
                aria-label={t('questions.removeOption')}
                disabled={draft.options.length <= 2}
                onClick={() => set({ options: draft.options.filter((o) => o.key !== option.key) })}
              />
            </div>
          ))}
          {showOther && (
            <div className="options-editor__row options-editor__row--other">
              <span className={`choice__box choice__box--${draft.type}`} aria-hidden="true" />
              <span className="options-editor__other">{t('questions.otherPlaceholder')}</span>
              <Button
                size="sm"
                variant="ghost"
                icon="x"
                title={t('questions.removeOther')}
                aria-label={t('questions.removeOther')}
                onClick={() => setSettings({ allowOther: false })}
              />
            </div>
          )}
          <div className="options-editor__add">
            <Button size="sm" variant="ghost" icon="plus" onClick={() => set({ options: [...draft.options, blankOption()] })}>
              {t('questions.addOption')}
            </Button>
            {canHaveOther && !showOther && (
              <Button size="sm" variant="ghost" icon="plus" onClick={() => setSettings({ allowOther: true })}>
                {t('questions.addOther')}
              </Button>
            )}
          </div>
        </fieldset>
      )}

      {error && (
        <p className="alert alert--error" role="alert">
          {error}
        </p>
      )}

      <div className="form__actions">
        <Button variant="ghost" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={saving}>
          {isNew ? t('common.create') : t('common.save')}
        </Button>
      </div>
    </form>
  );
}
