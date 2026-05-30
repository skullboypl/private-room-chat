/**
 * Rasterize app-icon SVG → PNG for iOS/Android PWA (SVG alone looks blurry on iPhone).
 * Run: node scripts/generate-pwa-icons.mjs
 */
import { readFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const iconsDir = join(root, 'public', 'icons');
mkdirSync(iconsDir, { recursive: true });

const appIcon = readFileSync(join(root, 'public', 'app-icon.svg'));
const maskableIcon = readFileSync(join(root, 'public', 'app-icon-maskable.svg'));

const sizes = [180, 192, 512];

for (const size of sizes) {
  const png = await sharp(appIcon).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
  await sharp(png).toFile(join(iconsDir, `icon-${size}.png`));
  if (size === 180) {
    await sharp(png).toFile(join(root, 'public', 'apple-touch-icon.png'));
  }
}

await sharp(maskableIcon)
  .resize(512, 512)
  .png({ compressionLevel: 9 })
  .toFile(join(iconsDir, 'icon-maskable-512.png'));

console.log('Generated PWA icons in public/icons/ and public/apple-touch-icon.png');
