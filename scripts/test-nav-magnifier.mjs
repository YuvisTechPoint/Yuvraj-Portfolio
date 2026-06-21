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

const logo = page.locator('nav[aria-label="Main navigation"] .nav-logo');
const box = await logo.boundingBox();
if (!box) throw new Error('Nav logo not found');

const x = box.x + box.width / 2;
const y = box.y + box.height / 2;
await page.mouse.move(x, y);
await page.waitForTimeout(200);

const report = await page.evaluate(({ px, py }) => {
    const cursor = document.getElementById('cursor');

    return {
        hoverPoint: { x: px, y: py },
        expanded: cursor?.classList.contains('cursor-expanded') ?? false,
        visibility: cursor ? getComputedStyle(cursor).visibility : null,
        transform: cursor ? getComputedStyle(cursor).transform : 'none',
        hasMirrorPage: !!cursor?.querySelector('.cursor-mirror-page'),
    };
}, { px: x, py: y });

report.ok =
    report.expanded &&
    report.visibility === 'visible' &&
    report.hasMirrorPage;

console.log(JSON.stringify(report, null, 2));
await browser.close();
process.exit(report.ok ? 0 : 1);
