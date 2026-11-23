'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const BOTTOM_THRESHOLD_PX = 72;

export function useChatMessageScroll(messages, { currentUserLabel = '', resetKey = '' } = {}) {
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const stickToBottomRef = useRef(true);
  const prevLengthRef = useRef(0);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);

  useEffect(() => {
    prevLengthRef.current = 0;
    stickToBottomRef.current = true;
    setShowJumpToLatest(false);
    requestAnimationFrame(() => {
      const el = containerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, [resetKey]);

  const isNearBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_THRESHOLD_PX;
  }, []);

  const hasOverflow = useCallback(() => {
    const el = containerRef.current;
    if (!el) return false;
    return el.scrollHeight > el.clientHeight + 1;
  }, []);

  const scrollToBottom = useCallback((behavior = 'auto') => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    stickToBottomRef.current = true;
    setShowJumpToLatest(false);
  }, []);

  const handleScroll = useCallback(() => {
    const near = isNearBottom();
    stickToBottomRef.current = near;
    setShowJumpToLatest(!near && hasOverflow());
  }, [isNearBottom, hasOverflow]);

  useEffect(() => {
    if (!messages?.length) {
      prevLengthRef.current = 0;
      stickToBottomRef.current = true;
      setShowJumpToLatest(false);
      return;
    }

    const prevLen = prevLengthRef.current;
    const hasNewMessages = messages.length > prevLen;
    prevLengthRef.current = messages.length;

    const lastMsg = messages[messages.length - 1];
    const isOwnMessage = Boolean(currentUserLabel && lastMsg?.sender === currentUserLabel);

    if (!hasNewMessages && prevLen > 0) return;

    if (stickToBottomRef.current || isOwnMessage || prevLen === 0) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => scrollToBottom('auto'));
      });
    } else if (hasNewMessages) {
      setShowJumpToLatest(true);
    }
  }, [messages, currentUserLabel, scrollToBottom]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content || typeof ResizeObserver === 'undefined') return undefined;

    const ro = new ResizeObserver(() => {
      if (stickToBottomRef.current) {
        const el = containerRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      } else {
        handleScroll();
      }
    });
    ro.observe(content);
    return () => ro.disconnect();
  }, [handleScroll]);

  return {
    containerRef,
    contentRef,
    showJumpToLatest,
    scrollToBottom,
    handleScroll,
  };
}
