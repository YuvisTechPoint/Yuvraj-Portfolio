(function () {
    'use strict';

    const SITE_URL = 'https://yuvrajprasad.vercel.app/';
    const SITE_TITLE = 'YUVRAJ PRASAD | AI Product Engineer & Full Stack Developer';

    /* --- Premium boot terminal loader --- */
    const BOOT_LINES = [
        { text: 'KERNEL::init portfolio_core', meta: 'v2026.06.1' },
        { text: 'MOUNT static_assets', meta: 'CSS · JS · images' },
        { text: 'WIRE project_grid + modals', meta: 'deferred IO' },
        { text: 'LOAD consent + stats_gate', meta: 'privacy-first' },
        { text: 'AUTH tech_stack', meta: 'MERN · Python · AI/ML · Web3' },
        { text: 'HANDSHAKE complete', meta: 'Kolkata, IN' },
    ];

    function initBootLoader() {
        const loader = document.getElementById('page-loader');
        if (!loader) return;

        const logEl = document.getElementById('boot-log');
        const progressFill = document.getElementById('boot-progress-fill');
        const progressPct = document.getElementById('boot-progress-pct');
        const progressTrack = loader.querySelector('[role="progressbar"]');
        const statusLine = document.getElementById('boot-status-line');
        const skipBtn = document.getElementById('boot-skip');
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        let dismissed = false;
        let pageReady = document.readyState === 'complete';
        let bootComplete = false;

        function setProgress(pct) {
            const value = Math.min(100, Math.max(0, pct));
            if (progressFill) progressFill.style.width = `${value}%`;
            if (progressPct) progressPct.textContent = `${value}%`;
            if (progressTrack) progressTrack.setAttribute('aria-valuenow', String(value));
        }

        function dismissLoader() {
            if (dismissed) return;
            dismissed = true;
            loader.setAttribute('aria-busy', 'false');
            loader.classList.add('page-loader--hide');
            document.body.classList.remove('boot-loading');
            document.body.classList.add('page-ready');
            setProgress(100);
            if (statusLine) statusLine.innerHTML = 'SYSTEM_ONLINE<span class="boot-cursor" aria-hidden="true">_</span>';
            document.removeEventListener('keydown', onBootKeydown);
            setTimeout(() => loader.remove(), 500);
        }

        function tryDismiss() {
            if (pageReady && bootComplete) dismissLoader();
        }

        skipBtn?.addEventListener('click', dismissLoader);

        const onBootKeydown = (e) => {
            if (dismissed || loader.classList.contains('page-loader--hide')) return;
            if (e.key === 'Escape' || e.key === 'Enter') {
                e.preventDefault();
                dismissLoader();
            }
        };
        document.addEventListener('keydown', onBootKeydown);

        window.addEventListener('load', () => {
            pageReady = true;
            tryDismiss();
        });
        setTimeout(() => {
            pageReady = true;
            tryDismiss();
        }, 5000);

        if (prefersReduced) {
            if (logEl) {
                logEl.innerHTML = BOOT_LINES.map((line) =>
                    `<div class="boot-log__line"><span class="boot-log__prompt">&gt;</span> <span class="boot-log__text">${line.text}</span> <span class="boot-log__meta">[${line.meta}]</span></div>`
                ).join('');
            }
            setProgress(100);
            bootComplete = true;
            tryDismiss();
            return;
        }

        let index = 0;
        const appendLine = () => {
            if (index >= BOOT_LINES.length) {
                bootComplete = true;
                if (statusLine) statusLine.innerHTML = 'READY<span class="boot-cursor" aria-hidden="true">_</span>';
                tryDismiss();
                return;
            }

            const line = BOOT_LINES[index];
            const pct = Math.round(((index + 1) / BOOT_LINES.length) * 100);

            if (logEl) {
                const row = document.createElement('div');
                row.className = 'boot-log__line';
                row.innerHTML = `<span class="boot-log__prompt">&gt;</span> <span class="boot-log__text">${line.text}</span> <span class="boot-log__meta">[${line.meta}]</span>`;
                logEl.appendChild(row);
                if (logEl.children.length > 4) {
                    logEl.removeChild(logEl.firstElementChild);
                }
            }

            setProgress(pct);
            if (statusLine) {
                statusLine.innerHTML = `LOADING ${pct}%<span class="boot-cursor" aria-hidden="true">_</span>`;
            }

            index += 1;
            setTimeout(appendLine, 320 + Math.floor(Math.random() * 140));
        };

        appendLine();
    }

    initBootLoader();

    /* --- Consent-gated third-party charts --- */
    function canLoadConsentMedia() {
        const consent = window.ypGetConsent?.();
        return consent === 'all' || consent === 'essential';
    }

    function loadConsentMedia() {
        if (!canLoadConsentMedia()) return;

        document.querySelectorAll('[data-consent-src]').forEach((el) => {
            const src = el.dataset.consentSrc;
            if (!src || el.dataset.loaded === 'true') return;
            el.dataset.loaded = 'true';
            if (el.tagName === 'IMG') {
                el.src = src;
                el.removeAttribute('data-consent-src');
            } else if (el.tagName === 'IFRAME') {
                el.src = src;
            }
        });
    }

    window.addEventListener('yp-consent-changed', (e) => {
        if (e.detail?.choice === 'all' || e.detail?.choice === 'essential') loadConsentMedia();
    });

    if (canLoadConsentMedia()) loadConsentMedia();

    /* --- Share & copy helpers --- */
    async function copyText(text, toastMsg) {
        let copied = false;
        if (navigator.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(text);
                copied = true;
            } catch {
                // fallback below
            }
        }
        if (!copied) {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.cssText = 'position:fixed;opacity:0;left:-9999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                copied = document.execCommand('copy');
            } catch {
                copied = false;
            }
            document.body.removeChild(textArea);
        }
        if (copied) {
            window.showToast?.(toastMsg || '[ ✓ COPIED ]', 'success');
            return true;
        }
        window.showToast?.('[ ✗ FAILED ] Could not copy', 'error');
        return false;
    }

    window.ypCopySectionLink = async function ypCopySectionLink(sectionId) {
        const id = sectionId || window.location.hash.slice(1) || 'about';
        const url = `${SITE_URL.replace(/\/$/, '')}/#${id}`;
        await copyText(url, `[ ✓ COPIED ] Link to #${id}`);
        window.pushGtmEvent?.('copy_section_link', { section: id });
    };

    window.ypCopyProjectLink = async function ypCopyProjectLink(slug) {
        if (!slug) return;
        const url = `${SITE_URL.replace(/\/$/, '')}/#projects?project=${encodeURIComponent(slug)}`;
        await copyText(url, '[ ✓ COPIED ] Project link copied');
        window.pushGtmEvent?.('copy_project_link', { slug });
    };

    /* --- Keyboard shortcuts panel --- */
    const shortcutsModal = document.getElementById('shortcuts-modal');
    const shortcutsClose = document.getElementById('shortcuts-modal-close');
    let releaseShortcutsTrap = null;

    function openShortcutsModal() {
        if (!shortcutsModal) return;
        shortcutsModal.hidden = false;
        shortcutsModal.classList.add('open');
        document.body.style.overflow = 'hidden';
        releaseShortcutsTrap = window.ypTrapFocus?.(document.getElementById('shortcuts-modal-panel'));
        shortcutsClose?.focus({ preventScroll: true });
    }

    function closeShortcutsModal() {
        if (!shortcutsModal) return;
        shortcutsModal.classList.remove('open');
        shortcutsModal.hidden = true;
        document.body.style.overflow = '';
        releaseShortcutsTrap?.();
        releaseShortcutsTrap = null;
    }

    window.ypOpenShortcuts = openShortcutsModal;
    shortcutsClose?.addEventListener('click', closeShortcutsModal);
    shortcutsModal?.addEventListener('click', (e) => {
        if (e.target === shortcutsModal) closeShortcutsModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
            e.preventDefault();
            shortcutsModal?.classList.contains('open') ? closeShortcutsModal() : openShortcutsModal();
        }
        if (e.key === 'Escape' && shortcutsModal?.classList.contains('open')) closeShortcutsModal();
    });

    document.getElementById('open-shortcuts-btn')?.addEventListener('click', openShortcutsModal);

    /* --- Deep-link project modal --- */
    function openProjectFromHash() {
        const raw = window.location.hash.slice(1);
        if (!raw.startsWith('projects')) return;
        const query = raw.includes('?') ? raw.split('?').slice(1).join('?') : '';
        const slug = new URLSearchParams(query).get('project');
        if (!slug) return;
        window.ensureProjectsGrid?.();
        setTimeout(() => window.openProjectModal?.(decodeURIComponent(slug)), 120);
    }

    window.addEventListener('hashchange', openProjectFromHash);
    window.addEventListener('load', () => setTimeout(openProjectFromHash, 200));

    /* --- Section-aware document title --- */
    const SECTION_TITLES = {
        hero: SITE_TITLE,
        about: 'About | Yuvraj Prasad',
        skills: 'Skills | Yuvraj Prasad',
        experience: 'Experience | Yuvraj Prasad',
        education: 'Education | Yuvraj Prasad',
        'coding-stats': 'Coding Stats | Yuvraj Prasad',
        projects: 'Projects | Yuvraj Prasad',
        achievements: 'Achievements | Yuvraj Prasad',
        'intellectual-property': 'Patent & IP | Yuvraj Prasad',
        reports: 'Wins | Yuvraj Prasad',
        contact: 'Contact | Yuvraj Prasad',
    };

    let titleTick = false;
    function updateDocumentTitle() {
        if (titleTick) return;
        titleTick = true;
        requestAnimationFrame(() => {
            titleTick = false;
            const key = document.body.dataset.activeSection || 'hero';
            document.title = SECTION_TITLES[key] || SITE_TITLE;
        });
    }

    window.addEventListener('scroll', updateDocumentTitle, { passive: true });
    updateDocumentTitle();

    /* --- Build stamp --- */
    const buildEl = document.getElementById('site-build');
    const buildMeta = document.querySelector('meta[name="site-version"]');
    if (buildEl && buildMeta?.content) buildEl.textContent = `BUILD ${buildMeta.content}`;

    /* --- Web Vitals → GTM (analytics consent only) --- */
    function reportWebVitals() {
        if (window.ypGetConsent?.() !== 'all' || !window.dataLayer) return;

        const push = (metric, value) => {
            window.dataLayer.push({ event: 'web_vitals', metric_name: metric, metric_value: Math.round(value) });
        };

        try {
            new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const last = entries[entries.length - 1];
                if (last) push('LCP', last.startTime);
            }).observe({ type: 'largest-contentful-paint', buffered: true });
        } catch { /* unsupported */ }

        try {
            let cls = 0;
            new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    if (!entry.hadRecentInput) cls += entry.value;
                });
            }).observe({ type: 'layout-shift', buffered: true });
            window.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden' && cls > 0) push('CLS', cls * 1000);
            });
        } catch { /* unsupported */ }

        try {
            new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => push('INP', entry.processingStart - entry.startTime));
            }).observe({ type: 'event', buffered: true, durationThreshold: 40 });
        } catch { /* unsupported */ }
    }

    window.addEventListener('yp-consent-changed', (e) => {
        if (e.detail?.choice === 'all') reportWebVitals();
    });
    if (window.ypGetConsent?.() === 'all') reportWebVitals();

    /* --- Service worker (essential / all consent) --- */
    function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) return;
        const consent = window.ypGetConsent?.();
        if (consent === 'decline') return;
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').catch(() => {});
        });
    }

    window.addEventListener('yp-consent-changed', (e) => {
        if (e.detail?.choice !== 'decline') registerServiceWorker();
    });
    if (window.ypGetConsent?.() && window.ypGetConsent() !== 'decline') registerServiceWorker();

})();
