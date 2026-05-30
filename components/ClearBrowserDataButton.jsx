'use client';

import { clearAllBrowserChatData } from '@/lib/clearBrowserData';
import { socketService } from '@/lib/socket/client';
import { useOptionalTranslation } from '@/context/LocaleContext';

export default function ClearBrowserDataButton({ className = '', lang }) {
  const { t } = useOptionalTranslation(lang);

  const handleClick = () => {
    if (!window.confirm(t('footer.clearConfirm'))) return;
    clearAllBrowserChatData();
    socketService.disconnect();
    window.location.href = '/';
  };

  return (
    <button
      type="button"
      className={['app-site-footer__clear-btn', className].filter(Boolean).join(' ')}
      onClick={handleClick}
    >
      {t('footer.clearBrowser')}
    </button>
  );
}
