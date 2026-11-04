import { useRef, useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage.js';
import Button from '../common/Button.jsx';
import Icon from '../common/Icon.jsx';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_WIDTH = 1600;
const MAX_HEIGHT = 1200;

// Shrinks the photo in the browser so uploads stay small (the server accepts at most 2 MB).
async function prepareCover(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_WIDTH / bitmap.width, MAX_HEIGHT / bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; // transparent PNG areas become white instead of black
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('encode failed'))), 'image/jpeg', 0.85);
  });
}

// Cover image field for the survey builder. `src` is what to show now (saved URL or a local preview).
export default function CoverPicker({ src, onSelect, onRemove }) {
  const { t } = useLanguage();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow picking the same file again
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      setError(t('builder.coverInvalid'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      const blob = await prepareCover(file);
      onSelect(blob, URL.createObjectURL(blob));
    } catch {
      setError(t('builder.coverInvalid'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="field">
      <span className="field__label">{t('builder.cover')}</span>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        className="sr-only"
        tabIndex={-1}
        onChange={handleFile}
      />

      {src ? (
        <div className="cover-picker">
          <img className="cover-picker__image" src={src} alt="" />
          <div className="cover-picker__actions">
            <Button type="button" variant="secondary" size="sm" icon="image" loading={busy} onClick={() => inputRef.current?.click()}>
              {t('builder.coverChange')}
            </Button>
            <Button type="button" variant="secondary" size="sm" icon="trash" onClick={onRemove}>
              {t('builder.coverRemove')}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="cover-picker cover-picker--empty"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? <span className="spinner" aria-hidden="true" /> : <Icon name="image" size={26} />}
          <span className="cover-picker__cta">{t('builder.coverAdd')}</span>
          <span className="field__hint">{t('builder.coverHint')}</span>
        </button>
      )}

      {error && <p className="field__error">{error}</p>}
    </div>
  );
}
