// public/icons/icon.svg (saydam motif) ve icon-solid.svg (dolgulu) kaynaklarından
// PWA PNG ikonlarını üretir. Çalıştırma: npm run icons
import sharp from "sharp";
import { readFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const iconsDir = path.join(root, "public", "icons");
await mkdir(iconsDir, { recursive: true });

const motif = await readFile(path.join(iconsDir, "icon.svg"));
const solid = await readFile(path.join(iconsDir, "icon-solid.svg"));

// Standart ikonlar: saydam arka plan (Android/manifest "any")
for (const size of [192, 512]) {
  await sharp(motif, { density: 300 })
    .resize(size, size)
    .png()
    .toFile(path.join(iconsDir, `icon-${size}.png`));
}

// Maskable: saydam olamaz — dolgulu sürümden, güvenli alan payıyla
const inner = await sharp(solid, { density: 300 }).resize(400, 400).png().toBuffer();
await sharp({
  create: { width: 512, height: 512, channels: 4, background: "#0f5c52" },
})
  .composite([{ input: inner, left: 56, top: 56 }])
  .png()
  .toFile(path.join(iconsDir, "maskable-512.png"));

// iOS ana ekran ikonu: saydam olamaz — dolgulu sürümden
await sharp(solid, { density: 300 })
  .resize(180, 180)
  .flatten({ background: "#0f5c52" })
  .png()
  .toFile(path.join(iconsDir, "apple-touch-icon.png"));

console.log("İkonlar üretildi: icon-192, icon-512 (saydam), maskable-512, apple-touch-icon");
