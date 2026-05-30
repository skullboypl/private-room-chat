'use client';

import { useCallback, useId, useRef } from 'react';
import './RoomPasswordInput.css';

/**
 * Hasło pokoju — nie login. type="text" + maskowanie zamiast type="password",
 * żeby iOS/Android nie proponowały „silnego hasła” ani zapisu konta.
 * readonly do pierwszego tapnięcia (anty-autofill); zdejmowany synchronicznie,
 * żeby klawiatura otworzyła się od razu na mobile.
 */
export default function RoomPasswordInput({
  id: idProp,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  className = '',
}) {
  const autoId = useId();
  const id = idProp || autoId;
  const inputRef = useRef(null);

  const unlock = useCallback(() => {
    const el = inputRef.current;
    if (!el?.hasAttribute('readonly')) return;
    el.removeAttribute('readonly');
  }, []);

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      name="vxh-channel-key"
      className={['room-pass-input', className].filter(Boolean).join(' ')}
      value={value}
      onChange={onChange}
      onPointerDown={unlock}
      onTouchStart={unlock}
      onFocus={unlock}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      readOnly
      aria-label={ariaLabel}
      aria-invalid={ariaInvalid}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      inputMode="text"
      data-lpignore="true"
      data-1p-ignore="true"
      data-form-type="other"
    />
  );
}
