'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getLocalImagesForRoom, getLocalImage } from '@/lib/localMessageStore';
import { getRoomPassword } from '@/lib/roomSession';
import { applyRoomQuickEmoji, getRoomQuickEmoji, DEFAULT_QUICK_EMOJI } from '@/lib/roomEmoji';
import { socketService } from '@/lib/socket/client';
import { useTranslation } from '@/context/LocaleContext';
import './ChannelOptionsMenu.css';

const QUICK_EMOJI_PRESETS = ['👍', '❤️', '😂', '🔥', '👏', '🎉', '😮', '😢'];

export default function ChannelOptionsMenu({
  roomName,
  open,
  onClose,
  anchorRef,
}) {
  const { t } = useTranslation();
  const menuRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [media, setMedia] = useState([]);
  const [quickEmoji, setQuickEmoji] = useState(DEFAULT_QUICK_EMOJI);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  const password = getRoomPassword(roomName) || '';

  const updatePosition = useCallback(() => {
    const anchor = anchorRef?.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const mobile = window.innerWidth <= 640;
    const menuWidth = mobile
      ? Math.min(window.innerWidth - 24, 420)
      : Math.min(280, window.innerWidth - 16);
    const left = mobile
      ? (window.innerWidth - menuWidth) / 2
      : Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8));
    const preferredTop = rect.bottom + (mobile ? 10 : 6);
    const maxTop = window.innerHeight - 120;
    setPosition({
      top: Math.max(8, Math.min(preferredTop, maxTop)),
      left,
    });
  }, [anchorRef]);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    setQuickEmoji(getRoomQuickEmoji(roomName));
    setMedia(getLocalImagesForRoom(roomName));
    setActiveTab('info');
    setCopied(false);

    setUsersLoading(true);
    const onUsers = ({ roomName: rn, users: list }) => {
      if (rn !== roomName) return;
      setUsers(Array.isArray(list) ? list : []);
      setUsersLoading(false);
    };
    socketService.on('roomUsersList', onUsers);
    socketService.emit('getRoomUsers', roomName);

    const onResize = () => updatePosition();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);

    return () => {
      socketService.off('roomUsersList', onUsers);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open, roomName, updatePosition]);

  useEffect(() => {
    const onEmojiChanged = (e) => {
      if (e.detail?.roomName === roomName) {
        setQuickEmoji(e.detail.emoji || DEFAULT_QUICK_EMOJI);
      }
    };
    window.addEventListener('roomQuickEmojiChanged', onEmojiChanged);
    return () => window.removeEventListener('roomQuickEmojiChanged', onEmojiChanged);
  }, [roomName]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e) => {
      if (menuRef.current?.contains(e.target)) return;
      if (anchorRef?.current?.contains(e.target)) return;
      onClose();
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose, anchorRef]);

  const copyPassword = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const pickQuickEmoji = (emoji) => {
    setQuickEmoji(emoji);
    socketService.emit('setRoomQuickEmoji', { roomName, emoji });
  };

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={menuRef}
      className="channel-options-menu"
      style={{ top: position.top, left: position.left }}
      role="dialog"
      aria-label={t('channelMenu.aria', { room: roomName })}
    >
      <div className="channel-options-header">
        <strong>{roomName}</strong>
        <button type="button" className="channel-options-close" onClick={onClose} aria-label={t('chat.close')}>
          ×
        </button>
      </div>

      <div className="channel-options-tabs">
        <button
          type="button"
          className={activeTab === 'info' ? 'active' : ''}
          onClick={() => setActiveTab('info')}
        >
          {t('channelMenu.tabInfo')}
        </button>
        <button
          type="button"
          className={activeTab === 'media' ? 'active' : ''}
          onClick={() => setActiveTab('media')}
        >
          {t('channelMenu.tabMedia')}
        </button>
        <button
          type="button"
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          {t('channelMenu.tabUsers')}
        </button>
        <button
          type="button"
          className={activeTab === 'emoji' ? 'active' : ''}
          onClick={() => setActiveTab('emoji')}
        >
          {t('channelMenu.tabEmoji')}
        </button>
      </div>

      <div className="channel-options-body">
        {activeTab === 'info' && (
          <div className="channel-options-section">
            <span className="channel-options-label">{t('channelMenu.password')}</span>
            {password ? (
              <div className="channel-options-password-row">
                <code>{password}</code>
                <button type="button" onClick={copyPassword}>
                  {copied ? t('channelMenu.copied') : t('channelMenu.copyPassword')}
                </button>
              </div>
            ) : (
              <p className="channel-options-muted">{t('channelMenu.noPassword')}</p>
            )}
          </div>
        )}

        {activeTab === 'media' && (
          <div className="channel-options-section">
            {media.length === 0 ? (
              <p className="channel-options-muted">{t('channelMenu.noMedia')}</p>
            ) : (
              <div className="channel-options-media-grid">
                {media.map((item) => {
                  const url = getLocalImage(roomName, item.imageId);
                  if (!url) return null;
                  return (
                    <a
                      key={item.imageId}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="channel-options-media-thumb"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" loading="lazy" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="channel-options-section">
            {usersLoading ? (
              <p className="channel-options-muted">{t('channelMenu.loading')}</p>
            ) : users.length === 0 ? (
              <p className="channel-options-muted">{t('channelMenu.noOnline')}</p>
            ) : (
              <ul className="channel-options-users">
                {users.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'emoji' && (
          <div className="channel-options-section">
            <p className="channel-options-muted">{t('channelMenu.quickEmojiHint')}</p>
            <div className="channel-options-emoji-current">{quickEmoji}</div>
            <div className="channel-options-emoji-grid">
              {QUICK_EMOJI_PRESETS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={emoji === quickEmoji ? 'active' : ''}
                  onClick={() => pickQuickEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
