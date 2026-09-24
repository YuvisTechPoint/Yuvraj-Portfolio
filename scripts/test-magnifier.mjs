import { launchPortfolioPage, preparePortfolioPage } from './test-helpers.mjs';

const { browser, page } = await launchPortfolioPage();
await preparePortfolioPage(page);

const target = page.locator('#hero-share-btn');
await target.scrollIntoViewIfNeeded();
const box = await target.boundingBox();
if (!box) throw new Error('Hero share button not visible');

const x = box.x + box.width / 2;
const y = box.y + box.height / 2;
await page.mouse.move(x, y);
await page.waitForTimeout(450);

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
    report.cursorSize?.w >= 68;

console.log(JSON.stringify(report, null, 2));
await browser.close();
process.exit(report.ok ? 0 : 1);
