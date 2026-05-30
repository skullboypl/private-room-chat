'use client';

import { useEffect, useRef, useState } from 'react';
import Message from '@/components/Message';
import MessageInput from '@/components/MessageInput';
import ChatShare from '@/components/ChatShare';
import ChannelOptionsMenu from '@/components/ChannelOptionsMenu';
import { useTranslation } from '@/context/LocaleContext';
import { PictureInPictureIcon } from '@/components/icons/PictureInPictureIcon';
import { RoomLockIcon } from '@/components/icons/RoomLockIcon';
import { isRoomOpenChannel, isRoomPasswordKnown } from '@/lib/roomAccess';
import './ChatWindow.css';
import './ChannelOptionsMenu.css';

export default function ChatWindow({
  roomName,
  roomPassword,
  messages,
  onSendMessage,
  onSendImage,
  onLeaveRoom,
  onMinimize,
  onToggleFullscreen,
  onTogglePiP,
  isPiPSupported = false,
  isPiPActive = false,
  forcedFullscreen = false,
  currentUsername = '',
  variant = 'full',
  assignedUsername = '',
  quickEmoji,
  isFullscreen = false,
  hideHeader = false,
  roomUserCount = null,
  activeRooms = [],
  channelRoomState = null,
  getSenderProfile,
  sendCooldownSeconds = 0,
}) {
  const { t } = useTranslation();
  const messagesEndRef = useRef(null);
  const titleBtnRef = useRef(null);
  const [channelMenuOpen, setChannelMenuOpen] = useState(false);
  const displayName = assignedUsername || currentUsername;
  const channelIsOpen = isRoomOpenChannel(
    channelRoomState
      ?? (isRoomPasswordKnown(roomPassword) ? { password: roomPassword } : null),
    activeRooms,
    roomName,
  );

  const showNickMeta = variant === 'full' && displayName && displayName !== currentUsername;
  const usersSubtitle = roomUserCount != null
    ? t('conversations.roomUsers', { count: String(roomUserCount) })
    : null;

  const lockIcon = (
    <RoomLockIcon
      open={channelIsOpen}
      className={`chat-header__lock chat-header__lock--lead${channelIsOpen ? ' chat-header__lock--open' : ''}`}
      title={channelIsOpen ? t('conversations.lockOpen') : t('conversations.lockClosed')}
    />
  );

  const menuChevron = (
    <svg
      className="chat-header__menu-chevron chat-header__menu-chevron--trail"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );

  const renderMenuTrigger = (className, { withStatus = false } = {}) => (
    <button
      type="button"
      ref={titleBtnRef}
      className={className}
      title={roomName}
      aria-label={t('channelMenu.aria', { room: roomName })}
      aria-haspopup="dialog"
      aria-expanded={channelMenuOpen}
      onClick={() => setChannelMenuOpen((v) => !v)}
    >
      {withStatus && <span className="chat-header__status" aria-hidden="true" />}
      {lockIcon}
      <span className="chat-header__info-body">
        <span className="chat-header__title-row">
          <span className="chat-header__title-text">{roomName}</span>
        </span>
        {usersSubtitle && (
          <span
            className="chat-header__subtitle"
            title={t('conversations.roomUsersAria', { count: String(roomUserCount) })}
          >
            {usersSubtitle}
          </span>
        )}
        {showNickMeta && (
          <span
            className="chat-header__meta"
            title={t('chat.yourNickInRoom', { nick: displayName })}
          >
            <span className="chat-header__nick">{t('chat.youNick', { nick: displayName })}</span>
          </span>
        )}
      </span>
      {menuChevron}
    </button>
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isDock = variant === 'dock';
  const isPanel = variant === 'panel';
  const useCompactInput = isDock || (isPanel && !isFullscreen);
  const showDockToolbar = hideHeader && isDock;
  const showFullHeader = !hideHeader;

  return (
    <div
      className={[
        'chat-window',
        isDock ? 'chat-window--dock' : '',
        isPanel ? 'chat-window--panel' : '',
        isFullscreen ? 'chat-window--fullscreen' : '',
        hideHeader && isDock ? 'chat-window--dock-headless' : '',
      ].filter(Boolean).join(' ')}
    >
      {showFullHeader && (
      <header className="chat-header">
        {renderMenuTrigger('chat-header-menu-btn', { withStatus: true })}
        <div className="chat-header__actions">
          <ChatShare roomName={roomName} roomPassword={roomPassword} />
          {isPanel && isPiPSupported && onTogglePiP && (
            <button
              type="button"
              className={`chat-header__icon-btn${isPiPActive ? ' chat-header__icon-btn--active' : ''}`}
              onClick={onTogglePiP}
              aria-label={isPiPActive ? t('chat.pipClose') : t('chat.pipLabel')}
              title={isPiPActive ? t('chat.pipCloseShort') : t('chat.pipOpen')}
            >
              <PictureInPictureIcon />
            </button>
          )}
          {isPanel && onToggleFullscreen && !forcedFullscreen && (
            <button
              type="button"
              className="chat-header__icon-btn"
              onClick={onToggleFullscreen}
              aria-label={isFullscreen ? t('chat.fullscreenExit') : t('chat.fullscreenEnter')}
              title={isFullscreen ? t('chat.fullscreenExit') : t('chat.fullscreenEnter')}
            >
              {isFullscreen ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M9 3H5a2 2 0 0 0-2 2v4M15 3h4a2 2 0 0 1 2 2v4M9 21H5a2 2 0 0 1-2-2v-4M15 21h4a2 2 0 0 0 2-2v-4" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
                </svg>
              )}
            </button>
          )}
          {isPanel && onMinimize && (
            <button type="button" className="chat-header__icon-btn" onClick={onMinimize} aria-label={t('chat.minimize')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M5 12h14" strokeLinecap="round" />
              </svg>
            </button>
          )}
          <button type="button" className="chat-header__icon-btn chat-header__icon-btn--close" onClick={onLeaveRoom} aria-label={t('chat.leave')}>×</button>
        </div>
      </header>
      )}

      {showDockToolbar && (
        <header className="chat-dock-toolbar">
          {renderMenuTrigger('chat-header-menu-btn chat-dock-toolbar-menu-btn')}
          <div className="chat-dock-toolbar__actions">
            <ChatShare roomName={roomName} roomPassword={roomPassword} />
            {isPiPSupported && onTogglePiP && (
              <button
                type="button"
                className={`chat-header__icon-btn${isPiPActive ? ' chat-header__icon-btn--active' : ''}`}
                onClick={onTogglePiP}
                aria-label={t('chat.pipLabel')}
                title={t('chat.pipLabel')}
              >
                <PictureInPictureIcon />
              </button>
            )}
            {onToggleFullscreen && (
              <button
                type="button"
                className="chat-header__icon-btn"
                onClick={onToggleFullscreen}
                aria-label={t('chat.fullscreenEnter')}
                title={t('chat.fullscreenEnter')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
                </svg>
              </button>
            )}
            {onMinimize && (
              <button type="button" className="chat-header__icon-btn" onClick={onMinimize} aria-label={t('chat.minimize')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M5 12h14" strokeLinecap="round" />
              </svg>
            </button>
            )}
            <button type="button" className="chat-header__icon-btn chat-header__icon-btn--close" onClick={onLeaveRoom} aria-label={t('chat.leave')}>×</button>
          </div>
        </header>
      )}

      <div className="chat-window__notice">
        {t('chat.notice')}
      </div>

      <div className="chat-messages" role="log" aria-live="polite">
        {messages.length === 0 && (
          <p className="chat-messages__empty">{t('chat.empty')}</p>
        )}
        {messages.map((msg, index) => {
          const profile = getSenderProfile?.(msg.sender) || {};
          return (
            <Message
              key={[
                msg.messageId || msg.imageId || `msg-${index}-${msg.timestamp}`,
                msg.sender,
                profile.avatarSeed || '',
                profile.avatarStyle || '',
              ].join('-')}
              sender={msg.sender}
              content={msg.content}
              timestamp={msg.timestamp}
              type={msg.type}
              imageId={msg.imageId}
              roomName={roomName}
              isCurrentUser={msg.sender === displayName}
              isSystem={msg.sender === 'System'}
              avatarSeed={profile.avatarSeed}
              avatarStyle={profile.avatarStyle}
            />
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <MessageInput
        roomName={roomName}
        quickEmoji={quickEmoji}
        onSendMessage={onSendMessage}
        onSendImage={onSendImage}
        compact={useCompactInput}
        sendCooldownSeconds={sendCooldownSeconds}
      />

      <ChannelOptionsMenu
        roomName={roomName}
        open={channelMenuOpen}
        onClose={() => setChannelMenuOpen(false)}
        anchorRef={titleBtnRef}
      />
    </div>
  );
}
