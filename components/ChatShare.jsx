'use client';

import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { buildInviteLink, copyToClipboard } from '@/lib/invite';
import { isOpenRoomPassword } from '@/lib/roomAccess';
import { useTranslation } from '@/context/LocaleContext';
import './ChatShare.css';

export default function ChatShare({ roomName, roomPassword }) {
  const { t } = useTranslation();
  const [toast, setToast] = useState(null);
  const btnRef = useRef(null);
  const timerRef = useRef(null);

  const showToast = useCallback((msg) => {
    const btn = btnRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    setToast({
      msg,
      top: rect.bottom + 6,
      left: rect.right,
    });

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 2000);
  }, []);

  return (
    <div className="chat-share">
      <button
        ref={btnRef}
        type="button"
        className="chat-share__btn"
        onClick={async () => {
          if (roomPassword == null || roomPassword === undefined) return;
          await copyToClipboard(buildInviteLink(roomName, roomPassword));
          showToast(t('chat.shareCopied'));
        }}
        title={isOpenRoomPassword(roomPassword) ? t('chat.shareLinkOpen') : t('chat.shareLink')}
        aria-label={isOpenRoomPassword(roomPassword) ? t('chat.shareLinkOpen') : t('chat.shareLink')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        <span className="chat-share__label">{t('chat.link')}</span>
      </button>
      {toast && typeof document !== 'undefined' && createPortal(
        <span
          className="chat-share__toast chat-share__toast--fixed"
          style={{ top: toast.top, left: toast.left }}
          role="status"
        >
          {toast.msg}
        </span>,
        document.body,
      )}
    </div>
  );
}
