(function () {
    const CV_FILE = 'Yuvraj Prasad CV.pdf';
    const CV_RELATIVE_PATH = 'Assets/Resume/Yuvraj%20Prasad%20CV.pdf';
    const CV_VIEWER_PATH = 'Assets/cv-viewer.html';

    function getCacheBust() {
        return document.querySelector('meta[name="site-version"]')?.content || String(Date.now());
    }

    function getPdfUrl() {
        const url = new URL(CV_RELATIVE_PATH, window.location.href);
        url.searchParams.set('v', getCacheBust());
        return url.href;
    }

    function getViewerUrl() {
        // Pass a same-origin relative PDF path (avoid double-encoding absolute URLs).
        const viewer = new URL(CV_VIEWER_PATH, window.location.href);
        viewer.searchParams.set('src', `/${CV_RELATIVE_PATH}`);
        viewer.searchParams.set('v', getCacheBust());
        return viewer.href;
    }

    window.YP_CV_CONFIG = {
        fileName: CV_FILE,
        relativePath: CV_RELATIVE_PATH,
        getPdfUrl,
        getViewerUrl,
    };

    function wireCvDownloadLinks() {
        const pdfUrl = getPdfUrl();
        document.querySelectorAll('[data-cv-download]').forEach((link) => {
            link.setAttribute('href', pdfUrl);
            link.setAttribute('download', CV_FILE);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', wireCvDownloadLinks, { once: true });
    } else {
        wireCvDownloadLinks();
    }
})();
