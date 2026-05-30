'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import AppLogo from '@/components/AppLogo';
import UserNameInput from '@/components/UserNameInput';
import ConversationList from '@/components/ConversationList';
import AppLangSwitcher from '@/components/AppLangSwitcher';
import { countVisibleWindows, pickVisibleExpanded } from '@/lib/dockLayout';
import { useTranslation } from '@/context/LocaleContext';
import AppSiteFooter from '@/components/AppSiteFooter';
import { RoomLockIcon } from '@/components/icons/RoomLockIcon';
import { ChatBubbleIcon } from '@/components/icons/ChatBubbleIcon';
import RoomAvatar from '@/components/RoomAvatar';
import {
  isRoomOpenChannel,
  resolveRoomUserCount,
} from '@/lib/roomAccess';
import './MessengerDock.css';

export default function MessengerDock({
  username,
  openRooms,
  discoverRooms,
  expandedRooms,
  focusedRoom,
  fullscreenRoom,
  pipRooms = [],
  isCompact = false,
  mobileChatsCollapsed = false,
  onRestoreMobileChats,
  onSetUsername,
  onClearUser,
  onClearProfile,
  syncedProfileAvatar,
  onAvatarChange,
  onJoinDiscoverRoom,
  onNewRoom,
  onToggleRoom,
  onFocusRoom,
  onCloseRoom,
  renderChatRoom,
}) {
  const { t } = useTranslation();
  const roomBarRef = useRef(null);
  const openList = Object.keys(openRooms);
  const isFullscreen = Boolean(
    fullscreenRoom && (expandedRooms.includes(fullscreenRoom) || isCompact),
  );
  const useDockRail = !isCompact;
  /** Mobile: zakładki kanałów tylko w fullscreen czatu, nie na liście po minimalizacji. */
  const showRoomBar = isCompact
    ? isFullscreen && !mobileChatsCollapsed
    : (!useDockRail || isFullscreen);
  const [maxVisibleWindows, setMaxVisibleWindows] = useState(3);

  useEffect(() => {
    const update = () => {
      setMaxVisibleWindows(countVisibleWindows(window.innerWidth));
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    const el = roomBarRef.current;
    if (!el || !showRoomBar) return undefined;

    const onWheel = (e) => {
      if (el.scrollWidth <= el.clientWidth + 1) return;

      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (delta === 0) return;

      e.preventDefault();
      el.scrollLeft += delta;
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [showRoomBar]);

  const dockExpandedRooms = expandedRooms.filter(
    (name) => name !== fullscreenRoom && !pipRooms.includes(name),
  );
  const visibleDockRooms = useMemo(
    () => pickVisibleExpanded(dockExpandedRooms, focusedRoom, maxVisibleWindows),
    [dockExpandedRooms, focusedRoom, maxVisibleWindows],
  );

  const minimizedRooms = useMemo(
    () => openList.filter(
      (name) => !expandedRooms.includes(name) && name !== fullscreenRoom && !pipRooms.includes(name),
    ),
    [openList, expandedRooms, fullscreenRoom, pipRooms],
  );

  const showDockCluster = !isFullscreen && !isCompact;
  const hasDockWindows = showDockCluster && visibleDockRooms.length > 0;
  const showMobileChatFab = isCompact && mobileChatsCollapsed && openList.length > 0;
  const mobileUnreadTotal = useMemo(
    () => openList.reduce((sum, name) => sum + (openRooms[name]?.unread || 0), 0),
    [openList, openRooms],
  );

  return (
    <div
      className={[
        'fb-layout',
        isFullscreen ? 'fb-layout--fullscreen' : '',
        hasDockWindows ? 'fb-layout--has-dock' : '',
        useDockRail ? 'fb-layout--dock-rail' : '',
        showRoomBar && !isFullscreen ? 'fb-layout--with-room-bar' : '',
        isFullscreen && useDockRail ? 'fb-layout--fullscreen-tabs' : '',
        showMobileChatFab ? 'fb-layout--mobile-hub' : '',
      ].filter(Boolean).join(' ')}
    >
      {!isFullscreen && (
        <header className="fb-topbar pwa-safe-fill-top">
          <div className="fb-topbar__brand">
            <AppLogo size={32} />
            <div>
              <h1 className="fb-topbar__title">{t('messenger.title')}</h1>
              <p className="fb-topbar__subtitle">{t('messenger.subtitle')}</p>
            </div>
          </div>
          <div className="fb-topbar__actions">
            <AppLangSwitcher />
            <UserNameInput
              compact
              onSetUsername={onSetUsername}
              onClearUser={onClearUser}
              onClearProfile={onClearProfile}
              syncedProfileAvatar={syncedProfileAvatar}
              onAvatarChange={onAvatarChange}
              initialName={username}
            />
          </div>
        </header>
      )}

      {showRoomBar && (
        <div
          ref={roomBarRef}
          className={`fb-room-bar${isFullscreen ? ' fb-room-bar--fullscreen-top pwa-safe-fill-top' : ''}`}
          role="tablist"
          aria-label={t('messenger.openChannels')}
        >
          {openList.map((roomName) => {
            const room = openRooms[roomName];
            const tabUserCount = resolveRoomUserCount(discoverRooms, roomName, room);
            const tabIsOpen = isRoomOpenChannel(room, discoverRooms, roomName);
            const isExpanded = expandedRooms.includes(roomName);
            const isFs = fullscreenRoom === roomName;
            const isPip = pipRooms.includes(roomName);
            return (
              <button
                key={roomName}
                type="button"
                role="tab"
                aria-selected={focusedRoom === roomName && (isExpanded || isFs || isPip)}
                className={[
                  'fb-room-tab',
                  focusedRoom === roomName ? 'fb-room-tab--focused' : '',
                  isExpanded || isFs || isPip ? 'fb-room-tab--open' : '',
                  isFs ? 'fb-room-tab--fullscreen' : '',
                  isPip ? 'fb-room-tab--pip' : '',
                  room?.unread ? 'fb-room-tab--unread' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => onToggleRoom(roomName)}
              >
                <RoomLockIcon
                  open={tabIsOpen}
                  className={[
                    'fb-room-tab__lock',
                    tabIsOpen ? 'fb-room-tab__lock--open' : '',
                  ].filter(Boolean).join(' ')}
                  title={tabIsOpen
                    ? t('conversations.lockOpen')
                    : t('conversations.lockClosed')}
                />
                <RoomAvatar roomName={roomName} className="fb-room-tab__avatar" />
                <span className="fb-room-tab__main">
                  <span className="fb-room-tab__name">{roomName}</span>
                  {tabUserCount != null && (
                    <span
                      className="fb-room-tab__users"
                      title={t('conversations.roomUsersAria', {
                        count: String(tabUserCount),
                      })}
                    >
                      {t('conversations.roomUsers', { count: String(tabUserCount) })}
                    </span>
                  )}
                </span>
                <span className="fb-room-tab__aside">
                  {room?.unread > 0 && (
                    <span className="fb-room-tab__badge">{room.unread > 9 ? '9+' : room.unread}</span>
                  )}
                  <span
                    role="button"
                    tabIndex={0}
                    className="fb-room-tab__close"
                    aria-label={t('chat.leaveRoom', { room: roomName })}
                    onClick={(e) => { e.stopPropagation(); onCloseRoom(roomName); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onCloseRoom(roomName); } }}
                  >
                    ×
                  </span>
                </span>
              </button>
            );
          })}
          <button type="button" className="fb-room-tab fb-room-tab--new" onClick={onNewRoom} aria-label={t('messenger.newChannel')}>
            +
          </button>
        </div>
      )}

      {isFullscreen && fullscreenRoom && (
        <div className="fb-fullscreen-stage">
          {renderChatRoom(fullscreenRoom, 'fullscreen')}
        </div>
      )}

      {!isFullscreen && (
        <>
          <main className="fb-main">
            <div className="fb-main__inner">
              <div className="fb-notice" role="note">
                <strong>{t('messenger.ephemeralNotice')}</strong>
                {' '}{t('messenger.ephemeralDetail')}
              </div>

              <div className="fb-main__toolbar">
                <button type="button" className="btn btn--primary fb-main__new" onClick={onNewRoom}>
                  {t('messenger.newChannel')}
                </button>
              </div>

              <ConversationList
                openRooms={openRooms}
                discoverRooms={discoverRooms}
                activeRoom={focusedRoom}
                onSelectOpenRoom={onToggleRoom}
                onJoinDiscoverRoom={onJoinDiscoverRoom}
              />

              {openList.length === 0 && (
                <p className="fb-main__hint">
                  {useDockRail
                    ? t('messenger.joinHintRail')
                    : t('messenger.joinHintTabs')}
                </p>
              )}
            </div>
          </main>

          <AppSiteFooter variant="dock" />
        </>
      )}

      {showMobileChatFab && (
        <button
          type="button"
          className="fb-mobile-chat-fab"
          onClick={onRestoreMobileChats}
          aria-label={t('messenger.openChatsAria')}
          title={t('messenger.openChats')}
        >
          <span className="fb-mobile-chat-fab__icon" aria-hidden="true">
            <ChatBubbleIcon />
          </span>
          {mobileUnreadTotal > 0 && (
            <span className="fb-mobile-chat-fab__badge" aria-hidden="true">
              {mobileUnreadTotal > 9 ? '9+' : mobileUnreadTotal}
            </span>
          )}
        </button>
      )}

      {showDockCluster && (
        <div className="fb-dock-area">
          <div className="fb-dock-cluster">
            {hasDockWindows && (
              <div className="fb-dock-windows">
                {visibleDockRooms.map((roomName) => (
                  <div
                    key={roomName}
                    className={`fb-dock-window ${focusedRoom === roomName ? 'fb-dock-window--focused' : ''}`}
                    onMouseDown={() => onFocusRoom(roomName)}
                  >
                    {renderChatRoom(roomName, 'dock')}
                  </div>
                ))}
              </div>
            )}

            {showDockCluster && (
            <div className="fb-dock-rail" role="tablist" aria-label={t('messenger.minimizedChannels')}>
              {minimizedRooms.map((roomName) => {
                const room = openRooms[roomName];
                const railUserCount = resolveRoomUserCount(discoverRooms, roomName, room);
                const railIsOpen = isRoomOpenChannel(room, discoverRooms, roomName);
                return (
                  <button
                    key={roomName}
                    type="button"
                    role="tab"
                    aria-selected={false}
                    className={[
                      'fb-dock-rail-item',
                      room?.unread ? 'fb-dock-rail-item--unread' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => onToggleRoom(roomName)}
                    title={roomName}
                  >
                    <RoomLockIcon
                      open={railIsOpen}
                      className={[
                        'fb-dock-rail-item__lock',
                        railIsOpen ? 'fb-dock-rail-item__lock--open' : '',
                      ].filter(Boolean).join(' ')}
                      title={railIsOpen
                        ? t('conversations.lockOpen')
                        : t('conversations.lockClosed')}
                    />
                    <RoomAvatar roomName={roomName} className="fb-dock-rail-item__avatar" />
                    <span className="fb-dock-rail-item__text">
                      <span className="fb-dock-rail-item__name">{roomName}</span>
                      {railUserCount != null && (
                        <span className="fb-dock-rail-item__users">
                          {t('conversations.roomUsers', { count: String(railUserCount) })}
                        </span>
                      )}
                    </span>
                    {room?.unread > 0 && (
                      <span className="fb-dock-rail-item__badge">
                        {room.unread > 9 ? '9+' : room.unread}
                      </span>
                    )}
                  </button>
                );
              })}

              <button
                type="button"
                className="fb-dock-rail-item fb-dock-rail-item--new"
                onClick={onNewRoom}
                aria-label={t('messenger.newChannel')}
                title={t('messenger.newChannel')}
              >
                <span className="fb-dock-rail-item__avatar" aria-hidden="true">+</span>
              </button>
            </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
