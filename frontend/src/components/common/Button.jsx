import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';

// variant: primary | secondary | danger | ghost    size: sm | md | lg
// Pass `to` to render a router link styled as a button, `icon` / `iconRight` for an Icon name.
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  to,
  type = 'button',
  className = '',
  disabled,
  children,
  ...props
}) {
  const classes = ['btn', `btn--${variant}`, `btn--${size}`, !children && 'btn--icon', className]
    .filter(Boolean)
    .join(' ');
  const iconSize = size === 'sm' ? 15 : 18;
  const content = (
    <>
      {loading ? <span className="spinner" aria-hidden="true" /> : icon && <Icon name={icon} size={iconSize} />}
      {children}
      {iconRight && <Icon name={iconRight} size={iconSize} className="btn__icon-right" />}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {content}
    </button>
  );
}
