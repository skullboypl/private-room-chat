'use client';

import { useTranslation } from '@/context/LocaleContext';
import './ConversationList.css';

function sortConversations(items) {
  return [...items].sort((a, b) => {
    const timeA = a.lastTimestamp || '';
    const timeB = b.lastTimestamp || '';
    return timeB.localeCompare(timeA);
  });
}

export default function ConversationList({
  openRooms,
  discoverRooms,
  activeRoom,
  onSelectOpenRoom,
  onJoinDiscoverRoom,
}) {
  const { t } = useTranslation();
  const conversations = sortConversations(
    Object.entries(openRooms).map(([roomName, data]) => ({ roomName, ...data })),
  );
  const discover = discoverRooms.filter((name) => !openRooms[name]);

  return (
    <div className="conv-stack">
        <section className="conv-section conv-section--grow" aria-labelledby="my-chats-heading">
        <div className="conv-section__header">
          <h2 id="my-chats-heading" className="conv-section__title">{t('conversations.myChats')}</h2>
          {conversations.length > 0 && (
            <span className="conv-section__count">{conversations.length}</span>
          )}
        </div>

        {conversations.length === 0 ? (
          <p className="conv-section__empty">{t('conversations.joinHint')}</p>
        ) : (
          <ul className="conv-bubbles">
            {conversations.map((room) => (
              <li key={room.roomName}>
                <button
                  type="button"
                  className={`conv-bubble ${activeRoom === room.roomName ? 'conv-bubble--active' : ''} ${room.unread ? 'conv-bubble--unread' : ''}`}
                  onClick={() => onSelectOpenRoom(room.roomName)}
                >
                  <span className="conv-bubble__avatar" aria-hidden="true">
                    {room.roomName.charAt(0).toUpperCase()}
                  </span>
                  <span className="conv-bubble__content">
                    <span className="conv-bubble__top">
                      <span className="conv-bubble__name">{room.roomName}</span>
                      {room.lastTimestamp && (
                        <time className="conv-bubble__time">{room.lastTimestamp}</time>
                      )}
                    </span>
                    <span className="conv-bubble__preview-wrap">
                      <span className="conv-bubble__preview">
                        {room.lastPreview || t('rooms.noPreview')}
                      </span>
                    </span>
                  </span>
                  {room.unread > 0 && (
                    <span className="conv-bubble__badge" aria-label={t('conversations.unread', { count: room.unread })}>
                      {room.unread > 9 ? '9+' : room.unread}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {discover.length > 0 && (
        <section className="conv-section conv-section--discover" aria-labelledby="discover-heading">
          <div className="conv-section__header">
            <h2 id="discover-heading" className="conv-section__title">{t('conversations.activeRooms')}</h2>
            <span className="conv-section__count">{discover.length}</span>
          </div>
          <ul className="conv-bubbles conv-bubbles--discover">
            {discover.map((roomName) => (
              <li key={roomName}>
                <button
                  type="button"
                  className="conv-bubble conv-bubble--discover"
                  onClick={() => onJoinDiscoverRoom(roomName)}
                >
                  <span className="conv-bubble__avatar conv-bubble__avatar--discover" aria-hidden="true">
                    {roomName.charAt(0).toUpperCase()}
                  </span>
                  <span className="conv-bubble__content">
                    <span className="conv-bubble__top">
                      <span className="conv-bubble__name">{roomName}</span>
                      <span className="conv-bubble__live">online</span>
                    </span>
                    <span className="conv-bubble__preview-wrap">
                      <span className="conv-bubble__preview">{t('conversations.clickToJoin')}</span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
