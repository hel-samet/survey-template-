import { useId } from 'react';

export default function Input({ label, hint, error, multiline = false, id, className = '', ...props }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const messageId = `${inputId}-message`;
  const Field = multiline ? 'textarea' : 'input';
  const message = error || hint;

  return (
    <div className={['field', error && 'field--error', className].filter(Boolean).join(' ')}>
      {label && (
        <label htmlFor={inputId} className="field__label">
          {label}
        </label>
      )}
      <Field
        id={inputId}
        className="field__control"
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        rows={multiline ? 3 : undefined}
        {...props}
      />
      {message && (
        <p id={messageId} className={error ? 'field__error' : 'field__hint'}>
          {message}
        </p>
      )}
    </div>
  );
}
