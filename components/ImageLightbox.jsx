'use client';

import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from '@/context/LocaleContext';
import './ImageLightbox.css';

function guessExtension(src) {
  const match = src.match(/^data:image\/(\w+);/i);
  if (!match) return 'png';
  const ext = match[1].toLowerCase();
  if (ext === 'jpeg') return 'jpg';
  if (ext === 'svg+xml') return 'svg';
  return ext;
}

function buildFilename(imageId, src) {
  const ext = guessExtension(src);
  const safeId = (imageId || 'obraz').replace(/[^\w.-]+/g, '_').slice(0, 48);
  return `chat-${safeId}.${ext}`;
}

export default function ImageLightbox({
  open,
  src,
  alt = '',
  imageId = '',
  onClose,
  portalTarget = null,
}) {
  const { t } = useTranslation();
  const closeBtnRef = useRef(null);
  const lightboxRef = useRef(null);
  const target = portalTarget || (typeof document !== 'undefined' ? document.body : null);

  const syncVisualViewport = useCallback(() => {
    const node = lightboxRef.current;
    if (!node) return;

    const view = node.ownerDocument.defaultView || window;
    const vv = view.visualViewport;

    if (vv) {
      node.style.top = `${vv.offsetTop}px`;
      node.style.left = `${vv.offsetLeft}px`;
      node.style.width = `${vv.width}px`;
      node.style.height = `${vv.height}px`;
      return;
    }

    node.style.top = '0';
    node.style.left = '0';
    node.style.width = '100%';
    node.style.height = '100dvh';
  }, []);

  const handleDownload = useCallback(() => {
    if (!src || !target) return;
    const doc = target.ownerDocument;
    const link = doc.createElement('a');
    link.href = src;
    link.download = buildFilename(imageId, src);
    target.appendChild(link);
    link.click();
    target.removeChild(link);
  }, [src, imageId, target]);

  useEffect(() => {
    if (!open || !target) return undefined;

    const doc = target.ownerDocument;
    const view = doc.defaultView || window;
    const prevOverflow = doc.body.style.overflow;
    const prevPosition = doc.body.style.position;
    const prevTop = doc.body.style.top;
    const prevWidth = doc.body.style.width;
    const scrollY = view.scrollY;

    doc.body.style.overflow = 'hidden';
    if (view.visualViewport) {
      doc.body.style.position = 'fixed';
      doc.body.style.top = `-${scrollY}px`;
      doc.body.style.width = '100%';
    }

    syncVisualViewport();
    view.visualViewport?.addEventListener('resize', syncVisualViewport);
    view.visualViewport?.addEventListener('scroll', syncVisualViewport);
    view.addEventListener('orientationchange', syncVisualViewport);
    closeBtnRef.current?.focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    view.addEventListener('keydown', onKeyDown);
    return () => {
      doc.body.style.overflow = prevOverflow;
      doc.body.style.position = prevPosition;
      doc.body.style.top = prevTop;
      doc.body.style.width = prevWidth;
      if (view.visualViewport) {
        view.scrollTo(0, scrollY);
      }
      view.visualViewport?.removeEventListener('resize', syncVisualViewport);
      view.visualViewport?.removeEventListener('scroll', syncVisualViewport);
      view.removeEventListener('orientationchange', syncVisualViewport);
      view.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose, target, syncVisualViewport]);

  if (!open || !src || !target) return null;

  return createPortal(
    <div
      ref={lightboxRef}
      className="image-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={alt || t('chat.imagePreview')}
      onClick={onClose}
    >
      <div className="image-lightbox__toolbar" onClick={(e) => e.stopPropagation()}>
        <span className="image-lightbox__label">{alt}</span>
        <div className="image-lightbox__actions">
          <button
            type="button"
            className="image-lightbox__btn"
            onClick={handleDownload}
            aria-label={t('chat.download')}
            title={t('chat.download')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 3v12M7 10l5 5 5-5M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="image-lightbox__btn-text">{t('chat.download')}</span>
          </button>
          <button
            ref={closeBtnRef}
            type="button"
            className="image-lightbox__btn image-lightbox__btn--close"
            onClick={onClose}
            aria-label={t('chat.closePreview')}
            title={t('chat.close')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="image-lightbox__stage" onClick={onClose}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="image-lightbox__img"
          draggable={false}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>,
    target,
  );
}
