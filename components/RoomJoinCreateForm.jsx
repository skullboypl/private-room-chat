'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/context/LocaleContext';
import { translateRoomError } from '@/lib/i18n/systemMessages';

export default function RoomJoinCreateForm({ onJoinRoom, error, initialRoomName = '', initialPassword = '' }) {
  const { t } = useTranslation();
  const [roomName, setRoomName] = useState(initialRoomName);
  const [password, setPassword] = useState(initialPassword);

  useEffect(() => { setRoomName(initialRoomName); }, [initialRoomName]);
  useEffect(() => { if (initialPassword) setPassword(initialPassword); }, [initialPassword]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (roomName.trim() && password.trim()) {
      onJoinRoom(roomName.trim(), password.trim());
      setPassword('');
    }
  };

  return (
    <>
      <h3 id="join-heading" className="section-title">{t('rooms.joinSection')}</h3>
      <form onSubmit={handleSubmit} autoComplete="off">
        <input type="text" name="vxh-room" value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder={t('rooms.roomPlaceholder')} required aria-label={t('joinModal.roomName')} autoComplete="off" maxLength={64} />
        <input type="password" name="vxh-room-pass" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('rooms.passwordPlaceholder')} required aria-label={t('rooms.passwordAria')} autoComplete="new-password" data-lpignore="true" data-1p-ignore="true" />
        <button type="submit" className="btn btn--primary">{t('rooms.submit')}</button>
      </form>
      {error && <p className="error-message" role="alert">{translateRoomError(error, t)}</p>}
    </>
  );
}
