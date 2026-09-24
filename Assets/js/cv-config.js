(function () {
    const CV_FILE = 'Yuvraj Prasad CV.pdf';
    const CV_RELATIVE_PATH = 'Assets/Resume/Yuvraj%20Prasad%20CV.pdf';

    function getCacheBust() {
        return document.querySelector('meta[name="site-version"]')?.content || '';
    }

    function getPdfUrl() {
        const url = new URL(CV_RELATIVE_PATH, window.location.href);
        const version = getCacheBust();
        if (version) url.searchParams.set('v', version);
        return url.href;
    }

    function getViewerUrl() {
        const viewer = new URL('Assets/cv-viewer.html', window.location.href);
        viewer.searchParams.set('src', getPdfUrl());
        const version = getCacheBust();
        if (version) viewer.searchParams.set('v', version);
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
