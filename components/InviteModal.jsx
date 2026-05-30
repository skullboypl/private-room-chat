'use client';

import { useState } from 'react';
import AppLogo from '@/components/AppLogo';
import { useTranslation } from '@/context/LocaleContext';
import { translateRoomError } from '@/lib/i18n/systemMessages';
import './Modal.css';

export default function InviteModal({ roomName, onJoin, error, joining }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || joining) return;
    onJoin(trimmed);
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="invite-title">
      <div className="modal-card modal-card--invite">
        <AppLogo size={52} className="modal-card__logo" />
        <h2 id="invite-title" className="modal-card__title">{t('invite.title')}</h2>
        <p className="modal-card__subtitle">
          {t('invite.joining', { room: roomName })}
        </p>
        <form onSubmit={handleSubmit} className="modal-form" autoComplete="off">
          <label className="modal-form__label" htmlFor="invite-nick">{t('invite.yourNick')}</label>
          <input
            id="invite-nick"
            type="text"
            name="vxh-nick"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('invite.nickPlaceholder')}
            required
            autoComplete="nickname"
            maxLength={32}
            autoFocus
            disabled={joining}
          />
          <button type="submit" className="btn btn--primary" disabled={joining}>
            {joining ? t('joinModal.connecting') : t('invite.joinButton')}
          </button>
        </form>
        {error && <p className="error-message" role="alert">{translateRoomError(error, t)}</p>}
      </div>
    </div>
  );
}
