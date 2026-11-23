'use client';

import { memo, useMemo, useState, useCallback, useEffect } from 'react';
import { getLocalImage, LOCAL_MEDIA_STORAGE_KEY } from '@/lib/localMessageStore';
import { getRoomChannelId } from '@/lib/roomSession';
import { useTranslation } from '@/context/LocaleContext';
import { translateSystemMessage } from '@/lib/i18n/systemMessages';
import ImageLightbox from '@/components/ImageLightbox';
import LinkifiedText from '@/components/LinkifiedText';
import UserAvatar from '@/components/UserAvatar';
import { DEFAULT_USER_AVATAR_STYLE } from '@/lib/userAvatarStorage';
import './Message.css';

function Message({
  sender,
  content,
  timestamp,
  type,
  imageId,
  roomName,
  isCurrentUser,
  isSystem,
  avatarSeed = null,
  avatarStyle = DEFAULT_USER_AVATAR_STYLE,
}) {
  const { t } = useTranslation();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPortal, setLightboxPortal] = useState(null);
  const [mediaRevision, setMediaRevision] = useState(0);

  useEffect(() => {
    if (type !== 'image' || !imageId || !roomName) return undefined;

    const bump = () => setMediaRevision((n) => n + 1);
    const onStorage = (e) => {
      if (!e.key || e.key === LOCAL_MEDIA_STORAGE_KEY) bump();
    };

    window.addEventListener('chatvxh:media-store-changed', bump);
    window.addEventListener('chatvxh:storage-cleared', bump);
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('chatvxh:media-store-changed', bump);
      window.removeEventListener('chatvxh:storage-cleared', bump);
      window.removeEventListener('storage', onStorage);
    };
  }, [type, imageId, roomName]);

  const displayContent = useMemo(() => {
    if (!isSystem) return content;
    return translateSystemMessage(content, t);
  }, [isSystem, content, t]);

  const imageSrc = useMemo(() => {
    if (type !== 'image' || !imageId || !roomName) return null;
    return getLocalImage(roomName, imageId, getRoomChannelId(roomName));
  }, [type, imageId, roomName, mediaRevision]);

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
  const seed = avatarSeed || sender;

  return (
    <div className={messageClass}>
      <div className="message__meta">
        <UserAvatar
          seed={seed}
          style={avatarStyle}
          className="message__avatar"
          size={20}
          alt={sender}
        />
        <span className="message__sender">{sender}</span>
      </div>
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
