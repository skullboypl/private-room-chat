'use client';

import { useCallback, useEffect, useState } from 'react';
import { copyToClipboard } from '@/lib/invite';
import {
  detectInAppBrowser,
  isAndroidDevice,
  isIOSDevice,
  markExternalOpenAttempted,
  shouldPromptExternalBrowser,
  tryOpenInExternalBrowser,
  wasExternalOpenAttempted,
  allowInAppBrowser,
} from '@/lib/inAppBrowser';
import { useTranslation } from '@/context/LocaleContext';
import './InAppBrowserGate.css';

export default function InAppBrowserGate() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const inAppKind = detectInAppBrowser();

  useEffect(() => {
    if (!shouldPromptExternalBrowser()) return;

    if (isAndroidDevice() && !wasExternalOpenAttempted()) {
      markExternalOpenAttempted();
      tryOpenInExternalBrowser();
      window.setTimeout(() => setVisible(true), 900);
      return;
    }

    setVisible(true);
  }, []);

  const handleOpenExternal = useCallback(() => {
    markExternalOpenAttempted();
    tryOpenInExternalBrowser();
  }, []);

  const handleCopyLink = useCallback(async () => {
    try {
      await copyToClipboard(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, []);

  const handleContinue = useCallback(() => {
    allowInAppBrowser();
    setVisible(false);
  }, []);

  if (!visible || !inAppKind) return null;

  const browserLabel = isAndroidDevice()
    ? t('inAppBrowser.browserChrome')
    : t('inAppBrowser.browserSafari');

  return (
    <div className="in-app-browser-gate" role="dialog" aria-modal="true" aria-labelledby="in-app-browser-title">
      <div className="in-app-browser-gate__card">
        <div className="in-app-browser-gate__icon" aria-hidden="true">🌐</div>
        <h2 id="in-app-browser-title" className="in-app-browser-gate__title">
          {t('inAppBrowser.title')}
        </h2>
        <p className="in-app-browser-gate__text">
          {t('inAppBrowser.body', { app: t(`inAppBrowser.apps.${inAppKind}`) })}
        </p>
        {isIOSDevice() && (
          <p className="in-app-browser-gate__hint">{t('inAppBrowser.iosHint')}</p>
        )}

        <div className="in-app-browser-gate__actions">
          <button type="button" className="btn btn--primary in-app-browser-gate__btn" onClick={handleOpenExternal}>
            {t('inAppBrowser.openButton', { browser: browserLabel })}
          </button>
          <button type="button" className="btn btn--ghost in-app-browser-gate__btn" onClick={handleCopyLink}>
            {copied ? t('inAppBrowser.copied') : t('inAppBrowser.copyButton')}
          </button>
          <button type="button" className="in-app-browser-gate__continue" onClick={handleContinue}>
            {t('inAppBrowser.continueAnyway')}
          </button>
        </div>
      </div>
    </div>
  );
}
