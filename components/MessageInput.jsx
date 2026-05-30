'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

const EmojiPickerPopover = dynamic(
  () => import('@/components/EmojiPickerPopover'),
  { ssr: false },
);
import { getRoomQuickEmoji, DEFAULT_QUICK_EMOJI } from '@/lib/roomEmoji';
import { useTranslation } from '@/context/LocaleContext';
import { translateRoomError } from '@/lib/i18n/systemMessages';
import './MessageInput.css';

const MAX_TEXTAREA_HEIGHT = 132;

export default function MessageInput({
  onSendMessage,
  onSendImage,
  roomName = '',
  quickEmoji: quickEmojiProp,
  compact = false,
  sendCooldownSeconds = 0,
}) {
  const { t, lang } = useTranslation();
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [quickEmoji, setQuickEmoji] = useState(DEFAULT_QUICK_EMOJI);
  const formRef = useRef(null);
  const emojiToggleRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const hasText = Boolean(message.trim());

  useEffect(() => {
    setQuickEmoji(quickEmojiProp || getRoomQuickEmoji(roomName));
  }, [roomName, quickEmojiProp]);

  useEffect(() => {
    const onEmojiChanged = (e) => {
      if (e.detail?.roomName === roomName) {
        setQuickEmoji(e.detail.emoji || DEFAULT_QUICK_EMOJI);
      }
    };
    window.addEventListener('roomQuickEmojiChanged', onEmojiChanged);
    return () => window.removeEventListener('roomQuickEmojiChanged', onEmojiChanged);
  }, [roomName]);

  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [message, adjustTextareaHeight]);

  const clearMessage = useCallback(() => {
    setMessage('');
    setShowEmojiPicker(false);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) el.style.height = 'auto';
    });
  }, []);

  const sendBlocked = sendCooldownSeconds > 0;

  const sendMessage = useCallback(() => {
    if (sendBlocked) return;
    const trimmed = message.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    clearMessage();
  }, [message, onSendMessage, clearMessage, sendBlocked]);

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleQuickEmoji = useCallback(() => {
    if (sendBlocked) return;
    onSendMessage(quickEmoji);
    setShowEmojiPicker(false);
  }, [onSendMessage, quickEmoji, sendBlocked]);

  const sendImageFile = useCallback(async (file) => {
    if (sendBlocked || !file || !onSendImage) return;
    setUploadError('');
    try {
      await onSendImage(file);
    } catch (err) {
      setUploadError(translateRoomError(err.message, t) || t('errors.imageUpload'));
      setTimeout(() => setUploadError(''), 3000);
    }
  }, [onSendImage, t, sendBlocked]);

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    await sendImageFile(file);
  };

  const handlePaste = async (e) => {
    if (!onSendImage) return;

    const items = e.clipboardData?.items;
    if (!items?.length) return;

    const imageItem = [...items].find((item) => item.type.startsWith('image/'));
    if (!imageItem) return;

    e.preventDefault();
    await sendImageFile(imageItem.getAsFile());
  };

  const handleEmojiSelect = useCallback((unicode) => {
    setMessage((prev) => prev + unicode);
  }, []);

  return (
    <form
      ref={formRef}
      className={`message-input-form${compact ? ' message-input-form--compact' : ''}${showEmojiPicker ? ' message-input-form--emoji-open' : ''}`}
      onSubmit={handleSubmit}
    >
      <input ref={fileInputRef} type="file" accept="image/*" className="message-file-input" onChange={handleImageSelect} tabIndex={-1} aria-hidden="true" />

      <div className="message-input-row">
        <button type="button" className="message-input-addon" onClick={() => fileInputRef.current?.click()} aria-label={t('chat.sendImage')} title={t('chat.sendImage')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </button>

        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={t('chat.messagePlaceholder')}
          aria-label={t('chat.messageAria')}
          className="message-input-field"
          rows={1}
        />

        <button
          ref={emojiToggleRef}
          type="button"
          onClick={() => setShowEmojiPicker((p) => !p)}
          className="message-input-addon emoji-toggle-button"
          aria-label={t('chat.pickEmoji')}
          aria-expanded={showEmojiPicker}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" strokeLinecap="round" />
            <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
            <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
          </svg>
        </button>

        {hasText ? (
          <button
            type="submit"
            className="message-input-action message-input-action--send"
            disabled={sendBlocked}
            aria-label={sendBlocked ? t('errors.messageRateLimitWait', { seconds: sendCooldownSeconds }) : t('chat.sendMessage')}
            title={sendBlocked ? t('errors.messageRateLimitWait', { seconds: sendCooldownSeconds }) : t('chat.sendMessage')}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            className="message-input-action message-input-action--like"
            onClick={handleQuickEmoji}
            disabled={sendBlocked}
            aria-label={sendBlocked ? t('errors.messageRateLimitWait', { seconds: sendCooldownSeconds }) : t('chat.sendEmoji', { emoji: quickEmoji })}
            title={sendBlocked ? t('errors.messageRateLimitWait', { seconds: sendCooldownSeconds }) : t('chat.sendEmoji', { emoji: quickEmoji })}
          >
            <span className="message-input-action__emoji">{quickEmoji}</span>
          </button>
        )}
      </div>

      {uploadError && <span className="message-upload-error" role="alert">{uploadError}</span>}

      <EmojiPickerPopover
        open={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onEmojiSelect={handleEmojiSelect}
        anchorRef={emojiToggleRef}
        compact={compact}
        lang={lang}
        ariaLabel={t('chat.pickEmoji')}
      />
    </form>
  );
}
