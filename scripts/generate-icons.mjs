// public/icons/icon.svg kaynağından PWA PNG ikonlarını üretir.
// Çalıştırma: npm run icons
import sharp from "sharp";
import { readFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const iconsDir = path.join(root, "public", "icons");
const svg = await readFile(path.join(iconsDir, "icon.svg"));

await mkdir(iconsDir, { recursive: true });

// Standart ikonlar
for (const size of [192, 512]) {
  await sharp(svg, { density: 300 })
    .resize(size, size)
    .png()
    .toFile(path.join(iconsDir, `icon-${size}.png`));
}

// Maskable: güvenli alan için %78 ölçek + arka plan dolgusu
const inner = await sharp(svg, { density: 300 }).resize(400, 400).png().toBuffer();
await sharp({
  create: { width: 512, height: 512, channels: 4, background: "#0f5c52" },
})
  .composite([{ input: inner, left: 56, top: 56 }])
  .png()
  .toFile(path.join(iconsDir, "maskable-512.png"));

// iOS ana ekran ikonu
await sharp(svg, { density: 300 })
  .resize(180, 180)
  .flatten({ background: "#0f5c52" })
  .png()
  .toFile(path.join(iconsDir, "apple-touch-icon.png"));

console.log("İkonlar üretildi: icon-192, icon-512, maskable-512, apple-touch-icon");
