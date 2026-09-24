import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import path from 'path';

export const ROOT = path.resolve(import.meta.dirname, '..');
export const FILE_URL = pathToFileURL(path.join(ROOT, 'index.html')).href;

export async function launchPortfolioPage(viewport = { width: 1280, height: 900 }) {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport });
    await page.goto(FILE_URL, { waitUntil: 'networkidle', timeout: 60000 });
    return { browser, page };
}

export async function dismissBootLoader(page) {
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.body.classList.contains('boot-loading'), { timeout: 10000 });
}

export async function acceptEssentialConsent(page) {
    const banner = page.locator('#cookie-consent');
    const visible = await banner.evaluate((el) => el.classList.contains('is-visible'));
    if (visible) {
        await page.locator('[data-consent="essential"]').click();
        await page.waitForFunction(() => !document.getElementById('cookie-consent')?.classList.contains('is-visible'), { timeout: 5000 });
    }
}

export async function preparePortfolioPage(page) {
    await dismissBootLoader(page);
    await acceptEssentialConsent(page);
}
