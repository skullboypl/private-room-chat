'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '@/context/LocaleContext';
import { translateRoomError } from '@/lib/i18n/systemMessages';
import './Modal.css';

function normalizeRoomName(name) {
  const trimmed = name.trim();
  return trimmed || null;
}

export default function JoinRoomModal({
  open,
  onClose,
  onJoin,
  onClearError,
  error,
  activeRooms = [],
  initialRoomName = '',
  initialPassword = '',
  joining,
}) {
  const { t } = useTranslation();
  const [roomName, setRoomName] = useState(initialRoomName);
  const [password, setPassword] = useState(initialPassword);

  useEffect(() => {
    if (open) {
      setRoomName(initialRoomName);
      setPassword(initialPassword);
    }
  }, [open, initialRoomName, initialPassword]);

  const trimmedRoomName = normalizeRoomName(roomName);
  const roomExists = useMemo(
    () => Boolean(trimmedRoomName && activeRooms.includes(trimmedRoomName)),
    [trimmedRoomName, activeRooms],
  );

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (joining) return;
    const name = trimmedRoomName;
    const pwd = password.trim();
    if (name && pwd) onJoin(name, pwd);
  };

  const handleRoomNameChange = (value) => {
    setRoomName(value);
    onClearError?.();
  };

  const handlePasswordChange = (value) => {
    setPassword(value);
    onClearError?.();
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="join-title" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-card__close" onClick={onClose} aria-label={t('chat.close')}>×</button>
        <h2 id="join-title" className="modal-card__title">
          {roomExists ? t('joinModal.joinExisting') : t('joinModal.joinOrCreate')}
        </h2>
        <p className="modal-card__subtitle">
          {roomExists
            ? t('joinModal.roomTakenSubtitle', { room: trimmedRoomName })
            : t('joinModal.createHint')}
        </p>
        <form onSubmit={handleSubmit} className="modal-form">
          {roomExists && (
            <p className="modal-form__notice modal-form__notice--exists" role="status">
              {t('joinModal.roomTakenNotice')}
            </p>
          )}
          <label className="modal-form__label" htmlFor="join-room">{t('joinModal.roomName')}</label>
          <input
            id="join-room"
            type="text"
            value={roomName}
            onChange={(e) => handleRoomNameChange(e.target.value)}
            placeholder={t('rooms.roomPlaceholder')}
            required
            autoComplete="off"
            maxLength={64}
            disabled={joining}
            aria-invalid={roomExists ? 'true' : undefined}
          />
          <label className="modal-form__label" htmlFor="join-pwd">
            {roomExists ? t('joinModal.passwordJoin') : t('joinModal.password')}
          </label>
          <input
            id="join-pwd"
            type="password"
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            placeholder={roomExists ? t('joinModal.passwordPlaceholderJoin') : t('joinModal.passwordPlaceholder')}
            required
            autoComplete="off"
            disabled={joining}
            aria-invalid={Boolean(error) || undefined}
          />
          <button type="submit" className="btn btn--primary" disabled={joining}>
            {joining
              ? t('joinModal.connecting')
              : roomExists
                ? t('joinModal.submitJoin')
                : t('joinModal.submitEnter')}
          </button>
        </form>
        {error && <p className="error-message modal-form__error" role="alert">{translateRoomError(error, t)}</p>}
      </div>
    </div>
  );
}
