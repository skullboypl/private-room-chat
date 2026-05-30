'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/context/LocaleContext';

export default function PwaRegister() {
  const { t } = useTranslation();
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;

    navigator.serviceWorker.register('/sw.js').catch(() => {});

    const onBeforeInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
      setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
    setShowInstall(false);
  };

  if (!showInstall || !installPrompt) return null;

  return (
    <div className="pwa-install" role="dialog" aria-label={t('pwa.dialogAria')}>
      <p className="pwa-install__text">{t('pwa.install')}</p>
      <div className="pwa-install__actions">
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowInstall(false)}>
          {t('pwa.later')}
        </button>
        <button type="button" className="btn btn--primary btn--sm" onClick={handleInstall}>
          {t('pwa.installBtn')}
        </button>
      </div>
    </div>
  );
}
