'use client';

import { memo, useMemo, useState, useCallback } from 'react';
import { getLocalImage } from '@/lib/localMessageStore';
import { useTranslation } from '@/context/LocaleContext';
import { translateSystemMessage } from '@/lib/i18n/systemMessages';
import ImageLightbox from '@/components/ImageLightbox';
import LinkifiedText from '@/components/LinkifiedText';
import './Message.css';

function Message({
  sender, content, timestamp, type, imageId, roomName, isCurrentUser, isSystem,
}) {
  const { t } = useTranslation();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPortal, setLightboxPortal] = useState(null);

  const displayContent = useMemo(() => {
    if (!isSystem) return content;
    return translateSystemMessage(content, t);
  }, [isSystem, content, t]);

  const imageSrc = useMemo(() => {
    if (type !== 'image' || !imageId || !roomName) return null;
    return getLocalImage(roomName, imageId);
  }, [type, imageId, roomName]);

  const openLightbox = useCallback((e) => {
    if (!imageSrc) return;
    setLightboxPortal(e.currentTarget.ownerDocument.body);
    setLightboxOpen(true);
  }, [imageSrc]);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    setLightboxPortal(null);
  }, []);

  if (isSystem) {
    return (
      <div className="message message--system" role="status">
        <span>{displayContent}</span>
      </div>
    );
  }

  const messageClass = isCurrentUser ? 'message message--own' : 'message message--other';

  return (
    <div className={messageClass}>
      {!isCurrentUser && <span className="message__sender">{sender}</span>}
      <div className="message__bubble">
        {type === 'image' ? (
          imageSrc ? (
            <>
              <button
                type="button"
                className="message__image-btn"
                onClick={openLightbox}
                aria-label={t('chat.enlargeImage', { sender })}
              >
                <img src={imageSrc} alt="" className="message__image" loading="lazy" draggable={false} />
              </button>
              <ImageLightbox
                open={lightboxOpen}
                src={imageSrc}
                alt={t('chat.imageFrom', { sender })}
                imageId={imageId}
                onClose={closeLightbox}
                portalTarget={lightboxPortal}
              />
            </>
          ) : (
            <p className="message__text message__text--missing">{t('chat.imageMissing')}</p>
          )
        ) : (
          <p className="message__text">
            <LinkifiedText text={content} />
          </p>
        )}
        <time className="message__time">{timestamp}</time>
      </div>
    </div>
  );
}

export default memo(Message);
