import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage.js';
import { TYPE_GROUPS, TYPE_ICONS } from '../../questionTypes.js';
import Icon from '../common/Icon.jsx';

const ALL_TYPES = TYPE_GROUPS.flatMap((group) => group.types);

// Answer-type selector: a dropdown with icons and grouped options (keyboard accessible listbox).
export default function TypePicker({ id, value, onChange }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [activeType, setActiveType] = useState(value);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const listId = `${id}-listbox`;

  // Close when clicking anywhere outside the picker.
  useEffect(() => {
    if (!open) return undefined;
    const handlePointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    return () => document.removeEventListener('mousedown', handlePointer);
  }, [open]);

  // Focus the list and keep the highlighted option in view.
  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
    listRef.current?.querySelector(`[data-type="${activeType}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, activeType]);

  function openList() {
    setActiveType(value);
    setOpen(true);
  }

  function select(type) {
    onChange(type);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function handleButtonKeyDown(event) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      openList();
    }
  }

  function handleListKeyDown(event) {
    const index = ALL_TYPES.indexOf(activeType);
    const moves = {
      ArrowDown: Math.min(index + 1, ALL_TYPES.length - 1),
      ArrowUp: Math.max(index - 1, 0),
      Home: 0,
      End: ALL_TYPES.length - 1,
    };
    if (event.key in moves) {
      event.preventDefault();
      setActiveType(ALL_TYPES[moves[event.key]]);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      select(activeType);
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      if (event.key === 'Escape') event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    }
  }

  return (
    <div className={`type-select ${open ? 'is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        ref={buttonRef}
        className="field__control type-select__button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleButtonKeyDown}
      >
        <span className="type-card__icon">
          <Icon name={TYPE_ICONS[value]} size={16} />
        </span>
        <span className="type-select__value" id={`${id}-value`}>
          {t(`questions.types.${value}`)}
        </span>
      </button>

      {open && (
        <ul
          className="type-select__menu"
          id={listId}
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={`${id}-label`}
          aria-activedescendant={`${id}-opt-${activeType}`}
          onKeyDown={handleListKeyDown}
        >
          {TYPE_GROUPS.map((group) => (
            <li key={group.key} role="presentation">
              <span className="type-picker__group-label" role="presentation">
                {t(`questions.groups.${group.key}`)}
              </span>
              <ul role="group" className="type-select__group">
                {group.types.map((type) => (
                  <li
                    key={type}
                    id={`${id}-opt-${type}`}
                    data-type={type}
                    role="option"
                    aria-selected={value === type}
                    className={[
                      'type-select__option',
                      value === type && 'is-selected',
                      activeType === type && 'is-active',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onMouseEnter={() => setActiveType(type)}
                    onClick={() => select(type)}
                  >
                    <span className="type-card__icon">
                      <Icon name={TYPE_ICONS[type]} size={16} />
                    </span>
                    <span className="type-card__label">{t(`questions.types.${type}`)}</span>
                    {value === type && <Icon name="check" size={16} className="type-select__check" />}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
