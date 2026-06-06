import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const fileUrl = pathToFileURL(path.join(ROOT, 'index.html')).href;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(fileUrl, { waitUntil: 'networkidle', timeout: 60000 });

const previewSrc = await page.evaluate(() => {
    const CV_PDF_PATH = 'Assets/Resume/Yuvraj%20Prasad%20CV.pdf';
    const pdfUrl = new URL(CV_PDF_PATH, window.location.href).href;
    return {
        protocol: window.location.protocol,
        pdfUrl,
        previewSrc: window.location.protocol === 'file:' ? pdfUrl : (() => {
            const viewer = new URL('Assets/cv-viewer.html', window.location.href);
            viewer.searchParams.set('src', pdfUrl);
            return viewer.href;
        })(),
    };
});

await page.click('#hero-preview-cv');
await page.waitForTimeout(1500);

const modalState = await page.evaluate(() => {
    const frame = document.getElementById('cv-modal-frame');
    return {
        modalOpen: document.getElementById('cv-modal')?.classList.contains('open'),
        frameSrc: frame?.src || '',
        loadingHidden: document.getElementById('cv-modal-loading')?.classList.contains('hidden'),
    };
});

const ok =
    previewSrc.protocol === 'file:' &&
    previewSrc.previewSrc.includes('Yuvraj') &&
    !previewSrc.previewSrc.includes('yuvrajprasad.vercel.app') &&
    modalState.modalOpen &&
    modalState.frameSrc.includes('Yuvraj') &&
    !modalState.frameSrc.includes('yuvrajprasad.vercel.app');

console.log(JSON.stringify({ previewSrc, modalState, ok }, null, 2));
await browser.close();
process.exit(ok ? 0 : 1);
