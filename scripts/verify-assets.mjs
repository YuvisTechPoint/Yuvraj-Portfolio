/**
 * Verify required static assets exist before deploy.
 * Run: node scripts/verify-assets.mjs
 */
import { existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const required = [
    'index.html',
    '404.html',
    'privacy.html',
    'site.webmanifest',
    'vercel.json',
    'Assets/css/main.css',
    'Assets/js/main.js',
    'Assets/js/premium.js',
    'sw.js',
    'Assets/js/projects-data.js',
    'Assets/cv-viewer.html',
    'Assets/images/title_icon.png',
    'Assets/images/og-banner.jpg',
    'Assets/images/Yuvraj image.webp',
    'Assets/Resume/Yuvraj Prasad CV.pdf',
    'api/contact.js',
];

const missing = required.filter((rel) => !existsSync(join(root, rel)));

const previewsDir = join(root, 'Assets', 'images', 'previews');
const previewCount = existsSync(previewsDir) ? readdirSync(previewsDir).filter((f) => f.endsWith('.webp')).length : 0;
if (previewCount < 16) {
    console.error(`Expected at least 16 project preview images, found ${previewCount}. Run: npm run generate:previews`);
    process.exit(1);
}

if (missing.length) {
    console.error('Missing required assets:');
    missing.forEach((file) => console.error('  -', file));
    process.exit(1);
}

console.log(`Verified ${required.length} required assets.`);
