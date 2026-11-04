import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import Checkbox from '../../components/common/Checkbox.jsx';
import { ErrorMessage, Loading } from '../../components/common/Feedback.jsx';
import Input from '../../components/common/Input.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import SurveyTabs from '../../components/layout/SurveyTabs.jsx';
import CoverPicker from '../../components/survey/CoverPicker.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useLanguage } from '../../hooks/useLanguage.js';
import { isGoogleSignInConfigured } from '../../services/googleAuth.js';
import { coverUrl, surveyApi } from '../../services/surveyService.js';

// savedUrl: cover stored on the server. blob/preview: a newly picked image not uploaded yet.
const NO_COVER = { savedUrl: null, blob: null, preview: null, removed: false };

const EMPTY_FORM = {
  titleEn: '',
  titleKm: '',
  descEn: '',
  descKm: '',
  isActive: true,
  requireLogin: false,
  showScore: false,
};

export default function SurveyBuilder() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();
  const { t, tl } = useLanguage();

  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(location.state?.error || '');
  const [notice, setNotice] = useState('');
  const [cover, setCover] = useState(NO_COVER);

  const { data: survey, loading, error: loadError } = useAsync(async () => {
    if (!isEdit) return null;
    const loaded = await surveyApi.getAdmin(id);
    setCover({ ...NO_COVER, savedUrl: coverUrl(loaded) });
    setForm({
      titleEn: loaded.title.en || '',
      titleKm: loaded.title.km || '',
      descEn: loaded.description.en || '',
      descKm: loaded.description.km || '',
      isActive: loaded.isActive,
      requireLogin: loaded.requireLogin,
      showScore: loaded.showScore,
    });
    return loaded;
  }, [id]);

  const update = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    setNotice('');
  };

  // Uploads or removes the cover after the survey itself is saved (a new survey needs its ID first).
  async function saveCover(saved) {
    if (cover.blob) return surveyApi.setCover(saved.id, cover.blob);
    if (cover.removed && cover.savedUrl) return surveyApi.removeCover(saved.id);
    return saved;
  }

  function selectCover(blob, preview) {
    if (cover.preview) URL.revokeObjectURL(cover.preview);
    setCover((prev) => ({ ...prev, blob, preview, removed: false }));
    setNotice('');
  }

  function removeCover() {
    if (cover.preview) URL.revokeObjectURL(cover.preview);
    setCover((prev) => ({ ...prev, blob: null, preview: null, removed: true }));
    setNotice('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.titleEn.trim() && !form.titleKm.trim()) {
      setError(t('builder.titleRequired'));
      return;
    }

    const payload = {
      title: { en: form.titleEn, km: form.titleKm },
      description: { en: form.descEn, km: form.descKm },
      isActive: form.isActive,
      requireLogin: form.requireLogin,
      showScore: form.showScore,
    };

    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        const withCover = await saveCover(await surveyApi.update(id, payload));
        setCover({ ...NO_COVER, savedUrl: coverUrl(withCover) });
        setNotice(t('common.saved'));
      } else {
        const created = await surveyApi.create(payload);
        try {
          await saveCover(created);
        } catch (err) {
          // The survey exists now; continue on its edit page so pressing Create again can't duplicate it.
          setError(err.message);
          navigate(`/admin/surveys/${created.id}/edit`, { state: { error: err.message } });
          return;
        }
        navigate(`/admin/surveys/${created.id}/questions`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading />;
  if (loadError) return <ErrorMessage error={loadError} />;

  return (
    <>
      <PageHeader
        title={isEdit ? tl(survey.title) : t('builder.newTitle')}
        subtitle={isEdit ? t('builder.editTitle') : null}
        backTo="/admin/surveys"
        backLabel={t('surveys.title')}
      />
      {isEdit && <SurveyTabs surveyId={id} />}

      <form className="card form" onSubmit={handleSubmit}>
        <CoverPicker
          src={cover.preview || (cover.removed ? null : cover.savedUrl)}
          onSelect={selectCover}
          onRemove={removeCover}
        />

        <div className="grid grid--pairs">
          <Input label={t('builder.titleEn')} value={form.titleEn} maxLength={200} onChange={update('titleEn')} />
          <Input
            label={t('builder.titleKm')}
            lang="km"
            value={form.titleKm}
            maxLength={200}
            onChange={update('titleKm')}
          />
          <Input
            label={t('builder.descEn')}
            multiline
            value={form.descEn}
            maxLength={2000}
            onChange={update('descEn')}
          />
          <Input
            label={t('builder.descKm')}
            lang="km"
            multiline
            value={form.descKm}
            maxLength={2000}
            onChange={update('descKm')}
          />
        </div>

        <Checkbox
          label={t('builder.active')}
          description={t('builder.activeHint')}
          checked={form.isActive}
          onChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
        />

        <Checkbox
          label={t('builder.requireLogin')}
          description={t('builder.requireLoginHint')}
          checked={form.requireLogin}
          onChange={(checked) => setForm((prev) => ({ ...prev, requireLogin: checked }))}
        />
        {form.requireLogin && !isGoogleSignInConfigured && (
          <p className="alert alert--error">{t('builder.requireLoginNotConfigured')}</p>
        )}

        <Checkbox
          label={t('builder.showScore')}
          description={t('builder.showScoreHint')}
          checked={form.showScore}
          onChange={(checked) => setForm((prev) => ({ ...prev, showScore: checked }))}
        />

        {error && (
          <p className="alert alert--error" role="alert">
            {error}
          </p>
        )}

        <div className="form__actions">
          {notice && <span className="text-success">{notice}</span>}
          <Button type="submit" loading={saving}>
            {isEdit ? t('common.save') : t('builder.createAndContinue')}
          </Button>
        </div>
      </form>
    </>
  );
}
