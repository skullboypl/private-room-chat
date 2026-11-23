/** ~85 KB po base64 — cel „czytelny, ale lekki” */
const TARGET_BASE64_LEN = 115_000;
/** ~130 KB — twardy limit po wszystkich próbach */
export const MAX_BASE64_LEN = 175_000;
const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const INITIAL_MAX_DIMENSION = 720;
const MIN_MAX_DIMENSION = 240;
const MIN_JPEG_QUALITY = 0.28;
const BASE64_RE = /^[A-Za-z0-9+/]+=*$/;
const ALLOWED_INPUT_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Nie udało się wczytać obrazu'));
    img.src = dataUrl;
  });
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Dozwolone są tylko obrazy'));
      return;
    }

    if (file.size > MAX_INPUT_BYTES) {
      reject(new Error('Plik jest za duży (max 20 MB przed kompresją)'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Nie udało się wczytać obrazu'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Nie udało się odczytać pliku'));
    reader.readAsDataURL(file);
  });
}

function encodeJpeg(canvas, quality) {
  return canvas.toDataURL('image/jpeg', quality).split(',')[1];
}

function drawScaledImage(canvas, img, maxDimension) {
  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
}

function compressImage(img) {
  const canvas = document.createElement('canvas');
  let maxDimension = INITIAL_MAX_DIMENSION;
  let quality = 0.72;
  let best = null;

  for (let attempt = 0; attempt < 16; attempt += 1) {
    drawScaledImage(canvas, img, maxDimension);
    const base64 = encodeJpeg(canvas, quality);

    if (!best || base64.length < best.data.length) {
      best = { mime: 'image/jpeg', data: base64 };
    }

    if (base64.length <= TARGET_BASE64_LEN) {
      return { mime: 'image/jpeg', data: base64 };
    }

    if (quality > MIN_JPEG_QUALITY + 0.05) {
      quality = Math.max(MIN_JPEG_QUALITY, quality - 0.1);
    } else if (maxDimension > MIN_MAX_DIMENSION) {
      maxDimension = Math.max(MIN_MAX_DIMENSION, Math.round(maxDimension * 0.78));
      quality = 0.62;
    } else {
      break;
    }
  }

  if (best && best.data.length <= MAX_BASE64_LEN) {
    return best;
  }

  throw new Error('Nie udało się skompresować obrazu do bezpiecznego rozmiaru');
}

export async function readImageAsBase64(file) {
  const img = await loadImageFromFile(file);

  try {
    return compressImage(img);
  } catch (err) {
    if (err?.message?.includes('skompresować')) throw err;
    throw new Error('Nie udało się przetworzyć obrazu');
  }
}

/** Walidacja + re-enkodowanie obrazu z sieci (usuwa polyglot/EXIF/nie-obraz) */
export async function sanitizeImageBase64(data, mime = 'image/jpeg') {
  if (!data || typeof data !== 'string') {
    throw new Error('Brak danych obrazu');
  }
  if (data.length > MAX_BASE64_LEN) {
    throw new Error('Obraz za duży');
  }
  if (!BASE64_RE.test(data)) {
    throw new Error('Nieprawidłowy format obrazu');
  }

  const safeMime = ALLOWED_INPUT_MIMES.has(mime) ? mime : 'image/jpeg';
  const img = await loadImageFromDataUrl(`data:${safeMime};base64,${data}`);
  return compressImage(img);
}

export function generateMessageId() {
  return crypto.randomUUID();
}
