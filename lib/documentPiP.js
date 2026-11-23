export function isDocumentPiPSupported() {
  return typeof window !== 'undefined' && 'documentPictureInPicture' in window;
}

export function copyStylesToWindow(targetWindow) {
  const doc = targetWindow.document;
  const seen = new Set();

  const appendStyleText = (text) => {
    const trimmed = text?.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    const style = doc.createElement('style');
    style.textContent = trimmed;
    doc.head.appendChild(style);
  };

  [...document.querySelectorAll('link[rel="stylesheet"]')].forEach((node) => {
    if (!node.href || seen.has(node.href)) return;
    seen.add(node.href);
    const link = doc.createElement('link');
    link.rel = 'stylesheet';
    link.href = node.href;
    if (node.media) link.media = node.media;
    doc.head.appendChild(link);
  });

  [...document.querySelectorAll('style')].forEach((node) => {
    appendStyleText(node.textContent);
  });

  [...document.styleSheets].forEach((sheet) => {
    try {
      if (!sheet.cssRules) return;
      const rules = [...sheet.cssRules].map((rule) => rule.cssText).join('\n');
      appendStyleText(rules);
    } catch {
      /* cross-origin stylesheet */
    }
  });

  const base = doc.createElement('style');
  base.textContent = `
    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #0f0f14;
      color: #f1f5f9;
      font-family: var(--font, system-ui, -apple-system, sans-serif);
      --bg-composer: rgba(20, 20, 28, 0.96);
      --bg-input: rgba(15, 15, 20, 0.6);
      --border: rgba(255, 255, 255, 0.08);
    }
    html {
      height: 100%;
    }
    body {
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    #pip-root {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
  `;
  doc.head.appendChild(base);
}

export async function requestDocumentPiPWindow({ width = 380, height = 540 } = {}) {
  if (!isDocumentPiPSupported()) {
    throw new Error('Picture-in-Picture nie jest obsługiwane w tej przeglądarce (Chrome/Edge 116+).');
  }

  if (window.documentPictureInPicture.window) {
    return window.documentPictureInPicture.window;
  }

  return window.documentPictureInPicture.requestWindow({ width, height });
}
