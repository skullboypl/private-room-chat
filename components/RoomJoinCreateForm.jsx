'use client';

import { useState, useEffect } from 'react';
import FormAutofillTrap from '@/components/FormAutofillTrap';
import RoomPasswordInput from '@/components/RoomPasswordInput';
import { useTranslation } from '@/context/LocaleContext';
import { translateRoomError } from '@/lib/i18n/systemMessages';

export default function RoomJoinCreateForm({ onJoinRoom, error, initialRoomName = '', initialPassword = '' }) {
  const { t } = useTranslation();
  const [roomName, setRoomName] = useState(initialRoomName);
  const [password, setPassword] = useState(initialPassword);
  const [noPassword, setNoPassword] = useState(false);

  useEffect(() => { setRoomName(initialRoomName); }, [initialRoomName]);
  useEffect(() => { if (initialPassword) setPassword(initialPassword); }, [initialPassword]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = roomName.trim();
    if (!name) return;
    if (noPassword) {
      onJoinRoom(name, '', { noPassword: true });
      setPassword('');
      return;
    }
    const pwd = password.trim();
    if (pwd) {
      onJoinRoom(name, pwd);
      setPassword('');
    }
  };

  return (
    <>
      <h3 id="join-heading" className="section-title">{t('rooms.joinSection')}</h3>
      <form onSubmit={handleSubmit} className="room-join-form" autoComplete="off">
        <FormAutofillTrap />
        <input
          type="text"
          name="vxh-channel-name"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder={t('rooms.roomPlaceholder')}
          required
          aria-label={t('joinModal.roomName')}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={64}
        />
        <label className="modal-form__check">
          <input
            type="checkbox"
            checked={noPassword}
            onChange={(e) => {
              setNoPassword(e.target.checked);
              if (e.target.checked) setPassword('');
            }}
          />
          <span>{t('joinModal.noPassword')}</span>
        </label>
        {!noPassword && (
          <RoomPasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('rooms.passwordPlaceholder')}
            required
            aria-label={t('rooms.passwordAria')}
          />
        )}
        <button type="submit" className="btn btn--primary">{t('rooms.submit')}</button>
      </form>
      {error && <p className="error-message" role="alert">{translateRoomError(error, t)}</p>}
    </>
  );
}
