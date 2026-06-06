/**
 * Generate 1200x630 OG banner for social previews.
 * Run: node scripts/generate-og-banner.mjs
 */
import sharp from 'sharp';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const imagesDir = join(__dirname, '..', 'Assets', 'images');
const photoPath = join(imagesDir, 'Yuvraj image.jpeg');
const outPath = join(imagesDir, 'og-banner.jpg');

const width = 1200;
const height = 630;

const photoExists = existsSync(photoPath);
let photoBuffer = null;
if (photoExists) {
  photoBuffer = await sharp(photoPath)
    .resize(420, 520, { fit: 'cover', position: 'top' })
    .jpeg({ quality: 90 })
    .toBuffer();
}

const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#121212"/>
  <rect x="48" y="48" width="504" height="534" fill="#FFFDF5" stroke="#121212" stroke-width="8"/>
  <rect x="600" y="120" width="552" height="12" fill="#33FF57"/>
  <text x="600" y="200" font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="900" fill="#FFFFFF">YUVRAJ PRASAD</text>
  <text x="600" y="270" font-family="Arial, Helvetica, sans-serif" font-size="32" font-weight="700" fill="#33FF57">Full Stack Developer</text>
  <text x="600" y="340" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="#CCCCCC">AI Product Engineer @ Mewayz</text>
  <text x="600" y="410" font-family="Arial, Helvetica, sans-serif" font-size="26" fill="#FFFFFF">10+ hackathon wins · 1 patent · Kolkata</text>
  <text x="600" y="470" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#AAAAAA">MERN · Python · AI/ML · Web3</text>
  <rect x="600" y="510" width="220" height="56" fill="#33FF57" stroke="#121212" stroke-width="4"/>
  <text x="620" y="548" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="800" fill="#121212">OPEN FOR WORK</text>
</svg>`;

const base = sharp(Buffer.from(svg)).jpeg({ quality: 92 });

if (photoBuffer) {
  await base
    .composite([{ input: photoBuffer, left: 68, top: 68 }])
    .toFile(outPath);
} else {
  await base.toFile(outPath);
}

console.log('Created:', outPath);
