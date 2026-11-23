'use client';

import { useEffect, useMemo, useState } from 'react';
import { RoomLockIcon } from '@/components/icons/RoomLockIcon';
import {
  DISCOVER_SORT_NAME,
  DISCOVER_SORT_OPTIONS,
  sortDiscoverRooms,
} from '@/lib/discoverRoomSort';
import RoomAvatar from '@/components/RoomAvatar';
import {
  getRoomDeletesAt,
  isRoomOpenChannel,
  normalizeActiveRoomsList,
  resolveRoomUserCount,
} from '@/lib/roomAccess';
import EmptyRoomCountdown from '@/components/EmptyRoomCountdown';
import { useTranslation } from '@/context/LocaleContext';
import './ConversationList.css';

const DISCOVER_PAGE_SIZE = 10;

const SORT_I18N_KEY = {
  name: 'conversations.sortName',
  nameDesc: 'conversations.sortNameDesc',
  users: 'conversations.sortUsers',
  usersAsc: 'conversations.sortUsersAsc',
};

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
  const [discoverQuery, setDiscoverQuery] = useState('');
  const [discoverSort, setDiscoverSort] = useState(DISCOVER_SORT_NAME);
  const [discoverOpenOnly, setDiscoverOpenOnly] = useState(false);
  const [discoverPage, setDiscoverPage] = useState(0);

  const conversations = sortConversations(
    Object.entries(openRooms).map(([roomName, data]) => ({ roomName, ...data })),
  );

  const discoverBase = useMemo(
    () => normalizeActiveRoomsList(discoverRooms).filter((room) => !openRooms[room.roomName]),
    [discoverRooms, openRooms],
  );

  const discoverAll = useMemo(
    () => sortDiscoverRooms(discoverBase, discoverSort),
    [discoverBase, discoverSort],
  );

  const discoverFiltered = useMemo(() => {
    let list = discoverAll;
    if (discoverOpenOnly) {
      list = list.filter((room) => room.isOpen);
    }
    const q = discoverQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((room) => room.roomName.toLowerCase().includes(q));
    }
    return list;
  }, [discoverAll, discoverQuery, discoverOpenOnly]);

  const totalDiscoverPages = Math.max(1, Math.ceil(discoverFiltered.length / DISCOVER_PAGE_SIZE));
  const safeDiscoverPage = Math.min(discoverPage, totalDiscoverPages - 1);

  const discoverPageItems = useMemo(() => {
    const start = safeDiscoverPage * DISCOVER_PAGE_SIZE;
    return discoverFiltered.slice(start, start + DISCOVER_PAGE_SIZE);
  }, [discoverFiltered, safeDiscoverPage]);

  useEffect(() => {
    setDiscoverPage(0);
  }, [discoverQuery, discoverSort, discoverOpenOnly]);

  useEffect(() => {
    if (discoverPage > totalDiscoverPages - 1) {
      setDiscoverPage(Math.max(0, totalDiscoverPages - 1));
    }
  }, [discoverPage, totalDiscoverPages]);

  const showDiscoverSection = discoverAll.length > 0;
  const showDiscoverPagination = discoverFiltered.length > DISCOVER_PAGE_SIZE;

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
                  <RoomLockIcon
                    open={isRoomOpenChannel(room, discoverRooms, room.roomName)}
                    className={[
                      'conv-bubble__lock',
                      'conv-bubble__lock--lead',
                      isRoomOpenChannel(room, discoverRooms, room.roomName)
                        ? 'conv-bubble__lock--open'
                        : '',
                    ].filter(Boolean).join(' ')}
                    title={isRoomOpenChannel(room, discoverRooms, room.roomName)
                      ? t('conversations.lockOpen')
                      : t('conversations.lockClosed')}
                  />
                  <RoomAvatar roomName={room.roomName} className="conv-bubble__avatar" />
                  <span className="conv-bubble__content">
                    <span className="conv-bubble__top">
                      <span className="conv-bubble__name-col">
                        <span className="conv-bubble__name">{room.roomName}</span>
                        {resolveRoomUserCount(discoverRooms, room.roomName, room) != null && (
                          <span
                            className="conv-bubble__subtitle"
                            title={t('conversations.roomUsersAria', {
                              count: String(resolveRoomUserCount(discoverRooms, room.roomName, room)),
                            })}
                          >
                            {t('conversations.roomUsers', {
                              count: String(resolveRoomUserCount(discoverRooms, room.roomName, room)),
                            })}
                          </span>
                        )}
                      </span>
                      <span className="conv-bubble__meta-right">
                        {room.lastTimestamp && (
                          <time className="conv-bubble__time">{room.lastTimestamp}</time>
                        )}
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

      {showDiscoverSection && (
        <section className="conv-section conv-section--discover" aria-labelledby="discover-heading">
          <div className="conv-section__header">
            <h2 id="discover-heading" className="conv-section__title">{t('conversations.activeRooms')}</h2>
            <span className="conv-section__count">
              {discoverQuery.trim() || discoverOpenOnly
                ? `${discoverFiltered.length}/${discoverAll.length}`
                : discoverAll.length}
            </span>
          </div>

          <div className="conv-discover-toolbar">
            <label className="conv-discover-search">
              <span className="conv-discover-search__icon" aria-hidden="true">⌕</span>
              <input
                type="search"
                value={discoverQuery}
                onChange={(e) => setDiscoverQuery(e.target.value)}
                placeholder={t('conversations.searchRooms')}
                aria-label={t('conversations.searchRoomsAria')}
                autoComplete="off"
                spellCheck={false}
              />
              {discoverQuery && (
                <button
                  type="button"
                  className="conv-discover-search__clear"
                  onClick={() => setDiscoverQuery('')}
                  aria-label={t('conversations.clearSearch')}
                >
                  ×
                </button>
              )}
            </label>
            <div className="conv-discover-toolbar__filters">
              <label className="conv-discover-sort">
                <span className="conv-discover-sort__label">{t('conversations.sortLabel')}</span>
                <select
                  value={discoverSort}
                  onChange={(e) => setDiscoverSort(e.target.value)}
                  aria-label={t('conversations.sortLabel')}
                >
                  {DISCOVER_SORT_OPTIONS.map((mode) => (
                    <option key={mode} value={mode}>
                      {t(SORT_I18N_KEY[mode])}
                    </option>
                  ))}
                </select>
              </label>
              <label className="conv-discover-filter-open">
                <input
                  type="checkbox"
                  checked={discoverOpenOnly}
                  onChange={(e) => setDiscoverOpenOnly(e.target.checked)}
                  aria-label={t('conversations.filterOpenOnlyAria')}
                />
                <span>{t('conversations.filterOpenOnly')}</span>
              </label>
            </div>
          </div>

          {discoverFiltered.length === 0 ? (
            <p className="conv-section__empty conv-section__empty--discover">
              {discoverOpenOnly && !discoverQuery.trim()
                ? t('conversations.noOpenRoomsFilter')
                : t('conversations.noSearchResults')}
            </p>
          ) : (
            <>
              <ul className="conv-bubbles conv-bubbles--discover">
                {discoverPageItems.map((room) => {
                  const deletesAt = room.deletesAt ?? getRoomDeletesAt(discoverRooms, room.roomName);
                  const isEmptyClosing = (room.userCount ?? 0) === 0 && deletesAt;
                  return (
                  <li key={room.roomName}>
                    <button
                      type="button"
                      className={[
                        'conv-bubble',
                        'conv-bubble--discover',
                        isEmptyClosing ? 'conv-bubble--empty-closing' : '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => onJoinDiscoverRoom(room.roomName)}
                    >
                      <RoomLockIcon
                        open={room.isOpen}
                        className={[
                          'conv-bubble__lock',
                          'conv-bubble__lock--lead',
                          room.isOpen ? 'conv-bubble__lock--open' : '',
                        ].filter(Boolean).join(' ')}
                        title={room.isOpen
                          ? t('conversations.lockOpen')
                          : t('conversations.lockClosed')}
                      />
                      <RoomAvatar
                        roomName={room.roomName}
                        className="conv-bubble__avatar conv-bubble__avatar--discover"
                      />
                      <span className="conv-bubble__content">
                        <span className="conv-bubble__top">
                          <span className="conv-bubble__name-col">
                            <span className="conv-bubble__name">{room.roomName}</span>
                            {isEmptyClosing ? (
                              <EmptyRoomCountdown deletesAt={deletesAt} compact />
                            ) : (
                              <span
                                className="conv-bubble__subtitle conv-bubble__subtitle--discover"
                                title={t('conversations.roomUsersAria', {
                                  count: String(room.userCount ?? 0),
                                })}
                              >
                                {t('conversations.roomUsers', {
                                  count: String(room.userCount ?? 0),
                                })}
                              </span>
                            )}
                          </span>
                        </span>
                        <span className="conv-bubble__preview-wrap">
                          <span className="conv-bubble__preview">
                            {isEmptyClosing
                              ? t('conversations.roomEmptyBadge')
                              : t('conversations.clickToJoin')}
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                  );
                })}
              </ul>

              {showDiscoverPagination && (
                <nav className="conv-discover-pagination" aria-label={t('conversations.pageNavAria')}>
                  <button
                    type="button"
                    className="conv-discover-pagination__btn"
                    disabled={safeDiscoverPage <= 0}
                    onClick={() => setDiscoverPage((p) => Math.max(0, p - 1))}
                  >
                    {t('conversations.pagePrev')}
                  </button>
                  <span className="conv-discover-pagination__status">
                    {t('conversations.pageStatus', {
                      page: String(safeDiscoverPage + 1),
                      total: String(totalDiscoverPages),
                    })}
                  </span>
                  <button
                    type="button"
                    className="conv-discover-pagination__btn"
                    disabled={safeDiscoverPage >= totalDiscoverPages - 1}
                    onClick={() => setDiscoverPage((p) => Math.min(totalDiscoverPages - 1, p + 1))}
                  >
                    {t('conversations.pageNext')}
                  </button>
                </nav>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
