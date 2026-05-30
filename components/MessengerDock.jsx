'use client';

import { useState, useEffect, useMemo } from 'react';
import AppLogo from '@/components/AppLogo';
import UserNameInput from '@/components/UserNameInput';
import ConversationList from '@/components/ConversationList';
import AppLangSwitcher from '@/components/AppLangSwitcher';
import { countVisibleWindows, pickVisibleExpanded } from '@/lib/dockLayout';
import { useTranslation } from '@/context/LocaleContext';
import AppSiteFooter from '@/components/AppSiteFooter';
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
  onSetUsername,
  onJoinDiscoverRoom,
  onNewRoom,
  onToggleRoom,
  onFocusRoom,
  onCloseRoom,
  renderChatRoom,
}) {
  const { t } = useTranslation();
  const openList = Object.keys(openRooms);
  const isFullscreen = Boolean(
    fullscreenRoom && (expandedRooms.includes(fullscreenRoom) || isCompact),
  );
  const useDockRail = !isCompact;
  const showRoomBar = !useDockRail || isFullscreen;
  const [maxVisibleWindows, setMaxVisibleWindows] = useState(3);

  useEffect(() => {
    const update = () => {
      setMaxVisibleWindows(countVisibleWindows(window.innerWidth));
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

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

  return (
    <div
      className={[
        'fb-layout',
        isFullscreen ? 'fb-layout--fullscreen' : '',
        hasDockWindows ? 'fb-layout--has-dock' : '',
        useDockRail ? 'fb-layout--dock-rail' : '',
        showRoomBar && !isFullscreen ? 'fb-layout--with-room-bar' : '',
        isFullscreen && useDockRail ? 'fb-layout--fullscreen-tabs' : '',
      ].filter(Boolean).join(' ')}
    >
      {!isFullscreen && (
        <header className="fb-topbar">
          <div className="fb-topbar__brand">
            <AppLogo size={32} />
            <div>
              <h1 className="fb-topbar__title">{t('messenger.title')}</h1>
              <p className="fb-topbar__subtitle">{t('messenger.subtitle')}</p>
            </div>
          </div>
          <div className="fb-topbar__actions">
            <AppLangSwitcher />
            <UserNameInput compact onSetUsername={onSetUsername} initialName={username} />
          </div>
        </header>
      )}

      {showRoomBar && (
        <div className="fb-room-bar" role="tablist" aria-label={t('messenger.openChannels')}>
          {openList.map((roomName) => {
            const room = openRooms[roomName];
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
                <span className="fb-room-tab__avatar" aria-hidden="true">
                  {roomName.charAt(0).toUpperCase()}
                </span>
                <span className="fb-room-tab__name">{roomName}</span>
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
                    <span className="fb-dock-rail-item__avatar" aria-hidden="true">
                      {roomName.charAt(0).toUpperCase()}
                    </span>
                    <span className="fb-dock-rail-item__name">{roomName}</span>
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
