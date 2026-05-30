'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import UserAvatar from '@/components/UserAvatar';
import AvatarRerollButton from '@/components/AvatarRerollButton';
import UserProfileModal from '@/components/UserProfileModal';
import {
  readStoredUserAvatarSeed,
  readStoredUserAvatarStyle,
  createRandomAvatar,
  writeStoredUserAvatar,
  ensureStoredUserAvatar,
  clearUserSessionStorage,
} from '@/lib/userAvatarStorage';
import { invalidateUserAvatarCache } from '@/lib/userAvatar';
import { createAvatarRandomizeLimiter } from '@/lib/avatarRandomizeLimit';
import { createNicknameRandomizeLimiter } from '@/lib/nicknameRandomizeLimit';
import { createRandomNickname } from '@/lib/randomNickname';
import { useTranslation } from '@/context/LocaleContext';
import './UserNameInput.css';

export function readStoredUsername() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('username')?.trim() || '';
}

export default function UserNameInput({
  onSetUsername,
  onClearUser,
  onClearProfile,
  onAvatarChange,
  syncedProfileAvatar = null,
  clearInProfileModal = true,
  compact = false,
  initialName = '',
}) {
  const { t, lang } = useTranslation();
  const randomizeLimiterRef = useRef(null);
  if (!randomizeLimiterRef.current) {
    randomizeLimiterRef.current = createAvatarRandomizeLimiter();
  }
  const nickRandomizeLimiterRef = useRef(null);
  if (!nickRandomizeLimiterRef.current) {
    nickRandomizeLimiterRef.current = createNicknameRandomizeLimiter();
  }

  const [name, setName] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [avatarSeed, setAvatarSeed] = useState(() => {
    if (typeof window === 'undefined') return '';
    return readStoredUserAvatarSeed() || '';
  });
  const [avatarStyle, setAvatarStyle] = useState(readStoredUserAvatarStyle);
  const [draftName, setDraftName] = useState('');
  const [draftAvatarSeed, setDraftAvatarSeed] = useState('');
  const [draftAvatarStyle, setDraftAvatarStyle] = useState(readStoredUserAvatarStyle());
  const [randomizeCooldownMs, setRandomizeCooldownMs] = useState(0);
  const [nickRandomizeCooldownMs, setNickRandomizeCooldownMs] = useState(0);

  const applyAvatarState = useCallback((seed, style, { persist = false } = {}) => {
    setAvatarSeed(seed);
    setAvatarStyle(style);
    if (persist) {
      writeStoredUserAvatar(seed, style);
      invalidateUserAvatarCache();
    }
  }, []);

  const syncAvatarFromStorage = useCallback(({ persist = false } = {}) => {
    const storedSeed = readStoredUserAvatarSeed();
    if (storedSeed) {
      applyAvatarState(storedSeed, readStoredUserAvatarStyle(), { persist });
      return;
    }
    const { seed, style } = createRandomAvatar();
    applyAvatarState(seed, style, { persist });
  }, [applyAvatarState]);

  useEffect(() => {
    const stored = readStoredUsername();
    const nextName = (stored || String(initialName || '').trim());
    if (nextName) {
      setName(nextName);
      syncAvatarFromStorage({ persist: true });
    } else if (!compact) {
      setName('');
      syncAvatarFromStorage({ persist: true });
    } else {
      setName('');
    }
  }, [initialName, compact, syncAvatarFromStorage]);

  useEffect(() => {
    if (!compact || !name) return;
    if (!syncedProfileAvatar?.avatarSeed) return;
    applyAvatarState(
      syncedProfileAvatar.avatarSeed,
      syncedProfileAvatar.avatarStyle || readStoredUserAvatarStyle(),
    );
  }, [compact, name, syncedProfileAvatar?.avatarSeed, syncedProfileAvatar?.avatarStyle, applyAvatarState]);

  useEffect(() => {
    if (randomizeCooldownMs <= 0) return undefined;

    const tick = () => {
      const retryAfterMs = randomizeLimiterRef.current.getRetryAfterMs();
      setRandomizeCooldownMs(retryAfterMs);
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [randomizeCooldownMs]);

  useEffect(() => {
    if (nickRandomizeCooldownMs <= 0) return undefined;

    const tick = () => {
      const retryAfterMs = nickRandomizeLimiterRef.current.getRetryAfterMs();
      setNickRandomizeCooldownMs(retryAfterMs);
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [nickRandomizeCooldownMs]);

  const tryRandomizeAvatar = useCallback((applyAvatar) => {
    const result = randomizeLimiterRef.current.tryConsume();
    if (!result.ok) {
      setRandomizeCooldownMs(result.retryAfterMs);
      return false;
    }

    const { seed, style } = createRandomAvatar();
    applyAvatar(seed, style);
    writeStoredUserAvatar(seed, style);
    invalidateUserAvatarCache();
    setRandomizeCooldownMs(0);
    return true;
  }, []);

  const tryRandomizeNickname = useCallback((applyNick) => {
    const result = nickRandomizeLimiterRef.current.tryConsume();
    if (!result.ok) {
      setNickRandomizeCooldownMs(result.retryAfterMs);
      return false;
    }

    applyNick(createRandomNickname(lang));
    setNickRandomizeCooldownMs(0);
    return true;
  }, [lang]);

  const openProfileModal = () => {
    setDraftName(name || readStoredUsername());
    setDraftAvatarSeed(
      syncedProfileAvatar?.avatarSeed
      || readStoredUserAvatarSeed()
      || ensureStoredUserAvatar(),
    );
    setDraftAvatarStyle(
      syncedProfileAvatar?.avatarStyle || readStoredUserAvatarStyle(),
    );
    setProfileOpen(true);
  };

  const closeProfileModal = () => {
    setProfileOpen(false);
  };

  const handleRandomizeDraftAvatar = () => {
    tryRandomizeAvatar((seed, style) => {
      setDraftAvatarSeed(seed);
      setDraftAvatarStyle(style);
    });
  };

  const handleRandomizeDraftNickname = () => {
    tryRandomizeNickname(setDraftName);
  };

  const persistProfile = (trimmed, seed, style) => {
    writeStoredUserAvatar(seed, style);
    invalidateUserAvatarCache();
    localStorage.setItem('username', trimmed);
    setName(trimmed);
    setAvatarSeed(seed);
    setAvatarStyle(style);
    onSetUsername(trimmed, { avatarSeed: seed, avatarStyle: style });
    onAvatarChange?.({ avatarSeed: seed, avatarStyle: style });
  };

  const handleProfileSave = (e) => {
    e.preventDefault();
    const trimmed = draftName.trim();
    if (!trimmed) return;

    const seed = draftAvatarSeed || ensureStoredUserAvatar();
    const style = draftAvatarStyle || readStoredUserAvatarStyle();
    persistProfile(trimmed, seed, style);
    closeProfileModal();
  };

  const handleClearSession = async () => {
    if (onClearProfile) {
      const ok = await onClearProfile();
      if (!ok) return;
    }

    clearUserSessionStorage();
    invalidateUserAvatarCache();
    setName('');
    setAvatarSeed('');
    setAvatarStyle(readStoredUserAvatarStyle());
    setDraftName('');
    setDraftAvatarSeed('');
    setDraftAvatarStyle(readStoredUserAvatarStyle());
    closeProfileModal();
    onClearUser?.();
  };

  const handleWelcomeSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const seed = avatarSeed || readStoredUserAvatarSeed();
    const style = avatarStyle || readStoredUserAvatarStyle();
    if (!seed) return;

    persistProfile(trimmed, seed, style);
  };

  const randomizeDisabled = randomizeCooldownMs > 0;
  const randomizeWaitSeconds = randomizeCooldownMs > 0
    ? Math.max(1, Math.ceil(randomizeCooldownMs / 1000))
    : 0;
  const randomizeNickDisabled = nickRandomizeCooldownMs > 0;
  const randomizeNickWaitSeconds = nickRandomizeCooldownMs > 0
    ? Math.max(1, Math.ceil(nickRandomizeCooldownMs / 1000))
    : 0;

  const displaySeed = compact
    ? (avatarSeed || readStoredUserAvatarSeed())
    : avatarSeed;
  const displayStyle = avatarStyle;
  const hasPriorSession = Boolean(readStoredUsername());

  const welcomeAvatarRow = (
    <div className="username-avatar-row">
      <div className="username-avatar-row__wrap">
        {displaySeed ? (
          <UserAvatar
            seed={displaySeed}
            style={displayStyle}
            className="username-avatar-row__img"
            size={52}
            alt=""
          />
        ) : (
          <span className="username-avatar-row__placeholder" aria-hidden="true" />
        )}
        <AvatarRerollButton
          size="md"
          onClick={() => {
            tryRandomizeAvatar((seed, style) => {
              applyAvatarState(seed, style, { persist: true });
            });
          }}
          disabled={randomizeDisabled}
          waitSeconds={randomizeWaitSeconds}
        />
      </div>
    </div>
  );

  if (compact) {
    return (
      <>
        {name ? (
          <button
            type="button"
            className="username-pill"
            onClick={openProfileModal}
            aria-label={t('welcome.openProfileAria')}
            title={t('welcome.openProfile')}
          >
            <UserAvatar
              seed={displaySeed}
              style={displayStyle}
              className="username-pill__avatar"
              size={32}
              alt=""
            />
            <span className="username-pill__name">{name}</span>
          </button>
        ) : (
          <button
            type="button"
            className="username-pill username-pill--empty"
            onClick={openProfileModal}
            aria-label={t('welcome.openProfileAria')}
          >
            {t('welcome.setProfile')}
          </button>
        )}

        <UserProfileModal
          open={profileOpen}
          draftName={draftName}
          draftAvatarSeed={draftAvatarSeed}
          draftAvatarStyle={draftAvatarStyle}
          randomizeDisabled={randomizeDisabled}
          randomizeWaitSeconds={randomizeWaitSeconds}
          randomizeNickDisabled={randomizeNickDisabled}
          randomizeNickWaitSeconds={randomizeNickWaitSeconds}
          onDraftNameChange={setDraftName}
          onRandomizeAvatar={handleRandomizeDraftAvatar}
          onRandomizeNickname={handleRandomizeDraftNickname}
          onSave={handleProfileSave}
          onClear={clearInProfileModal ? handleClearSession : undefined}
          onClose={closeProfileModal}
        />
      </>
    );
  }

  return (
    <form onSubmit={handleWelcomeSubmit} className="username-form username-form--entry" autoComplete="off">
      {welcomeAvatarRow}
      <label className="profile-nick-field">
        <span className="profile-nick-field__label">{t('welcome.nickAria')}</span>
        <div className="profile-nick-field__row">
          <input
            type="text"
            name="vxh-nick"
            className="profile-nick-field__input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('welcome.nickPlaceholderShort')}
            required
            aria-label={t('welcome.nickAria')}
            autoComplete="nickname"
            maxLength={32}
          />
          <AvatarRerollButton
            size="sm"
            onClick={() => tryRandomizeNickname(setName)}
            disabled={randomizeNickDisabled}
            waitSeconds={randomizeNickWaitSeconds}
            ariaLabelKey="welcome.randomizeNickAria"
            waitLabelKey="welcome.randomizeNickWait"
          />
        </div>
      </label>
      <div className="username-form__actions">
        <button type="submit" className="btn btn--primary">{t('welcome.enter')}</button>
        {hasPriorSession ? (
          <button
            type="button"
            className="btn btn--ghost username-form__clear"
            onClick={handleClearSession}
            aria-label={t('welcome.clearSessionAria')}
          >
            {t('welcome.clearSession')}
          </button>
        ) : null}
      </div>
    </form>
  );
}
