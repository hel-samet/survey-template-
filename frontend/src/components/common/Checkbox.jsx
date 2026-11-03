// Shared visual for checkbox and radio choices. Use type="radio" for single-choice lists.
export default function Checkbox({
  label,
  description,
  checked = false,
  onChange,
  type = 'checkbox',
  name,
  value,
  disabled = false,
  compact = false,
}) {
  const classes = [
    'choice',
    checked && 'choice--checked',
    disabled && 'choice--disabled',
    compact && 'choice--compact',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <label className={classes}>
      <input
        type={type}
        className="choice__input"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked, event)}
      />
      <span className={`choice__box choice__box--${type}`} aria-hidden="true" />
      <span className="choice__text">
        <span className="choice__label">{label}</span>
        {description && <span className="choice__desc">{description}</span>}
      </span>
    </label>
  );
}
