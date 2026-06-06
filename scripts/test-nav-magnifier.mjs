import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const fileUrl = pathToFileURL(path.join(ROOT, 'index.html')).href;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(fileUrl, { waitUntil: 'networkidle', timeout: 60000 });

const logo = page.locator('nav[aria-label="Main navigation"] .nav-logo');
const box = await logo.boundingBox();
if (!box) throw new Error('Nav logo not found');

const x = box.x + box.width / 2;
const y = box.y + box.height / 2;
await page.mouse.move(x, y);
await page.waitForTimeout(500);

const report = await page.evaluate(({ px, py }) => {
    const mainNav = document.querySelector('nav[aria-label="Main navigation"]');
    const rail = document.getElementById('section-rail');
    const mirrorPage = document.getElementById('cursor')?.querySelector('.cursor-mirror-page');
    const navClones = mirrorPage ? Array.from(mirrorPage.children).filter((n) => n.tagName === 'NAV') : [];
    const mainNavRect = mainNav?.getBoundingClientRect();

    return {
        hoverPoint: { x: px, y: py },
        mainNavRect: mainNavRect
            ? { top: mainNavRect.top, left: mainNavRect.left, width: mainNavRect.width, height: mainNavRect.height }
            : null,
        railRect: rail?.getBoundingClientRect(),
        navCloneCount: navClones.length,
        navClones: navClones.map((clone, index) => {
            const mainNavClone = clone.querySelector('.nav-logo');
            const railClone = clone.querySelector('.section-rail-dot');
            return {
                index,
                isMainNav: !!mainNavClone,
                isSectionRail: !!railClone,
                top: clone.style.top,
                left: clone.style.left,
                width: clone.style.width,
                height: clone.style.height,
                logoText: mainNavClone?.textContent?.trim() ?? null,
            };
        }),
        mirrorStack: (() => {
            const layers = mirrorPage ? Array.from(mirrorPage.children) : [];
            const mainNavClone = layers.find((node) => node.querySelector('.nav-logo'));
            const mainClone = layers.find((node) => node.tagName === 'MAIN');
            return {
                navZ: mainNavClone ? parseInt(mainNavClone.style.zIndex, 10) : null,
                mainZ: mainClone ? parseInt(mainClone.style.zIndex, 10) : null,
                navAboveMain:
                    !!mainNavClone &&
                    !!mainClone &&
                    parseInt(mainNavClone.style.zIndex, 10) > parseInt(mainClone.style.zIndex, 10),
            };
        })(),
        expanded: document.getElementById('cursor')?.classList.contains('cursor-expanded') ?? false,
    };
}, { px: x, py: y });

report.ok =
    report.expanded &&
    report.navClones.some((c) => c.isMainNav) &&
    report.mirrorStack.navAboveMain;

console.log(JSON.stringify(report, null, 2));
await browser.close();
process.exit(report.ok ? 0 : 1);
