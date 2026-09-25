/**
 * Prepare Vercel static output in /public (api/ stays at repo root).
 * Run: node scripts/vercel-prepare-public.mjs
 */
import { cpSync, mkdirSync, rmSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');

const COPY = [
    'index.html',
    '404.html',
    'privacy.html',
    'sw.js',
    'site.webmanifest',
    'robots.txt',
    'sitemap.xml',
    'Assets',
];

if (existsSync(pub)) {
    rmSync(pub, { recursive: true, force: true });
}
mkdirSync(pub, { recursive: true });

for (const name of COPY) {
    const src = join(root, name);
    if (!existsSync(src)) {
        console.warn('Skip missing:', name);
        continue;
    }
    cpSync(src, join(pub, name), { recursive: true });
    const info = statSync(src);
    console.log('Copied:', name, info.isDirectory() ? `(dir, ${readdirSync(src).length} entries)` : '');
}

console.log('Vercel public/ ready.');
