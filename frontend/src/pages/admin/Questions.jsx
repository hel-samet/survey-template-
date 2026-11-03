import { useState } from 'react';
import { useParams } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import Checkbox from '../../components/common/Checkbox.jsx';
import Icon from '../../components/common/Icon.jsx';
import { EmptyState, ErrorMessage, Loading } from '../../components/common/Feedback.jsx';
import Input from '../../components/common/Input.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import SurveyTabs from '../../components/layout/SurveyTabs.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useLanguage } from '../../hooks/useLanguage.js';
import { questionApi, surveyApi } from '../../services/surveyService.js';

const QUESTION_TYPES = ['checkbox', 'radio', 'text'];

let draftKey = 0;
const blankOption = () => ({ key: `new-${++draftKey}`, id: undefined, en: '', km: '' });

function toDraft(question) {
  return {
    textEn: question?.text.en || '',
    textKm: question?.text.km || '',
    type: question?.type || 'checkbox',
    isRequired: question?.isRequired ?? false,
    options: question?.options.length
      ? question.options.map((o) => ({ key: o.id, id: o.id, en: o.label.en || '', km: o.label.km || '' }))
      : [blankOption(), blankOption()],
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
            <span className="badge">{t(`questions.typeShort.${question.type}`)}</span>
            {question.isRequired && <span className="badge badge--warning">{t('common.required')}</span>}
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
      {question.type !== 'text' && (
        <ul className="option-preview">
          {question.options.map((option) => (
            <li key={option.id}>
              <span className={`choice__box choice__box--${question.type}`} aria-hidden="true" />
              {tl(option.label)}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function QuestionEditor({ question, surveyId, onSaved, onCancel }) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState(() => toDraft(question));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isNew = !question;
  const isChoice = draft.type !== 'text';

  const set = (patch) => setDraft((prev) => ({ ...prev, ...patch }));
  const setOption = (key, patch) =>
    set({ options: draft.options.map((o) => (o.key === key ? { ...o, ...patch } : o)) });

  async function handleSubmit(event) {
    event.preventDefault();
    const options = draft.options.filter((o) => o.en.trim() || o.km.trim());

    if (!draft.textEn.trim() && !draft.textKm.trim()) return setError(t('questions.textRequired'));
    if (isChoice && options.length < 2) return setError(t('questions.needOptions'));

    const payload = {
      text: { en: draft.textEn, km: draft.textKm },
      type: draft.type,
      isRequired: draft.isRequired,
      options: isChoice ? options.map((o) => ({ id: o.id, label: { en: o.en, km: o.km } })) : [],
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
      <div className="grid grid--2">
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
      </div>

      <div className="grid grid--2 align-end">
        <div className="field">
          <label className="field__label" htmlFor={`type-${question?.id ?? 'new'}`}>
            {t('questions.type')}
          </label>
          <select
            id={`type-${question?.id ?? 'new'}`}
            className="field__control"
            value={draft.type}
            onChange={(e) => set({ type: e.target.value })}
          >
            {QUESTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`questions.types.${type}`)}
              </option>
            ))}
          </select>
        </div>
        <Checkbox
          compact
          label={t('questions.required')}
          checked={draft.isRequired}
          onChange={(checked) => set({ isRequired: checked })}
        />
      </div>

      {isChoice && (
        <fieldset className="options-editor">
          <legend className="field__label">{t('questions.options')}</legend>
          {draft.options.map((option, index) => (
            <div key={option.key} className="options-editor__row">
              <span className={`choice__box choice__box--${draft.type}`} aria-hidden="true" />
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
          <Button size="sm" variant="ghost" icon="plus" onClick={() => set({ options: [...draft.options, blankOption()] })}>
            {t('questions.addOption')}
          </Button>
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
