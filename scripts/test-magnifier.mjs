import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const fileUrl = pathToFileURL(path.join(ROOT, 'index.html')).href;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(fileUrl, { waitUntil: 'networkidle', timeout: 60000 });

await page.keyboard.press('Escape');
await page.waitForFunction(() => !document.body.classList.contains('boot-loading'), { timeout: 10000 });

await page.locator('.footer-socials a[title="GitHub"]').scrollIntoViewIfNeeded();
await page.waitForTimeout(200);

const link = page.locator('.footer-socials a[title="GitHub"]');
const box = await link.boundingBox();
if (!box) throw new Error('Footer GitHub link not visible');

const x = box.x + box.width / 2;
const y = box.y + box.height / 2;
await page.mouse.move(x, y);
await page.waitForTimeout(200);

const report = await page.evaluate(({ px, py }) => {
    const cursor = document.getElementById('cursor');

    return {
        cursorExists: !!cursor,
        bootLoading: document.body.classList.contains('boot-loading'),
        expanded: cursor?.classList.contains('cursor-expanded') ?? false,
        visibility: cursor ? getComputedStyle(cursor).visibility : null,
        cursorSize: cursor ? { w: cursor.offsetWidth, h: cursor.offsetHeight } : null,
        hoverPoint: { x: px, y: py },
        hasMirrorPage: !!cursor?.querySelector('.cursor-mirror-page'),
    };
}, { px: x, py: y });

report.ok =
    report.cursorExists &&
    !report.bootLoading &&
    report.expanded &&
    report.visibility === 'visible' &&
    report.hasMirrorPage &&
    report.cursorSize?.w >= 72;

console.log(JSON.stringify(report, null, 2));
await browser.close();
process.exit(report.ok ? 0 : 1);
