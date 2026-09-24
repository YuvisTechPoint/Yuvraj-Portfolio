import { launchPortfolioPage, preparePortfolioPage } from './test-helpers.mjs';

const { browser, page } = await launchPortfolioPage();
const failures = [];

function assert(name, condition, detail = '') {
    if (!condition) failures.push({ name, detail });
}

try {
    await preparePortfolioPage(page);

    assert('hero visible', await page.locator('#hero h1').isVisible());
    assert('main nav visible', await page.locator('nav[aria-label="Main navigation"]').isVisible());

    await page.locator('#main-nav-bar a[data-nav="projects"]').click();
    await page.waitForTimeout(400);
    const projectCount = await page.locator('#projects-grid article').count();
    assert('projects grid renders', projectCount >= 16, `found ${projectCount}`);

    await page.evaluate(() => window.openProjectModal?.('oracle-community'));
    await page.waitForTimeout(200);
    assert('project modal opens', await page.locator('#project-modal.open').isVisible());

    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    assert('project modal closes', !(await page.locator('#project-modal.open').isVisible()));

    await page.locator('#hero-preview-cv').click();
    await page.waitForTimeout(300);
    const frameSrc = await page.locator('#cv-modal-frame').getAttribute('src');
    assert('cv modal opens', await page.locator('#cv-modal.open').isVisible());
    assert('cv frame targets resume', (frameSrc || '').includes('Yuvraj'), frameSrc || '');
    await page.keyboard.press('Escape');

    await page.locator('#contact-form').evaluate((form) => form.scrollIntoView({ block: 'center' }));
    await page.fill('#contact-name', '');
    await page.fill('#contact-email', '');
    await page.fill('#contact-message', '');
    await page.locator('#transmit-btn').click();
    await page.waitForTimeout(200);
    const formError = await page.locator('#form-status').textContent();
    assert('contact validation blocks empty submit', (formError || '').toLowerCase().includes('fill'));

    await page.fill('#contact-name', 'Test User');
    await page.fill('#contact-email', 'not-an-email');
    await page.fill('#contact-message', 'Hello from e2e test');
    await page.locator('#transmit-btn').click();
    await page.waitForTimeout(200);
    const emailError = await page.locator('#form-status').textContent();
    assert('contact validation rejects bad email', (emailError || '').toLowerCase().includes('email'));

    await page.locator('#open-command-palette-btn').click();
    await page.waitForTimeout(150);
    assert('command palette opens', await page.locator('#command-palette.open').isVisible());
    await page.keyboard.press('Escape');

    const hash = await page.evaluate(() => {
        window.location.hash = '#projects?project=oracle-community';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        return window.location.hash;
    });
    assert('project deep link hash set', hash.includes('oracle-community'), hash);
    await page.waitForTimeout(400);
    assert('project deep link opens modal', await page.locator('#project-modal.open').isVisible());
} finally {
    await browser.close();
}

if (failures.length) {
    console.error('E2E failures:');
    failures.forEach((f) => console.error(`  - ${f.name}${f.detail ? `: ${f.detail}` : ''}`));
    process.exit(1);
}

console.log('E2E smoke tests passed.');
