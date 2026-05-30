'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import data from '@emoji-mart/data';
import { getRoomQuickEmoji, DEFAULT_QUICK_EMOJI } from '@/lib/roomEmoji';
import { useTranslation } from '@/context/LocaleContext';
import { translateRoomError } from '@/lib/i18n/systemMessages';
import './MessageInput.css';

const EmojiPicker = dynamic(
  () => import('@emoji-mart/react').then((mod) => mod.default),
  { ssr: false, loading: () => null },
);

const MAX_TEXTAREA_HEIGHT = 132;
const PICKER_GAP = 8;
const MIN_PICKER_HEIGHT = 140;
const DEFAULT_PICKER_MAX = { full: 360, compact: 260 };

function measureEmojiPickerLayout(formEl, compact) {
  if (!formEl) {
    return { below: false, maxHeight: compact ? DEFAULT_PICKER_MAX.compact : DEFAULT_PICKER_MAX.full };
  }

  const boundsEl = formEl.closest('.chat-window, .chat-pip');
  const bounds = boundsEl?.getBoundingClientRect()
    ?? { top: 0, bottom: window.innerHeight };
  const formRect = formEl.getBoundingClientRect();
  const defaultMax = compact ? DEFAULT_PICKER_MAX.compact : DEFAULT_PICKER_MAX.full;

  const spaceAbove = formRect.top - bounds.top - PICKER_GAP;
  const spaceBelow = bounds.bottom - formRect.bottom - PICKER_GAP;

  let below = false;
  let maxHeight = defaultMax;

  if (spaceAbove >= MIN_PICKER_HEIGHT) {
    below = false;
    maxHeight = Math.min(defaultMax, spaceAbove);
  } else if (spaceBelow >= MIN_PICKER_HEIGHT && spaceBelow > spaceAbove) {
    below = true;
    maxHeight = Math.min(defaultMax, spaceBelow);
  } else {
    below = spaceBelow > spaceAbove;
    maxHeight = Math.max(
      MIN_PICKER_HEIGHT,
      Math.min(defaultMax, below ? spaceBelow : spaceAbove),
    );
  }

  return { below, maxHeight: Math.floor(maxHeight) };
}

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
  const [emojiPickerBelow, setEmojiPickerBelow] = useState(false);
  const [emojiPickerMaxHeight, setEmojiPickerMaxHeight] = useState(
    compact ? DEFAULT_PICKER_MAX.compact : DEFAULT_PICKER_MAX.full,
  );
  const formRef = useRef(null);
  const emojiPickerRef = useRef(null);
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)
          && !event.target.closest('.emoji-toggle-button')) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!showEmojiPicker) return undefined;

    const updateLayout = () => {
      const layout = measureEmojiPickerLayout(formRef.current, compact);
      setEmojiPickerBelow(layout.below);
      setEmojiPickerMaxHeight(layout.maxHeight);
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    window.visualViewport?.addEventListener('resize', updateLayout);

    const form = formRef.current;
    const boundsEl = form?.closest('.chat-window, .chat-pip');
    const resizeObserver = typeof ResizeObserver !== 'undefined' && boundsEl
      ? new ResizeObserver(updateLayout)
      : null;
    resizeObserver?.observe(boundsEl);

    return () => {
      window.removeEventListener('resize', updateLayout);
      window.visualViewport?.removeEventListener('resize', updateLayout);
      resizeObserver?.disconnect();
    };
  }, [showEmojiPicker, compact]);

  return (
    <form
      ref={formRef}
      className={`message-input-form${compact ? ' message-input-form--compact' : ''}`}
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

        <button type="button" onClick={() => setShowEmojiPicker((p) => !p)} className="message-input-addon emoji-toggle-button" aria-label={t('chat.pickEmoji')}>
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

      {showEmojiPicker && (
        <div
          className={`emoji-picker-container${emojiPickerBelow ? ' emoji-picker-container--below' : ''}`}
          ref={emojiPickerRef}
          style={{
            '--emoji-picker-height': `${emojiPickerMaxHeight}px`,
            maxHeight: `${emojiPickerMaxHeight}px`,
          }}
        >
          <EmojiPicker
            data={data}
            onEmojiSelect={(emoji) => setMessage((prev) => prev + emoji.native)}
            previewPosition="none"
            theme="dark"
            locale={lang === 'en' ? 'en' : 'pl'}
            dynamicWidth={compact}
            emojiButtonSize={compact ? 28 : 32}
            emojiSize={compact ? 20 : 24}
            maxFrequentRows={1}
            perLine={compact ? undefined : 9}
          />
        </div>
      )}
    </form>
  );
}
