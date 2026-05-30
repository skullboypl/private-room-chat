'use client';

import { useState, useEffect, useMemo } from 'react';
import FormAutofillTrap from '@/components/FormAutofillTrap';
import RoomPasswordInput from '@/components/RoomPasswordInput';
import { findActiveRoomMeta } from '@/lib/roomAccess';
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
  const [noPassword, setNoPassword] = useState(false);

  useEffect(() => {
    if (open) {
      setRoomName(initialRoomName);
      setPassword(initialPassword);
      setNoPassword(false);
    }
  }, [open, initialRoomName, initialPassword]);

  const trimmedRoomName = normalizeRoomName(roomName);
  const roomMeta = useMemo(
    () => (trimmedRoomName ? findActiveRoomMeta(activeRooms, trimmedRoomName) : null),
    [activeRooms, trimmedRoomName],
  );
  const roomExists = Boolean(roomMeta);
  const targetIsOpen = Boolean(roomMeta?.isOpen);
  const showPasswordField = !targetIsOpen && (!noPassword || roomExists);
  const canCreateOpen = !roomExists && noPassword;

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (joining) return;
    const name = trimmedRoomName;
    if (!name) return;

    if (targetIsOpen || canCreateOpen) {
      onJoin(name, '', { noPassword: true });
      return;
    }

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
          {targetIsOpen
            ? t('joinModal.openRoomSubtitle', { room: trimmedRoomName })
            : roomExists
              ? t('joinModal.roomTakenSubtitle', { room: trimmedRoomName })
              : t('joinModal.createHint')}
        </p>
        <form onSubmit={handleSubmit} className="modal-form modal-form--room-join" autoComplete="off">
          <FormAutofillTrap />
          {roomExists && !targetIsOpen && (
            <p className="modal-form__notice modal-form__notice--exists" role="status">
              {t('joinModal.roomTakenNotice')}
            </p>
          )}
          {targetIsOpen && (
            <p className="modal-form__notice modal-form__notice--open" role="status">
              {t('joinModal.openRoomNotice')}
            </p>
          )}
          <label className="modal-form__label" htmlFor="join-room">{t('joinModal.roomName')}</label>
          <input
            id="join-room"
            type="text"
            name="vxh-channel-name"
            value={roomName}
            onChange={(e) => handleRoomNameChange(e.target.value)}
            placeholder={t('rooms.roomPlaceholder')}
            required
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={64}
            disabled={joining}
            aria-invalid={roomExists && !targetIsOpen ? 'true' : undefined}
          />
          {!roomExists && (
            <label className="modal-form__check">
              <input
                type="checkbox"
                checked={noPassword}
                onChange={(e) => {
                  setNoPassword(e.target.checked);
                  if (e.target.checked) setPassword('');
                  onClearError?.();
                }}
                disabled={joining}
              />
              <span>{t('joinModal.noPassword')}</span>
            </label>
          )}
          {!roomExists && noPassword && (
            <p className="modal-form__hint">{t('joinModal.noPasswordHint')}</p>
          )}
          {showPasswordField && (
            <>
              <label className="modal-form__label" htmlFor="join-pwd">
                {roomExists ? t('joinModal.passwordJoin') : t('joinModal.password')}
              </label>
              <RoomPasswordInput
                id="join-pwd"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                placeholder={roomExists ? t('joinModal.passwordPlaceholderJoin') : t('joinModal.passwordPlaceholder')}
                required
                disabled={joining}
                aria-invalid={Boolean(error) || undefined}
                aria-label={roomExists ? t('joinModal.passwordJoin') : t('joinModal.password')}
              />
            </>
          )}
          <button type="submit" className="btn btn--primary" disabled={joining}>
            {joining
              ? t('joinModal.connecting')
              : targetIsOpen || canCreateOpen
                ? t('joinModal.submitJoinOpen')
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
