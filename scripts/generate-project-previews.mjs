/**
 * Generate static preview images for Selected Works cards.
 * Run: node scripts/generate-project-previews.mjs
 */
import sharp from 'sharp';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, 'Assets', 'images', 'previews');

const PREVIEWS = [
    { slug: 'oracle-community', url: 'https://oraclekol.vercel.app/' },
    { slug: 'edquate', url: 'https://edquate.com/' },
    { slug: 'escrowx', url: 'https://escrowx-swart.vercel.app/' },
    { slug: 'orcrys', url: 'https://orcrys.com/' },
    { slug: 'vive-music', url: 'https://vibemusic-official.vercel.app/' },
    { slug: 'mohasti', url: 'https://mohasti.vercel.app/' },
    { slug: 'moon-watch', url: 'https://moonwatch.in/' },
    { slug: 'calcutta-hacks', url: 'https://calcuttahacks.xyz/' },
    { slug: 'beetlex', url: 'https://beetlex.vercel.app/' },
    { slug: 'qualytics', url: 'https://qualytics-iota.vercel.app/' },
    { slug: 'jurisbloom-associates', url: 'https://jurisbloomassociates.in/' },
    { slug: 'ceo-debanjan', url: 'https://ceodebanjan.vercel.app/' },
    { slug: 'civictrust', url: 'https://opengraph.githubassets.com/1/YuvisTechPoint/CivicTrust' },
    { slug: 'fortifind', url: 'https://opengraph.githubassets.com/1/YuvisTechPoint/Vulnerability-scanner' },
    { slug: 'skillhive', url: 'https://opengraph.githubassets.com/1/YuvisTechPoint/SkillHive' },
    { slug: 'e-signature', url: 'https://opengraph.githubassets.com/1/YuvisTechPoint/E-Signature' },
];

async function microlinkScreenshot(url) {
    const api = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false`;
    const res = await fetch(api, { signal: AbortSignal.timeout(90000) });
    if (!res.ok) throw new Error(`Microlink HTTP ${res.status} for ${url}`);
    const json = await res.json();
    const shotUrl = json?.data?.screenshot?.url;
    if (!shotUrl) throw new Error(`No screenshot URL for ${url}`);
    const imgRes = await fetch(shotUrl, { signal: AbortSignal.timeout(60000) });
    if (!imgRes.ok) throw new Error(`Screenshot download HTTP ${imgRes.status}`);
    return Buffer.from(await imgRes.arrayBuffer());
}

async function fetchImage(url) {
    if (url.includes('opengraph.githubassets.com')) {
        const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
        return Buffer.from(await res.arrayBuffer());
    }
    return microlinkScreenshot(url);
}

async function savePreview(slug, buffer) {
    const webpPath = join(outDir, `${slug}.webp`);
    const webp = await sharp(buffer)
        .resize(1280, 800, { fit: 'cover', position: 'top' })
        .webp({ quality: 82 })
        .toBuffer();
    await writeFile(webpPath, webp);
    return `Assets/images/previews/${slug}.webp`;
}

await mkdir(outDir, { recursive: true });

const results = [];
for (const item of PREVIEWS) {
    const webpPath = join(outDir, `${item.slug}.webp`);
    try {
        process.stdout.write(`Generating ${item.slug}… `);
        const buffer = await fetchImage(item.url);
        const rel = await savePreview(item.slug, buffer);
        results.push({ slug: item.slug, path: rel, ok: true });
        console.log('ok');
    } catch (err) {
        if (existsSync(webpPath)) {
            results.push({ slug: item.slug, path: `Assets/images/previews/${item.slug}.webp`, ok: true, cached: true });
            console.log('skipped (existing)');
        } else {
            results.push({ slug: item.slug, ok: false, error: err.message });
            console.log(`failed (${err.message})`);
        }
    }
}

console.log(JSON.stringify(results, null, 2));
