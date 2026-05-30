const STYLE_ID = 'vxh-emoji-picker-nav';

const NAV_SCROLL_CSS = `
.vxh-nav-header {
  overflow-x: auto;
  overflow-y: hidden;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}

.vxh-nav-header::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
}

.vxh-nav-inner {
  display: flex;
  flex-direction: column;
  width: max-content;
  min-width: 100%;
}

.vxh-nav-header .nav {
  display: flex !important;
  flex-wrap: nowrap !important;
  justify-content: flex-start !important;
  grid-template-columns: unset !important;
  overflow: visible !important;
  contain: none !important;
  gap: 0;
}

.vxh-nav-header .nav-button {
  flex: 0 0 auto !important;
  min-width: 2.35rem;
  border-radius: 0.4rem 0.4rem 0 0;
  transition: background-color 0.15s ease;
}

.vxh-nav-header .nav-button:hover:not([aria-selected="true"]) {
  background-color: var(--button-hover-background, rgba(255, 255, 255, 0.06)) !important;
}

.vxh-nav-header .nav-button[aria-selected="true"] {
  background-color: var(--button-active-background, rgba(255, 255, 255, 0.14)) !important;
}

.vxh-nav-header .indicator-wrapper {
  position: relative !important;
  display: block !important;
  width: 100% !important;
  flex: none !important;
  overflow: hidden !important;
}

.vxh-nav-header .indicator {
  position: absolute !important;
  left: 0 !important;
  top: 0 !important;
  width: 2.35rem;
  will-change: transform, width !important;
  transition: transform 0.25s ease-in-out, width 0.2s ease-in-out, opacity 0.1s linear !important;
}
`;

function getActiveNavTab(nav) {
  return nav.querySelector('.nav-button[aria-selected="true"]');
}

function syncIndicatorToActiveTab(nav, indicator) {
  const active = getActiveNavTab(nav);
  if (!active || !indicator) return;
  indicator.style.width = `${active.offsetWidth}px`;
  indicator.style.transform = `translateX(${active.offsetLeft}px)`;
}

function scrollTabToCenter(scrollEl, tab) {
  if (!tab || !scrollEl) return;

  const maxScroll = Math.max(0, scrollEl.scrollWidth - scrollEl.clientWidth);
  if (maxScroll <= 0) return;

  const tabLeft = tab.offsetLeft;
  const tabWidth = tab.offsetWidth;
  const target = tabLeft - (scrollEl.clientWidth - tabWidth) / 2;

  scrollEl.scrollTo({
    left: Math.max(0, Math.min(target, maxScroll)),
    behavior: 'smooth',
  });
}

function wrapNavAndIndicator(nav) {
  if (nav.closest('.vxh-nav-header')) {
    const header = nav.closest('.vxh-nav-header');
    const wrapper = header?.querySelector('.indicator-wrapper');
    const indicator = wrapper?.querySelector('.indicator');
    return header && wrapper && indicator
      ? { header, nav, wrapper, indicator }
      : null;
  }

  const wrapper = nav.nextElementSibling;
  if (!wrapper?.classList?.contains('indicator-wrapper')) return null;

  const indicator = wrapper.querySelector('.indicator');
  if (!indicator) return null;

  const header = document.createElement('div');
  header.className = 'vxh-nav-header';
  const inner = document.createElement('div');
  inner.className = 'vxh-nav-inner';

  const parent = nav.parentNode;
  parent.insertBefore(header, nav);
  inner.appendChild(nav);
  inner.appendChild(wrapper);
  header.appendChild(inner);

  return { header, nav, wrapper, indicator };
}

/**
 * Nav + indicator w jednym poziomym scrollu; pasek pod kategorią zsynchronizowany z aktywną zakładką.
 */
export function enhanceEmojiPickerNav(pickerEl) {
  const shadow = pickerEl?.shadowRoot;
  if (!shadow) return () => {};

  let style = shadow.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = NAV_SCROLL_CSS;
    shadow.appendChild(style);
  }

  const nav = shadow.querySelector('.nav');
  if (!nav) return () => {};

  const parts = wrapNavAndIndicator(nav);
  if (!parts) return () => {};

  const { header, indicator } = parts;
  const { nav: navEl } = parts;

  const syncAll = () => syncIndicatorToActiveTab(navEl, indicator);

  const onWheel = (event) => {
    if (header.scrollWidth <= header.clientWidth + 1) return;
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (delta === 0) return;
    event.preventDefault();
    header.scrollLeft += delta;
  };

  const onNavClick = (event) => {
    const btn = event.target.closest?.('.nav-button');
    if (!btn || !navEl.contains(btn)) return;
    requestAnimationFrame(() => {
      syncIndicatorToActiveTab(navEl, indicator);
      scrollTabToCenter(header, btn);
    });
  };

  const observer = new MutationObserver(() => {
    requestAnimationFrame(() => {
      syncIndicatorToActiveTab(navEl, indicator);
      const active = getActiveNavTab(navEl);
      if (active) scrollTabToCenter(header, active);
    });
  });

  navEl.querySelectorAll('.nav-button').forEach((btn) => {
    observer.observe(btn, { attributes: true, attributeFilter: ['aria-selected'] });
  });

  const indicatorObserver = new MutationObserver(() => {
    requestAnimationFrame(syncAll);
  });
  indicatorObserver.observe(indicator, { attributes: true, attributeFilter: ['style'] });

  syncAll();
  header.addEventListener('wheel', onWheel, { passive: false });
  navEl.addEventListener('click', onNavClick);

  return () => {
    observer.disconnect();
    indicatorObserver.disconnect();
    header.removeEventListener('wheel', onWheel);
    navEl.removeEventListener('click', onNavClick);
  };
}

export function enhanceEmojiPickerNavWhenReady(pickerEl, { maxAttempts = 40 } = {}) {
  let attempts = 0;
  let cleanup = () => {};
  let cancelled = false;

  const tick = () => {
    if (cancelled) return;
    const nav = pickerEl?.shadowRoot?.querySelector('.nav');
    if (nav) {
      cleanup = enhanceEmojiPickerNav(pickerEl);
      return;
    }
    attempts += 1;
    if (attempts < maxAttempts) {
      requestAnimationFrame(tick);
    }
  };

  tick();

  return () => {
    cancelled = true;
    cleanup();
  };
}
