'use client';

import { clearAllBrowserChatData } from '@/lib/clearBrowserData';
import { socketService } from '@/lib/socket/client';
import { useOptionalTranslation } from '@/context/LocaleContext';

export default function ClearBrowserDataButton({ className = '', lang }) {
  const { t } = useOptionalTranslation(lang);

  const handleClick = async () => {
    if (!window.confirm(t('footer.clearConfirm'))) return;
    await clearAllBrowserChatData();
    socketService.disconnect();
    // Pełne przeładowanie (w PWA samo href='/' zostawia obrazy w pamięci React).
    window.location.href = `/?cleared=${Date.now()}`;
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
