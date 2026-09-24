import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PORT = 8765;
const BASE = `http://127.0.0.1:${PORT}`;

function startServer() {
    return new Promise((resolve, reject) => {
        const proc = spawn('npx', ['--yes', 'serve', '.', '-p', String(PORT)], {
            cwd: ROOT,
            shell: true,
            stdio: 'ignore',
        });
        proc.on('error', reject);
        setTimeout(() => resolve(proc), 2500);
    });
}

const server = await startServer();

try {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 });

    const previewSrc = await page.evaluate(() => ({
        pdfUrl: window.YP_CV_CONFIG?.getPdfUrl?.() || '',
        previewSrc: window.YP_CV_CONFIG?.getViewerUrl?.() || '',
    }));

    await page.click('#hero-preview-cv');
    await page.waitForTimeout(8000);

    const modalState = await page.evaluate(() => {
        const frame = document.getElementById('cv-modal-frame');
        return {
            modalOpen: document.getElementById('cv-modal')?.classList.contains('open'),
            frameSrc: frame?.src || '',
            loadingHidden: document.getElementById('cv-modal-loading')?.classList.contains('hidden'),
        };
    });

    let frameRendered = false;
    if (modalState.frameSrc.includes('cv-viewer.html')) {
        const frame = page.frameLocator('#cv-modal-frame');
        frameRendered = await frame.locator('#canvas').evaluate((canvas) => {
            if (!canvas || canvas.hidden || canvas.width < 10 || canvas.height < 10) return false;
            const ctx = canvas.getContext('2d');
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            for (let i = 0; i < data.length; i += 16) {
                if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) return true;
            }
            return false;
        }).catch(() => false);

        if (!frameRendered) {
            frameRendered = await frame.locator('#pdf-object, #pdf-embed').evaluate((node) => {
                if (!node || node.hidden) return false;
                const src = node.getAttribute('data') || node.getAttribute('src') || '';
                return src.toLowerCase().includes('.pdf');
            }).catch(() => false);
        }
    }

    const ok =
        previewSrc.previewSrc.includes('cv-viewer.html') &&
        previewSrc.previewSrc.includes('Yuvraj') &&
        modalState.modalOpen &&
        modalState.frameSrc.includes('cv-viewer.html') &&
        frameRendered;

    console.log(JSON.stringify({ previewSrc, modalState, frameRendered, ok }, null, 2));
    await browser.close();
    process.exit(ok ? 0 : 1);
} finally {
    server.kill('SIGTERM');
}
