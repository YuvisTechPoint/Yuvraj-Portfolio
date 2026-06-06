import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const fileUrl = pathToFileURL(path.join(ROOT, 'index.html')).href;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(fileUrl, { waitUntil: 'networkidle', timeout: 60000 });

await page.locator('.footer-socials a[title="GitHub"]').scrollIntoViewIfNeeded();
await page.waitForTimeout(500);

const link = page.locator('.footer-socials a[title="GitHub"]');
const box = await link.boundingBox();
if (!box) throw new Error('Footer GitHub link not visible');

const x = box.x + box.width / 2;
const y = box.y + box.height / 2;
await page.mouse.move(x, y);
await page.waitForTimeout(500);

const report = await page.evaluate(({ px, py }) => {
    const cursor = document.getElementById('cursor');
    const mirrorPage = cursor?.querySelector('.cursor-mirror-page');
    const footer = document.querySelector('body > footer#site-footer');
    const footerClone = mirrorPage
        ? Array.from(mirrorPage.children).find((node) => node.matches('footer[data-section-theme="footer"]'))
        : null;
    const footerRect = footer?.getBoundingClientRect();

    return {
        touchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        innerWidth: window.innerWidth,
        cursorExists: !!cursor,
        expanded: cursor?.classList.contains('cursor-expanded') ?? false,
        cloneCount: mirrorPage?.children.length ?? 0,
        transform: mirrorPage ? getComputedStyle(mirrorPage).transform : 'none',
        tintDisplay: cursor?.querySelector('.cursor-tint')
            ? getComputedStyle(cursor.querySelector('.cursor-tint')).display
            : null,
        cursorSize: cursor ? { w: cursor.offsetWidth, h: cursor.offsetHeight } : null,
        hoverPoint: { x: px, y: py },
        footerInView: footerRect ? footerRect.top >= 0 && footerRect.top < window.innerHeight : false,
        footerRect: footerRect
            ? { top: footerRect.top, left: footerRect.left, width: footerRect.width, height: footerRect.height }
            : null,
        footerCloneRect: footerClone
            ? {
                top: footerClone.style.top,
                left: footerClone.style.left,
                width: footerClone.style.width,
                height: footerClone.style.height,
            }
            : null,
        footerCloneAligned:
            !!footerClone &&
            !!footerRect &&
            Math.abs(parseFloat(footerClone.style.top) - footerRect.top) < 1 &&
            Math.abs(parseFloat(footerClone.style.left) - footerRect.left) < 1 &&
            Math.abs(parseFloat(footerClone.style.width) - footerRect.width) < 1,
        cloneHasGithubIcon: !!footerClone?.querySelector('.footer-socials a[title="GitHub"] i'),
        zoomMathOk: (() => {
            if (!mirrorPage || !footerRect) return false;
            const matrix = getComputedStyle(mirrorPage).transform;
            if (!matrix || matrix === 'none') return false;
            const scale = 2.1;
            const size = 80;
            const tx = size / 2 - px * scale;
            const ty = size / 2 - py * scale;
            const nums = matrix.match(/-?\d+\.?\d*/g)?.map(Number) ?? [];
            if (nums.length < 6) return false;
            return Math.abs(nums[0] - scale) < 0.01 && Math.abs(nums[3] - scale) < 0.01;
        })(),
    };
}, { px: x, py: y });

report.ok =
    report.cursorExists &&
    report.expanded &&
    report.cloneCount > 0 &&
    report.transform !== 'none' &&
    report.footerCloneAligned &&
    report.cloneHasGithubIcon &&
    report.zoomMathOk &&
    report.tintDisplay === 'none';

console.log(JSON.stringify(report, null, 2));
await browser.close();
process.exit(report.ok ? 0 : 1);
