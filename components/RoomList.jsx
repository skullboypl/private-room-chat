'use client';

import RoomAvatar from '@/components/RoomAvatar';
import { useTranslation } from '@/context/LocaleContext';
import './RoomList.css';

export default function RoomList({ rooms, onSelectRoom }) {
  const { t } = useTranslation();

  return (
    <section className="conv-panel" aria-labelledby="rooms-heading">
      <div className="conv-panel__header">
        <h2 id="rooms-heading" className="conv-panel__title">{t('roomsList.messages')}</h2>
        {rooms?.length > 0 && (
          <span className="conv-panel__count">{rooms.length}</span>
        )}
      </div>

      {!rooms?.length ? (
        <div className="conv-empty">
          <div className="conv-empty__icon" aria-hidden="true">💬</div>
          <p className="conv-empty__title">{t('rooms.noActive')}</p>
          <p className="conv-empty__text">{t('rooms.noActiveHint')}</p>
        </div>
      ) : (
        <ul className="conv-list">
          {rooms.map((roomName) => (
            <li key={roomName}>
              <button type="button" className="conv-item" onClick={() => onSelectRoom(roomName)}>
                <RoomAvatar roomName={roomName} className="conv-item__avatar" />
                <span className="conv-item__body">
                  <span className="conv-item__row">
                    <span className="conv-item__name">{roomName}</span>
                    <span className="conv-item__badge">{t('roomsList.active')}</span>
                  </span>
                  <span className="conv-item__preview">{t('roomsList.clickToJoinRoom')}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
