'use client';

import { useEffect, useState } from 'react';
import { formatCountdownMs } from '@/lib/formatCountdown';
/** Domyślna długość paska (gdy brak TTL w API — tylko UI zapasowe). */
const COUNTDOWN_RING_MS = 15 * 60 * 1000;
import { useTranslation } from '@/context/LocaleContext';
import './EmptyRoomCountdown.css';

export default function EmptyRoomCountdown({ deletesAt, compact = false }) {
  const { t } = useTranslation();
  const [remainingMs, setRemainingMs] = useState(() => (
    deletesAt ? Math.max(0, deletesAt - Date.now()) : 0
  ));

  useEffect(() => {
    if (!deletesAt) return undefined;
    const tick = () => setRemainingMs(Math.max(0, deletesAt - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deletesAt]);

  if (!deletesAt || remainingMs <= 0) return null;

  const progress = Math.min(1, Math.max(0, remainingMs / COUNTDOWN_RING_MS));
  const timeLabel = formatCountdownMs(remainingMs);

  return (
    <span
      className={[
        'empty-room-countdown',
        compact ? 'empty-room-countdown--compact' : '',
      ].filter(Boolean).join(' ')}
      role="status"
      aria-live="polite"
      title={t('conversations.roomDeletingTitle', { time: timeLabel })}
    >
      <span className="empty-room-countdown__ring" aria-hidden="true">
        <svg className="empty-room-countdown__svg" viewBox="0 0 36 36">
          <circle className="empty-room-countdown__track" cx="18" cy="18" r="15.5" />
          <circle
            className="empty-room-countdown__progress"
            cx="18"
            cy="18"
            r="15.5"
            style={{ strokeDashoffset: `${(1 - progress) * 97.4}px` }}
          />
        </svg>
      </span>
      <span className="empty-room-countdown__text">
        {compact
          ? timeLabel
          : t('conversations.roomDeletingIn', { time: timeLabel })}
      </span>
    </span>
  );
}
