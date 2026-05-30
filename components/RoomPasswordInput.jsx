'use client';

import { useCallback, useId, useState } from 'react';
import './RoomPasswordInput.css';

/**
 * Hasło pokoju — nie login. type="text" + maskowanie zamiast type="password",
 * żeby iOS/Android nie proponowały „silnego hasła” ani zapisu konta.
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
  const [locked, setLocked] = useState(true);

  const unlock = useCallback(() => {
    setLocked(false);
  }, []);

  return (
    <input
      id={id}
      type="text"
      name="vxh-channel-key"
      className={['room-pass-input', className].filter(Boolean).join(' ')}
      value={value}
      onChange={onChange}
      onFocus={unlock}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      readOnly={locked}
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
