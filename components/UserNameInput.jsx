'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/context/LocaleContext';
import './UserNameInput.css';

export function readStoredUsername() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('username')?.trim() || '';
}

export default function UserNameInput({ onSetUsername, compact = false, initialName = '' }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [isEditing, setIsEditing] = useState(true);

  useEffect(() => {
    const stored = initialName || readStoredUsername();
    if (stored) {
      setName(stored);
      setIsEditing(false);
    }
  }, [initialName]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    localStorage.setItem('username', trimmed);
    setName(trimmed);
    setIsEditing(false);
    onSetUsername(trimmed);
  };

  if (compact && !isEditing && name) {
    return (
      <div className="username-pill">
        <span className="username-pill__avatar" aria-hidden="true">{name.charAt(0).toUpperCase()}</span>
        <span className="username-pill__name">{name}</span>
        <button type="button" className="username-pill__edit" onClick={() => setIsEditing(true)}>{t('welcome.changeNick')}</button>
      </div>
    );
  }

  if (compact && isEditing) {
    return (
      <form onSubmit={handleSubmit} className="username-form username-form--compact">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('welcome.nickPlaceholderShort')}
          required
          aria-label={t('welcome.nickAria')}
          maxLength={32}
          autoFocus
        />
        <button type="submit" className="btn btn--primary btn--sm">OK</button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="username-form username-form--entry">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('welcome.nickPlaceholder')}
        required
        aria-label={t('welcome.nickAria')}
        autoComplete="username"
        maxLength={32}
      />
      <button type="submit" className="btn btn--primary">{t('welcome.enter')}</button>
    </form>
  );
}
