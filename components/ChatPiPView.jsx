'use client';

import { useCallback } from 'react';
import Message from '@/components/Message';
import MessageInput from '@/components/MessageInput';
import { useTranslation } from '@/context/LocaleContext';
import { resolveSenderProfile } from '@/lib/resolveSenderProfile';
import { useChatMessageScroll } from '@/hooks/useChatMessageScroll';
import './ChatPiPView.css';

export default function ChatPiPView({
  rooms,
  activeRoom,
  onSelectRoom,
  onCloseRoom,
  onSendMessage,
  onSendImage,
  sendCooldownSeconds = 0,
}) {
  const { t } = useTranslation();
  const current = rooms.find((room) => room.roomName === activeRoom) ?? rooms[0];
  const messages = current?.messages ?? [];
  const displayName = current?.displayName ?? '';
  const roomName = current?.roomName ?? '';
  const quickEmoji = current?.quickEmoji;
  const userProfiles = current?.userProfiles ?? {};

  const {
    containerRef: messagesContainerRef,
    contentRef: messagesContentRef,
    showJumpToLatest,
    scrollToBottom,
    handleScroll: handleMessagesScroll,
  } = useChatMessageScroll(messages, { currentUserLabel: displayName, resetKey: roomName });

  const handleJumpToLatest = useCallback(() => {
    scrollToBottom('smooth');
  }, [scrollToBottom]);

  if (!current) return null;

  const showTabs = rooms.length > 1;

  const getSenderProfile = (sender) => resolveSenderProfile(
    { assignedUsername: displayName, userProfiles },
    sender,
    displayName,
  );

  return (
    <div className="chat-pip">
      {showTabs && (
        <div className="chat-pip__tabs" role="tablist" aria-label={t('pip.tabsAria')}>
          {rooms.map((room) => (
            <button
              key={room.roomName}
              type="button"
              role="tab"
              aria-selected={room.roomName === activeRoom}
              className={`chat-pip__tab${room.roomName === activeRoom ? ' chat-pip__tab--active' : ''}`}
              onClick={() => onSelectRoom(room.roomName)}
            >
              <span className="chat-pip__tab-name">{room.roomName}</span>
              <span
                role="button"
                tabIndex={0}
                className="chat-pip__tab-close"
                aria-label={t('pip.closeRoom', { room: room.roomName })}
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseRoom(room.roomName);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.stopPropagation();
                    onCloseRoom(room.roomName);
                  }
                }}
              >
                ×
              </span>
            </button>
          ))}
        </div>
      )}

      <header className="chat-pip__header">
        <div className="chat-pip__title-wrap">
          <span className="chat-pip__status" aria-hidden="true" />
          <div>
            <h2 className="chat-pip__title">{roomName}</h2>
            <p className="chat-pip__meta">{t('pip.meta')}</p>
          </div>
        </div>
        {!showTabs && (
          <button
            type="button"
            className="chat-pip__close"
            onClick={() => onCloseRoom(roomName)}
            aria-label={t('chat.pipCloseShort')}
          >
            ×
          </button>
        )}
      </header>

      <div className="chat-pip__messages-wrap">
        <div
          className="chat-pip__messages"
          ref={messagesContainerRef}
          onScroll={handleMessagesScroll}
          role="log"
          aria-live="polite"
        >
          <div ref={messagesContentRef} className="chat-pip__messages-list">
            {messages.length === 0 && (
              <p className="chat-pip__empty">{t('chat.emptyPip')}</p>
            )}
            {messages.map((msg, index) => {
              const profile = getSenderProfile(msg.sender);
              return (
                <Message
                  key={[
                    msg.messageId || msg.imageId || `pip-${roomName}-${index}-${msg.timestamp}`,
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
          </div>
        </div>
        {showJumpToLatest && (
          <button
            type="button"
            className="chat-jump-latest chat-jump-latest--pip"
            onClick={handleJumpToLatest}
            aria-label={t('chat.jumpToLatestAria')}
            title={t('chat.jumpToLatest')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden="true">
              <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      <MessageInput
        roomName={roomName}
        quickEmoji={quickEmoji}
        onSendMessage={(text) => onSendMessage(roomName, text)}
        onSendImage={(file) => onSendImage(roomName, file)}
        compact
        sendCooldownSeconds={sendCooldownSeconds}
      />
    </div>
  );
}
