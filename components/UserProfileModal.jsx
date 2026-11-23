'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import UserAvatar from '@/components/UserAvatar';
import AvatarRerollButton from '@/components/AvatarRerollButton';
import { useTranslation } from '@/context/LocaleContext';
import './Modal.css';
import './UserProfileModal.css';
import './UserNameInput.css';

export default function UserProfileModal({
  open,
  draftName,
  draftAvatarSeed,
  draftAvatarStyle,
  randomizeDisabled = false,
  randomizeWaitSeconds = 0,
  randomizeNickDisabled = false,
  randomizeNickWaitSeconds = 0,
  onDraftNameChange,
  onRandomizeAvatar,
  onRandomizeNickname,
  onSave,
  onClear,
  onClose,
}) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="modal-overlay user-profile-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      onClick={onClose}
    >
      <div className="modal-card user-profile-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="modal-card__close"
          onClick={onClose}
          aria-label={t('chat.close')}
        >
          ×
        </button>

        <h2 id="profile-modal-title" className="modal-card__title">
          {t('welcome.profileTitle')}
        </h2>
        <p className="modal-card__subtitle user-profile-modal__hint">
          {t('welcome.profileHint')}
        </p>

        <form onSubmit={onSave} className="user-profile-modal__form" autoComplete="off">
          <div className="user-profile-modal__avatar-block">
            <div className="user-profile-modal__avatar-wrap">
              {draftAvatarSeed ? (
                <UserAvatar
                  seed={draftAvatarSeed}
                  style={draftAvatarStyle}
                  className="user-profile-modal__avatar"
                  size={88}
                  alt=""
                />
              ) : (
                <span className="user-profile-modal__avatar-placeholder" aria-hidden="true" />
              )}
              <AvatarRerollButton
                size="lg"
                onClick={onRandomizeAvatar}
                disabled={randomizeDisabled}
                waitSeconds={randomizeWaitSeconds}
              />
            </div>
          </div>

          <label className="profile-nick-field">
            <span className="profile-nick-field__label">{t('welcome.nickAria')}</span>
            <div className="profile-nick-field__row">
              <input
                type="text"
                name="vxh-profile-nick"
                className="profile-nick-field__input"
                value={draftName}
                onChange={(e) => onDraftNameChange(e.target.value)}
                placeholder={t('welcome.nickPlaceholderShort')}
                required
                aria-label={t('welcome.nickAria')}
                autoComplete="nickname"
                maxLength={32}
                autoFocus
              />
              <AvatarRerollButton
                size="sm"
                onClick={onRandomizeNickname}
                disabled={randomizeNickDisabled}
                waitSeconds={randomizeNickWaitSeconds}
                ariaLabelKey="welcome.randomizeNickAria"
                waitLabelKey="welcome.randomizeNickWait"
              />
            </div>
          </label>

          <div className="user-profile-modal__actions">
            <button type="submit" className="btn btn--primary">
              {t('welcome.profileSave')}
            </button>
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              {t('welcome.profileCancel')}
            </button>
          </div>

          {onClear ? (
            <button
              type="button"
              className="user-profile-modal__clear"
              onClick={onClear}
              aria-label={t('welcome.clearSessionAria')}
            >
              {t('welcome.clearSession')}
            </button>
          ) : null}
        </form>
      </div>
    </div>,
    document.body,
  );
}
