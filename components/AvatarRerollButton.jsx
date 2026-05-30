'use client';

import { RerollIcon } from '@/components/icons/RerollIcon';
import { useTranslation } from '@/context/LocaleContext';
import './AvatarRerollButton.css';

export default function AvatarRerollButton({
  onClick,
  disabled = false,
  waitSeconds = 0,
  className = '',
  size = 'lg',
  ariaLabelKey = 'welcome.randomizeAvatarAria',
  waitLabelKey = 'welcome.randomizeAvatarWait',
}) {
  const { t } = useTranslation();
  const ariaLabel = disabled && waitSeconds > 0
    ? t(waitLabelKey, { seconds: waitSeconds })
    : t(ariaLabelKey);

  return (
    <button
      type="button"
      className={[
        'avatar-reroll-btn',
        `avatar-reroll-btn--${size}`,
        disabled ? 'avatar-reroll-btn--disabled' : '',
        className,
      ].filter(Boolean).join(' ')}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <RerollIcon className="avatar-reroll-btn__icon" />
      {disabled && waitSeconds > 0 ? (
        <span className="avatar-reroll-btn__badge">{waitSeconds}</span>
      ) : null}
    </button>
  );
}
