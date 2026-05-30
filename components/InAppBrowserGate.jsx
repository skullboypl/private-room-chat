'use client';

import { useCallback, useEffect, useState } from 'react';
import { copyToClipboard } from '@/lib/invite';
import {
  detectInAppBrowser,
  shouldPromptExternalBrowser,
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
    if (shouldPromptExternalBrowser()) {
      setVisible(true);
    }
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

  return (
    <div className="in-app-browser-gate" role="dialog" aria-modal="true" aria-labelledby="in-app-browser-title">
      <div className="in-app-browser-gate__card">
        <p id="in-app-browser-title" className="in-app-browser-gate__text">
          {t('inAppBrowser.bodyShort', { app: t(`inAppBrowser.apps.${inAppKind}`) })}
        </p>
        <div className="in-app-browser-gate__actions">
          <button type="button" className="btn btn--primary in-app-browser-gate__continue" onClick={handleContinue}>
            {t('inAppBrowser.continueAnyway')}
          </button>
          <button type="button" className="btn btn--ghost in-app-browser-gate__copy" onClick={handleCopyLink}>
            {copied ? t('inAppBrowser.copied') : t('inAppBrowser.copyButton')}
          </button>
        </div>
      </div>
    </div>
  );
}
