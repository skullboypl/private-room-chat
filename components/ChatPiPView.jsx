'use client';

import { useEffect, useRef } from 'react';
import Message from '@/components/Message';
import MessageInput from '@/components/MessageInput';
import { useTranslation } from '@/context/LocaleContext';
import { resolveSenderProfile } from '@/lib/resolveSenderProfile';
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
  const messagesEndRef = useRef(null);
  const current = rooms.find((room) => room.roomName === activeRoom) ?? rooms[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [current?.messages, current?.roomName]);

  if (!current) return null;

  const { roomName, messages, displayName, quickEmoji, userProfiles = {} } = current;
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

      <div className="chat-pip__messages" role="log" aria-live="polite">
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
        <div ref={messagesEndRef} />
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
