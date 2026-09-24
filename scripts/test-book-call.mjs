import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on('console', (m) => {
    if (m.type() === 'error') console.log('CONSOLE', m.text());
});
await page.goto('http://127.0.0.1:8765/', { waitUntil: 'networkidle' });

await page.locator('#book-call-open').scrollIntoViewIfNeeded();
await page.locator('#book-call-open').click();
await page.waitForSelector('#book-call-modal.open', { timeout: 5000 });

const tomorrow = new Date(Date.now() + 86400000);
const date = tomorrow.toISOString().slice(0, 10);

await page.fill('#book-name', 'Test User');
await page.fill('#book-email', 'test@example.com');
await page.fill('#book-phone', '+91 9876543210');
await page.fill('#book-date', date);
await page.fill('#book-time', '15:30');
await page.fill('#book-topic', 'Portfolio review session');
await page.click('#book-continue-btn');
await page.waitForSelector('#book-call-step-pay:not([hidden])', { timeout: 15000 });
await page.waitForTimeout(800);

const upiHref = await page.locator('#book-open-upi').getAttribute('href');
const ref = await page.locator('#book-ref-label').textContent();
const qrInfo = await page.evaluate(() => {
    const host = document.getElementById('book-call-qr');
    return {
        hasImg: !!host?.querySelector('img'),
        hasCanvas: !!host?.querySelector('canvas'),
        childCount: host?.children?.length || 0,
        hasQRCode: typeof window.QRCode === 'function',
    };
});

console.log(JSON.stringify({
    upiHref,
    ref,
    qrInfo,
    hasPa: upiHref?.includes('prasadyuvraj8805-5@okicici'),
    hasAm: upiHref?.includes('am=10.00'),
    startsUpi: upiHref?.startsWith('upi://pay?'),
}, null, 2));

await browser.close();
