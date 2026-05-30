'use client';

import AppLogo from '@/components/AppLogo';
import UserNameInput from '@/components/UserNameInput';
import ConversationList from '@/components/ConversationList';
import AppLangSwitcher from '@/components/AppLangSwitcher';
import { useTranslation } from '@/context/LocaleContext';
import './MessengerShell.css';

export default function MessengerShell({
  username,
  openRooms,
  discoverRooms,
  activeRoom,
  chatOpen,
  onSetUsername,
  onSelectOpenRoom,
  onJoinDiscoverRoom,
  onNewRoom,
  onBackToList,
  children,
}) {
  const { t } = useTranslation();
  const hasOpenRooms = Object.keys(openRooms).length > 0;
  const showSidebar = !chatOpen || !activeRoom;
  const showChatPane = activeRoom && chatOpen;

  return (
    <div className={`messenger ${chatOpen && activeRoom ? 'messenger--chat-open' : ''}`}>
      <header className="messenger__header">
        <div className="messenger__header-left">
          {chatOpen && activeRoom && (
            <button type="button" className="messenger__back" onClick={onBackToList} aria-label={t('messenger.backToChats')}>
              ←
            </button>
          )}
          <div className="messenger__brand">
            <AppLogo size={36} />
            <div>
              <h1 className="messenger__title">{t('messenger.title')}</h1>
              <p className="messenger__subtitle">{t('messenger.sessionSubtitle')}</p>
            </div>
          </div>
        </div>
        <div className="messenger__toolbar">
          <AppLangSwitcher />
          <UserNameInput compact onSetUsername={onSetUsername} initialName={username} />
        </div>
      </header>

      <div className="messenger__body">
        <aside className={`messenger__sidebar ${showSidebar ? '' : 'messenger__sidebar--hidden'}`}>
          <button type="button" className="btn btn--primary messenger__new" onClick={onNewRoom}>
            {t('messenger.newRoom')}
          </button>
          <ConversationList
            openRooms={openRooms}
            discoverRooms={discoverRooms}
            activeRoom={activeRoom}
            onSelectOpenRoom={onSelectOpenRoom}
            onJoinDiscoverRoom={onJoinDiscoverRoom}
          />
        </aside>

        <main className={`messenger__main ${showChatPane ? 'messenger__main--visible' : ''}`}>
          {showChatPane ? (
            children
          ) : (
            <div className="messenger__placeholder">
              <div className="messenger__placeholder-icon" aria-hidden="true">💬</div>
              <h2>{hasOpenRooms ? t('messenger.selectChat') : t('messenger.noOpenRooms')}</h2>
              <p>
                {hasOpenRooms
                  ? t('messenger.selectHintOpen')
                  : t('messenger.selectHintEmpty')}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
