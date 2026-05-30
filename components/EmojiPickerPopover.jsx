'use client';

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { enhanceEmojiPickerNavWhenReady } from '@/lib/emojiPickerNavEnhance';

const PICKER_GAP = 8;
const MIN_PICKER_HEIGHT = 200;
const DEFAULT_PICKER_MAX = { full: 360, compact: 280 };
const PICKER_WIDTH = { full: 352, compact: 320 };

export function measureEmojiPickerPlacement(anchorEl, compact) {
  const defaultMax = compact ? DEFAULT_PICKER_MAX.compact : DEFAULT_PICKER_MAX.full;
  const width = compact
    ? Math.min(PICKER_WIDTH.compact, window.innerWidth - 16)
    : Math.min(PICKER_WIDTH.full, window.innerWidth - 16);

  if (!anchorEl) {
    return { below: false, maxHeight: defaultMax, top: 8, left: 8, width };
  }

  const rect = anchorEl.getBoundingClientRect();
  const spaceAbove = rect.top - PICKER_GAP;
  const spaceBelow = window.innerHeight - rect.bottom - PICKER_GAP;

  let below = false;
  let maxHeight = defaultMax;

  if (spaceAbove >= MIN_PICKER_HEIGHT) {
    below = false;
    maxHeight = Math.min(defaultMax, spaceAbove);
  } else if (spaceBelow >= MIN_PICKER_HEIGHT && spaceBelow > spaceAbove) {
    below = true;
    maxHeight = Math.min(defaultMax, spaceBelow);
  } else {
    below = spaceBelow > spaceAbove;
    maxHeight = Math.max(
      MIN_PICKER_HEIGHT,
      Math.min(defaultMax, below ? spaceBelow : spaceAbove),
    );
  }

  maxHeight = Math.floor(maxHeight);
  const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
  const top = below
    ? rect.bottom + PICKER_GAP
    : Math.max(8, rect.top - PICKER_GAP - maxHeight);

  return { below, maxHeight, top, left, width };
}

function isEventInsidePicker(event, containerEl, toggleEl) {
  const path = typeof event.composedPath === 'function' ? event.composedPath() : [event.target];
  for (const node of path) {
    if (!(node instanceof Node)) continue;
    if (toggleEl?.contains(node)) return true;
    if (containerEl?.contains(node)) return true;
    if (node instanceof Element && node.tagName === 'EMOJI-PICKER') return true;
  }
  return false;
}

export default function EmojiPickerPopover({
  open,
  onClose,
  onEmojiSelect,
  anchorRef,
  compact = false,
  lang = 'pl',
  ariaLabel = 'Wybierz emoji',
}) {
  const containerRef = useRef(null);
  const pickerRef = useRef(null);
  const [pickerReady, setPickerReady] = useState(false);
  const [layout, setLayout] = useState(() => (
    measureEmojiPickerPlacement(anchorRef?.current, compact)
  ));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await import('emoji-picker-element');
      if (!cancelled) setPickerReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!open || !pickerReady) return undefined;

    const picker = pickerRef.current;
    if (!picker) return undefined;

    (async () => {
      if (lang === 'pl') {
        const { default: plI18n } = await import('emoji-picker-element/i18n/pl');
        picker.i18n = plI18n;
        picker.locale = 'pl';
      } else {
        picker.locale = 'en';
      }
    })();

    picker.classList.add('dark');

    const onEmojiClick = (event) => {
      const unicode = event.detail?.unicode;
      if (unicode) onEmojiSelect(unicode);
    };

    picker.addEventListener('emoji-click', onEmojiClick);
    const cleanupNav = enhanceEmojiPickerNavWhenReady(picker);

    return () => {
      picker.removeEventListener('emoji-click', onEmojiClick);
      cleanupNav();
    };
  }, [open, pickerReady, lang, onEmojiSelect]);

  useEffect(() => {
    if (!open) return undefined;

    const updateLayout = () => {
      setLayout(measureEmojiPickerPlacement(anchorRef?.current, compact));
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    window.visualViewport?.addEventListener('resize', updateLayout);
    window.addEventListener('scroll', updateLayout, true);

    const boundsEl = anchorRef?.current?.closest('.chat-window, .chat-pip');
    const resizeObserver = typeof ResizeObserver !== 'undefined' && boundsEl
      ? new ResizeObserver(updateLayout)
      : null;
    resizeObserver?.observe(boundsEl);

    return () => {
      window.removeEventListener('resize', updateLayout);
      window.visualViewport?.removeEventListener('resize', updateLayout);
      window.removeEventListener('scroll', updateLayout, true);
      resizeObserver?.disconnect();
    };
  }, [open, compact, anchorRef]);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (isEventInsidePicker(event, containerRef.current, anchorRef?.current)) return;
      onClose();
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open, onClose, anchorRef]);

  if (!open || !pickerReady || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={containerRef}
      className={`emoji-picker-container emoji-picker-container--portal${compact ? ' emoji-picker-container--compact' : ''}`}
      role="dialog"
      aria-label={ariaLabel}
      style={{
        '--emoji-picker-height': `${layout.maxHeight}px`,
        top: `${layout.top}px`,
        left: `${layout.left}px`,
        width: `${layout.width}px`,
        height: `${layout.maxHeight}px`,
      }}
    >
      <emoji-picker
        ref={pickerRef}
        className="dark"
        style={{ width: '100%', height: '100%' }}
      />
    </div>,
    document.body,
  );
}
