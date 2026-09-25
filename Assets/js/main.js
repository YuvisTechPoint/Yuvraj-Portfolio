(function () {
    'use strict';

    if (window.renderProjectsGrid) scheduleProjectsGrid();

    function ensureProjectsGrid() {
        const grid = document.getElementById('projects-grid');
        if (!grid || grid.dataset.dynamic !== 'true' || grid.dataset.rendered === 'true') return;
        grid.dataset.rendered = 'true';
        window.renderProjectsGrid?.();
    }

    window.ensureProjectsGrid = ensureProjectsGrid;

    function scheduleProjectsGrid() {
        const grid = document.getElementById('projects-grid');
        if (!grid || grid.dataset.dynamic !== 'true' || grid.dataset.rendered === 'true') return;

        if (window.location.hash.slice(1) === 'projects') {
            ensureProjectsGrid();
            return;
        }

        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                if (!entries[0]?.isIntersecting) return;
                observer.disconnect();
                ensureProjectsGrid();
            }, { rootMargin: '480px', threshold: 0.01 });
            observer.observe(grid);
            return;
        }

        ensureProjectsGrid();
    }

    const GITHUB_USERNAME = 'YuvisTechPoint';
    const GH_CACHE_KEY = `gh_user_cache_v1:${GITHUB_USERNAME}`;
    const LEETCODE_USERNAME = 'YuvisTechPoint';
    const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
    const CONSENT_KEY = 'yp_site_consent_v1';
    let cacheConsent = null;

    function getStoredConsent() {
        try {
            const value = localStorage.getItem(CONSENT_KEY);
            if (value === 'all' || value === 'essential' || value === 'decline') return value;
        } catch {
            // storage disabled
        }
        return null;
    }

    function canUseLocalCache() {
        return cacheConsent === 'all' || cacheConsent === 'essential';
    }

    function clearStatsCache() {
        try {
            Object.keys(localStorage).forEach((key) => {
                if (key.startsWith('gh_user_cache_') || key.startsWith('gh_stats_cache_')
                    || key.startsWith('lc_badges_cache_') || key.startsWith('lc_stats_cache_')) {
                    localStorage.removeItem(key);
                }
            });
        } catch {
            // ignore
        }
    }

    function readCache(key) {
        if (!canUseLocalCache()) return null;
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return null;
            if (typeof parsed.ts !== 'number' || !parsed.data) return null;
            return parsed;
        } catch {
            return null;
        }
    }

    function writeCache(key, data) {
        if (!canUseLocalCache()) return;
        try {
            localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
        } catch {
            // ignore quota / disabled storage
        }
    }

    window.ypReadCache = readCache;
    window.ypWriteCache = writeCache;

    const GTM_ID = 'GTM-TLNG322R';
    let gtmLoaded = false;
    let statsApisStarted = false;

    cacheConsent = getStoredConsent();

    function hasAnalyticsConsent() {
        return cacheConsent === 'all';
    }

    function loadGtmScript() {
        if (gtmLoaded || !hasAnalyticsConsent()) return;
        gtmLoaded = true;
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
        document.head.appendChild(script);
    }

    function applyGtmConsentUpdate(choice) {
        window.dataLayer = window.dataLayer || [];
        const granted = choice === 'all' ? 'granted' : 'denied';
        window.dataLayer.push({
            event: 'consent_update',
            analytics_storage: granted,
            ad_storage: granted,
            ad_user_data: granted,
            ad_personalization: granted
        });
        if (choice === 'all') loadGtmScript();
    }

    function resetStatsFetchers() {
        window.ypResetCodingStats?.();
        statsApisStarted = false;
    }

    function startStatsApis() {
        if (statsApisStarted) return;
        statsApisStarted = true;
        window.ypInitCodingStats?.();
    }

    function startStatsApisWhenVisible() {
        if (statsApisStarted) return;
        const section = document.getElementById('coding-stats');
        if (!section) {
            startStatsApis();
            return;
        }
        if (!('IntersectionObserver' in window)) {
            startStatsApis();
            return;
        }
        const observer = new IntersectionObserver((entries) => {
            if (!entries.some((entry) => entry.isIntersecting)) return;
            observer.disconnect();
            startStatsApis();
        }, { rootMargin: '240px', threshold: 0.01 });
        observer.observe(section);
    }

    function hydrateHeroReposFromCache() {
        const cached = readCache(`gh_stats_cache_v2:${GITHUB_USERNAME}`) || readCache(GH_CACHE_KEY);
        const count = cached?.data?.user?.publicRepos ?? cached?.data?.public_repos;
        if (count == null) return;
        const el = document.getElementById('hero-repos-stat');
        if (el) el.textContent = String(count);
    }

    function prefetchHeroGitHubCount() {
        if (cacheConsent === 'decline') return;
        hydrateHeroReposFromCache();
        const run = () => {
            window.ypPrefetchGitHubHero?.();
        };
        if ('requestIdleCallback' in window) {
            requestIdleCallback(run, { timeout: 2500 });
        } else {
            setTimeout(run, 400);
        }
    }

    function bootstrapAfterConsent() {
        if (cacheConsent === 'decline') return;
        prefetchHeroGitHubCount();
        startStatsApisWhenVisible();
    }

    function setBackgroundInert(inert) {
        const main = document.getElementById('main-content');
        if (main) main.setAttribute('aria-hidden', inert ? 'true' : 'false');
    }

    function trapFocusIn(container) {
        const focusable = container.querySelectorAll(
            'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
        );
        const items = Array.from(focusable).filter((el) => !el.disabled && el.offsetParent !== null);
        if (!items.length) return () => {};
        const first = items[0];
        const last = items[items.length - 1];
        first.focus({ preventScroll: true });

        const onKeydown = (e) => {
            if (e.key !== 'Tab') return;
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };
        container.addEventListener('keydown', onKeydown);
        return () => container.removeEventListener('keydown', onKeydown);
    }

    let releaseCookieFocusTrap = null;

    function hideCookieConsent() {
        const banner = document.getElementById('cookie-consent');
        if (!banner) return;
        banner.classList.remove('is-visible');
        banner.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('cookie-consent-open');
        releaseCookieFocusTrap?.();
        releaseCookieFocusTrap = null;
    }

    function showCookieConsent() {
        const banner = document.getElementById('cookie-consent');
        if (!banner) return;
        banner.setAttribute('aria-hidden', 'false');
        document.body.classList.add('cookie-consent-open');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                banner.classList.add('is-visible');
                releaseCookieFocusTrap?.();
                releaseCookieFocusTrap = trapFocusIn(banner);
            });
        });
    }

    function applyConsent(choice) {
        if (choice !== 'all' && choice !== 'essential' && choice !== 'decline') return;

        cacheConsent = choice;
        try {
            localStorage.setItem(CONSENT_KEY, choice);
        } catch {
            // storage disabled
        }

        if (choice === 'decline') clearStatsCache();
        applyGtmConsentUpdate(choice);
        resetStatsFetchers();
        bootstrapAfterConsent();
        hideCookieConsent();

        window.dispatchEvent(new CustomEvent('yp-consent-changed', { detail: { choice } }));

        const toast = document.getElementById('site-toast');
        if (typeof showToast === 'function') {
            if (choice === 'all') {
                showToast('[ ✓ PREFERENCES ] Cookies, cache & analytics enabled', 'success');
            } else if (choice === 'essential') {
                showToast('[ ✓ PREFERENCES ] Essential cache enabled (no analytics)', 'info');
            } else {
                showToast('[ ✓ PREFERENCES ] Optional cache & analytics declined', 'info');
            }
        } else if (toast) {
            toast.textContent = choice === 'all' ? 'Preferences saved' : 'Preferences saved';
            toast.classList.add('visible');
        }
    }

    function initCookieConsent() {
        const banner = document.getElementById('cookie-consent');
        if (!banner) {
            if (!cacheConsent) cacheConsent = 'essential';
            applyGtmConsentUpdate(cacheConsent);
            bootstrapAfterConsent();
            return;
        }

        banner.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-consent]');
            if (!btn) return;
            e.preventDefault();
            applyConsent(btn.getAttribute('data-consent'));
        });

        document.getElementById('cookie-settings-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            showCookieConsent();
        });

        document.addEventListener('keydown', (e) => {
            const banner = document.getElementById('cookie-consent');
            if (e.key === 'Escape' && banner?.classList.contains('is-visible')) {
                applyConsent('essential');
            }
        });

        if (cacheConsent) {
            hideCookieConsent();
            applyGtmConsentUpdate(cacheConsent);
            bootstrapAfterConsent();
            return;
        }

        showCookieConsent();
    }

    window.ypOpenCookieSettings = showCookieConsent;
    window.ypGetConsent = () => cacheConsent;
    window.ypTrapFocus = trapFocusIn;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    /* --- Custom cursor (magnifier lens on interactive elements) --- */
    const cursor = document.getElementById('cursor');
    const CURSOR_DEFAULT = 24;
    const CURSOR_HOVER = 80;
    const CURSOR_ZOOM = 2.1;
    const CURSOR_INTERACTIVE = '.cursor-hover, a, button, input, textarea, select, label, h1, h2, h3, h4, h5, h6';
    const CURSOR_MAGNIFY_BLOCK = '#profile-flip-card, #cv-modal, #project-modal, #book-call-modal, #shortcuts-modal, #command-palette, #mobile-menu, #mobile-menu-backdrop, #page-loader, #cookie-consent';

    if (cursor && !prefersReducedMotion && !isTouchDevice && !navigator.connection?.saveData && window.innerWidth >= 1024) {
        const mirrorHost = cursor.querySelector('.cursor-mirror');
        let cursorExpanded = false;
        let mirrorSources = [];

        function cursorEnabled() {
            return !document.body.classList.contains('boot-loading') && !document.hidden;
        }

        function resetCursorMirror() {
            mirrorSources = [];
            if (mirrorHost) mirrorHost.innerHTML = '';
        }

        function shouldMagnifyAt(x, y) {
            const stack = document.elementsFromPoint(x, y);
            for (const el of stack) {
                if (el === cursor || cursor.contains(el)) continue;
                if (el.closest(CURSOR_MAGNIFY_BLOCK)) return false;
                if (el.closest(CURSOR_INTERACTIVE)) return true;
            }
            return false;
        }

        const MIRROR_SKIP_CHILDREN = '#section-rail, nav[aria-label="Main navigation"]';
        const MIRROR_NAV_SOURCE = 'nav[aria-label="Main navigation"] .main-nav-bar';

        const MIRROR_PRESENTATION_PROPS = [
            'display', 'visibility', 'opacity', 'color', 'background-color',
            'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
            'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
            'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
            'box-shadow', 'font-size', 'font-weight', 'font-family', 'line-height', 'letter-spacing',
            'text-transform', 'white-space', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
            'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'gap',
            'justify-content', 'align-items', 'flex-direction', 'flex-wrap', 'text-decoration',
        ];

        function getMirrorZIndex(el) {
            if (el.classList?.contains('mirror-nav-layer') || el.classList?.contains('main-nav-bar')) return 100;
            const style = getComputedStyle(el);
            const parsed = parseInt(style.zIndex, 10);
            if (!Number.isNaN(parsed)) return parsed;
            if (style.position === 'fixed' || style.position === 'sticky') return 20;
            return 0;
        }

        function shouldSkipMirrorChild(child) {
            if (child === cursor || child.tagName === 'SCRIPT' || child.tagName === 'NOSCRIPT') return true;
            return child.matches?.(MIRROR_SKIP_CHILDREN);
        }

        function stripMirrorIds(root) {
            root.removeAttribute('id');
            root.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
        }

        function syncMirrorPresentation(original, clone) {
            const origNodes = [original, ...original.querySelectorAll('*')];
            const cloneNodes = [clone, ...clone.querySelectorAll('*')];
            origNodes.forEach((orig, index) => {
                const mirrorNode = cloneNodes[index];
                if (!mirrorNode) return;
                const computed = getComputedStyle(orig);
                mirrorNode.style.display = computed.display;
                mirrorNode.style.visibility = computed.visibility;
                mirrorNode.style.opacity = computed.opacity;
                MIRROR_PRESENTATION_PROPS.forEach((prop) => {
                    const value = computed.getPropertyValue(prop);
                    if (value) mirrorNode.style.setProperty(prop, value);
                });
            });
        }

        function syncMirrorLayerPositions() {
            mirrorSources.forEach(({ original, clone }) => {
                if (!original.isConnected) return;
                const rect = original.getBoundingClientRect();
                if (rect.width < 1 || rect.height < 1) {
                    clone.style.visibility = 'hidden';
                    return;
                }
                clone.style.visibility = 'visible';
                clone.style.zIndex = String(getMirrorZIndex(original));
                clone.style.top = `${rect.top}px`;
                clone.style.left = `${rect.left}px`;
                clone.style.width = `${rect.width}px`;
                clone.style.height = `${rect.height}px`;
            });
        }

        function syncMirrorMedia() {
            mirrorSources.forEach(({ original, clone }) => {
                const origImgs = original.querySelectorAll('img');
                const cloneImgs = clone.querySelectorAll('img');
                origImgs.forEach((img, index) => {
                    const cloneImg = cloneImgs[index];
                    if (!cloneImg) return;
                    if (img.currentSrc || img.src) cloneImg.src = img.currentSrc || img.src;
                    cloneImg.removeAttribute('data-shot-src');
                });
                const origFrames = original.querySelectorAll('iframe');
                const cloneFrames = clone.querySelectorAll('iframe');
                origFrames.forEach((frame, index) => {
                    const cloneFrame = cloneFrames[index];
                    if (!cloneFrame || !frame.src) return;
                    cloneFrame.src = frame.src;
                    cloneFrame.removeAttribute('data-iframe-src');
                });
            });
        }

        function buildViewportMirror() {
            if (!mirrorHost) return;

            resetCursorMirror();
            const page = document.createElement('div');
            page.className = 'cursor-mirror-page';

            Array.from(document.body.children).forEach((child) => {
                if (shouldSkipMirrorChild(child)) return;
                const clone = child.cloneNode(true);
                stripMirrorIds(clone);
                clone.setAttribute('aria-hidden', 'true');
                clone.style.zIndex = String(getMirrorZIndex(child));
                page.appendChild(clone);
                mirrorSources.push({ original: child, clone });
            });

            const navSource = document.querySelector(MIRROR_NAV_SOURCE);
            if (navSource) {
                const navClone = navSource.cloneNode(true);
                stripMirrorIds(navClone);
                navClone.classList.add('mirror-nav-layer');
                navClone.setAttribute('aria-hidden', 'true');
                navClone.style.zIndex = '100';
                page.appendChild(navClone);
                mirrorSources.push({ original: navSource, clone: navClone });
            }

            mirrorHost.appendChild(page);
            mirrorSources.forEach(({ original, clone }) => syncMirrorPresentation(original, clone));
            syncMirrorMedia();
            syncMirrorLayerPositions();
        }

        function updateViewportMirror(x, y, size) {
            const page = mirrorHost?.querySelector('.cursor-mirror-page');
            if (!page) return;
            page.style.transform = `translate(${size / 2 - x * CURSOR_ZOOM}px, ${size / 2 - y * CURSOR_ZOOM}px) scale(${CURSOR_ZOOM})`;
        }

        function syncViewportMirror(x, y, size) {
            syncMirrorLayerPositions();
            updateViewportMirror(x, y, size);
        }

        function setCursorExpanded(expanded, x, y) {
            if (expanded) {
                if (!cursorExpanded) {
                    cursorExpanded = true;
                    cursor.classList.add('cursor-expanded');
                    cursor.style.width = `${CURSOR_HOVER}px`;
                    cursor.style.height = `${CURSOR_HOVER}px`;
                    buildViewportMirror();
                    updateViewportMirror(x, y, CURSOR_HOVER);
                    return;
                }
                updateViewportMirror(x, y, CURSOR_HOVER);
                return;
            }

            if (!cursorExpanded) return;
            cursorExpanded = false;
            cursor.classList.remove('cursor-expanded');
            cursor.style.width = `${CURSOR_DEFAULT}px`;
            cursor.style.height = `${CURSOR_DEFAULT}px`;
            resetCursorMirror();
        }

        let lastCursorX = -100;
        let lastCursorY = -100;
        let cursorFramePending = false;

        function paintCursor() {
            cursorFramePending = false;

            if (!cursorEnabled()) {
                cursor.style.visibility = 'hidden';
                if (cursorExpanded) setCursorExpanded(false, lastCursorX, lastCursorY);
                return;
            }

            cursor.style.visibility = 'visible';
            cursor.style.left = `${lastCursorX}px`;
            cursor.style.top = `${lastCursorY}px`;
            const interactive = shouldMagnifyAt(lastCursorX, lastCursorY);
            setCursorExpanded(interactive, lastCursorX, lastCursorY);
            if (cursorExpanded) updateViewportMirror(lastCursorX, lastCursorY, CURSOR_HOVER);
        }

        function scheduleCursorPaint() {
            if (cursorFramePending) return;
            cursorFramePending = true;
            requestAnimationFrame(paintCursor);
        }

        document.addEventListener('mousemove', (e) => {
            lastCursorX = e.clientX;
            lastCursorY = e.clientY;
            scheduleCursorPaint();
        }, { passive: true });

        document.addEventListener('visibilitychange', () => scheduleCursorPaint());

        const bootObserver = new MutationObserver(() => scheduleCursorPaint());
        bootObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

        let mirrorScrollTicking = false;
        window.addEventListener('scroll', () => {
            if (!cursorExpanded || mirrorScrollTicking) return;
            mirrorScrollTicking = true;
            requestAnimationFrame(() => {
                syncViewportMirror(lastCursorX, lastCursorY, CURSOR_HOVER);
                mirrorScrollTicking = false;
            });
        }, { passive: true });

        let mirrorResizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(mirrorResizeTimer);
            mirrorResizeTimer = setTimeout(() => {
                if (cursorExpanded) {
                    buildViewportMirror();
                    syncViewportMirror(lastCursorX, lastCursorY, CURSOR_HOVER);
                } else {
                    resetCursorMirror();
                }
            }, 150);
        }, { passive: true });

        scheduleCursorPaint();
        window.ypRefreshCursorMirror = function refreshCursorMirror() {
            if (!cursorExpanded) return;
            buildViewportMirror();
            syncViewportMirror(lastCursorX, lastCursorY, CURSOR_HOVER);
        };
    } else if (cursor) {
        cursor.remove();
        document.body.style.cursor = 'auto';
    }

    /* --- Mobile menu --- */
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuBackdrop = document.getElementById('mobile-menu-backdrop');
    const mobileMenuIcon = document.getElementById('mobile-menu-icon');

    function syncMobileNavHeight() {
        const bar = document.getElementById('main-nav-bar');
        if (bar) bar.style.setProperty('--mobile-nav-height', `${bar.offsetHeight}px`);
    }

    function closeMobileMenu() {
        if (!mobileMenu || !mobileMenuBtn) return;
        mobileMenu.classList.add('hidden');
        mobileMenuBackdrop?.classList.add('hidden');
        mobileMenuBackdrop?.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        mobileMenuBtn.setAttribute('aria-label', 'Open menu');
        if (mobileMenuIcon) mobileMenuIcon.className = 'ri-menu-line text-2xl';
    }

    function openMobileMenu() {
        if (!mobileMenu || !mobileMenuBtn) return;
        syncMobileNavHeight();
        mobileMenu.classList.remove('hidden');
        mobileMenuBackdrop?.classList.remove('hidden');
        mobileMenuBackdrop?.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        mobileMenuBtn.setAttribute('aria-expanded', 'true');
        mobileMenuBtn.setAttribute('aria-label', 'Close menu');
        if (mobileMenuIcon) mobileMenuIcon.className = 'ri-close-line text-2xl';
    }

    syncMobileNavHeight();
    window.addEventListener('resize', syncMobileNavHeight, { passive: true });

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            const isOpen = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
            if (isOpen) closeMobileMenu();
            else openMobileMenu();
        });
        mobileMenu.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMobileMenu));
        mobileMenuBackdrop?.addEventListener('click', closeMobileMenu);
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMobileMenu(); });
    }

    window.addEventListener('resize', () => {
        if (window.innerWidth >= 768) closeMobileMenu();
        if (window.innerWidth < 1024 && cursor?.parentElement) {
            cursor.remove();
            document.body.style.cursor = 'auto';
        }
    }, { passive: true });

    /* --- Scroll progress + section accent colors --- */
    const progressBar = document.getElementById('progressBar');
    let scrollTicking = false;
    let currentThemeKey = '';

    const SECTION_THEMES = {
        hero: { accent: '#FBFF48', text: '#121212' },
        about: { accent: '#33FF57', text: '#121212' },
        skills: { accent: '#3B82F6', text: '#121212' },
        experience: { accent: '#FBFF48', text: '#121212' },
        education: { accent: '#33FF57', text: '#121212' },
        'coding-stats': { accent: '#3B82F6', text: '#121212' },
        projects: { accent: '#FBFF48', text: '#121212' },
        achievements: { accent: '#33FF57', text: '#121212' },
        'intellectual-property': { accent: '#3B82F6', text: '#121212' },
        reports: { accent: '#FBFF48', text: '#121212' },
        contact: { accent: '#33FF57', text: '#121212' },
        footer: { accent: '#3B82F6', text: '#121212' }
    };

    const themedSections = document.querySelectorAll('[data-section-theme]');

    function applySectionTheme(themeKey) {
        if (themeKey === currentThemeKey) return;
        const theme = SECTION_THEMES[themeKey] || SECTION_THEMES.hero;
        currentThemeKey = themeKey;
        document.body.style.setProperty('--scroll-accent', theme.accent);
        document.body.style.setProperty('--scroll-accent-text', theme.text);
        document.body.dataset.activeSection = themeKey;
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeKey === 'skills' || themeKey === 'coding-stats' || themeKey === 'footer' || themeKey === 'intellectual-property' ? '#121212' : theme.accent);
        if (progressBar) progressBar.style.backgroundColor = theme.accent;
        document.querySelectorAll('.section-rail-dot').forEach((dot) => {
            dot.classList.toggle('active', dot.dataset.rail === themeKey);
        });
    }

    /* --- Navigation: smooth scroll + active section sync --- */
    const NAV_SECTIONS = ['about', 'skills', 'experience', 'education', 'coding-stats', 'projects', 'achievements', 'intellectual-property', 'reports', 'contact'];
    const navLinks = document.querySelectorAll('.nav-link[data-nav]');

    function getNavOffset() {
        const navBar = document.getElementById('main-nav-bar');
        if (navBar) return navBar.offsetHeight + 12;
        const nav = document.querySelector('nav[aria-label="Main navigation"]');
        return (nav?.offsetHeight || 88) + 16;
    }

    function getContactScrollTarget() {
        return document.getElementById('contact-panel') || document.getElementById('contact-form') || document.getElementById('contact');
    }

    function scrollToSection(id) {
        if (id === 'projects') window.ensureProjectsGrid?.();
        if (id === 'reports') window.ensureReportsMarquee?.();
        const section =
            id === 'contact' ? getContactScrollTarget() : document.getElementById(id);
        if (!section) return;
        const top = section.getBoundingClientRect().top + window.scrollY - getNavOffset();
        window.scrollTo({ top: Math.max(0, top), behavior: prefersReducedMotion ? 'auto' : 'smooth' });
        history.replaceState(null, '', `#${id}`);
        if (id === 'contact') {
            section.setAttribute('tabindex', '-1');
            section.focus({ preventScroll: true });
        }
    }

    function goToContact(e) {
        if (e) e.preventDefault();
        scrollToSection('contact');
        closeMobileMenu();
    }

    document.querySelectorAll('.hire-me-cta').forEach((link) => {
        link.addEventListener('click', goToContact);
    });

    function updateNavActive() {
        const markerY = window.scrollY + getNavOffset() + 24;
        let activeId = '';

        NAV_SECTIONS.forEach((id) => {
            const section = document.getElementById(id);
            if (!section) return;
            const top = section.getBoundingClientRect().top + window.scrollY;
            if (markerY >= top) activeId = id;
        });

        navLinks.forEach((link) => {
            link.classList.toggle('nav-link-active', link.getAttribute('data-nav') === activeId);
        });
    }

    document.querySelectorAll('a[href^="#"]').forEach((link) => {
        link.addEventListener('click', (e) => {
            const id = link.getAttribute('href')?.slice(1);
            if (!id || !document.getElementById(id)) return;
            e.preventDefault();
            scrollToSection(id);
            closeMobileMenu();
        });
    });

    function scrollToHashFromUrl() {
        const hash = window.location.hash.slice(1);
        if (!hash) return;
        if (hash === 'contact' || hash === 'contact-form') {
            scrollToSection('contact');
            return;
        }
        if (document.getElementById(hash)) scrollToSection(hash);
    }

    window.addEventListener('load', () => {
        setTimeout(scrollToHashFromUrl, 100);
    });

    window.addEventListener('hashchange', scrollToHashFromUrl);

    function updateActiveSectionTheme() {
        const markerY = window.scrollY + window.innerHeight * 0.38;
        let activeKey = 'hero';

        themedSections.forEach((section) => {
            const top = section.getBoundingClientRect().top + window.scrollY;
            const bottom = top + section.offsetHeight;
            if (markerY >= top && markerY < bottom) {
                activeKey = section.dataset.sectionTheme;
            }
        });

        applySectionTheme(activeKey);
    }

    function updateScrollUI() {
        const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        if (progressBar) {
            const pct = height > 0 ? Math.round((scrollTop / height) * 100) : 0;
            progressBar.style.width = pct + '%';
            progressBar.setAttribute('aria-valuenow', String(pct));
        }
        const backToTop = document.getElementById('back-to-top');
        if (backToTop) backToTop.classList.toggle('visible', scrollTop > 600);

        const stickyBar = document.getElementById('sticky-hire-bar');
        const contactSection = document.getElementById('contact');
        if (stickyBar) {
            const hero = document.getElementById('hero');
            const heroBottom = hero ? hero.offsetTop + hero.offsetHeight : 600;
            const contactVisible = contactSection && contactSection.getBoundingClientRect().top < window.innerHeight * 0.85;
            stickyBar.classList.toggle('visible', scrollTop > heroBottom && !contactVisible);
        }

        updateActiveSectionTheme();
        updateNavActive();
        scrollTicking = false;
    }
    window.addEventListener('scroll', () => {
        if (!scrollTicking) {
            scrollTicking = true;
            requestAnimationFrame(updateScrollUI);
        }
    }, { passive: true });
    updateScrollUI();

    const backToTop = document.getElementById('back-to-top');
    if (backToTop) {
        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
        });
    }

    /* --- Reveal on scroll --- */
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    window.observeReveals = function observeReveals(root) {
        const scope = root && root.querySelectorAll ? root : document;
        scope.querySelectorAll('.reveal:not(.active)').forEach((el) => {
            if (el.dataset.revealObserved === 'true') return;
            el.dataset.revealObserved = 'true';
            revealObserver.observe(el);
        });
    };

    window.observeReveals(document);

    /* --- Project tag filters --- */
    const filterBtns = document.querySelectorAll('.project-filter');
    filterBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;
            filterBtns.forEach((b) => {
                const active = b === btn;
                b.classList.toggle('active', active);
                b.classList.toggle('bg-neo-black', active);
                b.classList.toggle('text-white', active);
                b.classList.toggle('bg-white', !active);
            });
            document.querySelectorAll('#projects-grid article[data-tags]').forEach((article) => {
                const tags = (article.dataset.tags || '').split(' ');
                article.classList.toggle('project-hidden', filter !== 'all' && !tags.includes(filter));
            });
            pushGtmEvent('project_filter', { filter });
        });
    });

    /* --- GTM analytics helper --- */
    function pushGtmEvent(eventName, params = {}) {
        if (!hasAnalyticsConsent()) return;
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: eventName, ...params });
    }
    window.pushGtmEvent = pushGtmEvent;

    document.querySelectorAll('[data-track]').forEach((el) => {
        el.addEventListener('click', () => {
            pushGtmEvent(el.dataset.track, { label: el.textContent?.trim() || el.dataset.track });
        });
    });

    /* --- Brutalist toast --- */
    let toastTimer = null;
    function showToast(message, type = 'success') {
        const toast = document.getElementById('site-toast');
        if (!toast) return;
        toast.textContent = message;
        toast.className = `toast-${type}`;
        toast.classList.add('visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('visible'), 4000);
    }
    window.showToast = showToast;

    const PORTFOLIO_SITE_URL = 'https://yuvrajprasad.vercel.app/';

    function getPortfolioShareUrl() {
        const { protocol, hostname } = window.location;
        if (protocol === 'file:' || hostname === 'localhost' || hostname === '127.0.0.1') {
            return PORTFOLIO_SITE_URL;
        }
        return window.location.href.split('#')[0];
    }

    function fallbackCopyText(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.cssText = 'position:fixed;opacity:0;left:-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        let ok = false;
        try {
            ok = document.execCommand('copy');
        } catch {
            // execCommand unavailable
        }
        document.body.removeChild(textArea);
        return ok;
    }

    async function sharePortfolio() {
        const url = getPortfolioShareUrl();
        const shareData = {
            title: 'YUVRAJ PRASAD | AI Product Engineer & Full Stack Developer',
            text: 'Portfolio of Yuvraj Prasad — AI Product Engineer & Full Stack Developer',
            url,
        };

        if (navigator.share && window.isSecureContext) {
            try {
                await navigator.share(shareData);
                pushGtmEvent('share_portfolio', { method: 'web_share' });
                return;
            } catch (err) {
                if (err?.name === 'AbortError') return;
            }
        }

        let copied = false;
        if (navigator.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(url);
                copied = true;
            } catch {
                // fall through to execCommand
            }
        }
        if (!copied) copied = fallbackCopyText(url);

        if (copied) {
            showToast('[ ✓ COPIED ] Portfolio link copied', 'success');
            pushGtmEvent('share_portfolio', { method: 'clipboard' });
        } else {
            showToast('[ ✗ FAILED ] Could not copy link', 'error');
        }
    }

    window.ypSharePortfolio = sharePortfolio;
    document.getElementById('hero-share-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        sharePortfolio();
    });
    document.getElementById('sticky-share-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        sharePortfolio();
    });

    /* --- Portfolio highlights (deferred until #reports is near viewport) --- */
    const SHOW_TESTIMONIALS = false;
    const clientTestimonials = [
        // { from: 'Client Name', quote: 'Real testimonial quote here.' }
    ];

    function ensureReportsMarquee() {
        const testimonialsMarquee = document.getElementById('testimonials-marquee');
        if (!testimonialsMarquee || testimonialsMarquee.dataset.rendered === 'true') return;
        testimonialsMarquee.dataset.rendered = 'true';

        const themes = {
            orange: { bar: 'bg-neo-orange', label: 'text-neo-orange', hover: 'hover:border-neo-orange/50', stars: 'text-neo-orange/60' },
            green: { bar: 'bg-neo-green', label: 'text-neo-green', hover: 'hover:border-neo-green/50', stars: 'text-neo-green/60' },
            blue: { bar: 'bg-neo-blue', label: 'text-neo-blue', hover: 'hover:border-neo-blue/50', stars: 'text-neo-blue/60' }
        };
        const portfolioLogs = SHOW_TESTIMONIALS && clientTestimonials.length
            ? clientTestimonials.map((item, i) => ({
                id: String(i + 1).padStart(3, '0'),
                from: item.from,
                quote: item.quote,
                theme: themes.green
            }))
            : [
            { id: '005', from: 'Oracle Kolkata Community', quote: 'Official site lead for a free learning hub with courses, meetups, and Oracle Cloud resources.', theme: themes.orange },
            { id: '006', from: 'Hackathon Circuit', quote: '10+ wins including Hack4Bengal S4, HackTropica 2k25, Algo Hacks 2025, and IMI Kolkata CodeCrafter.', theme: themes.green },
            { id: '007', from: 'Patent Office India', quote: 'Granted patent for Smart Health & Nutrition Monitoring Watch (ID: 456407-001, April 2025).', theme: themes.blue }
        ];
        const year = new Date().getFullYear();
        const renderCard = (item) => {
            const t = item.theme;
            return `<div class="log-card group/card ${t.hover} hover:border-white/20">
                <div class="absolute top-0 left-0 w-full h-1 ${t.bar}"></div>
                <div class="flex justify-between items-start mb-4">
                    <div class="font-mono ${t.label} text-xs font-bold tracking-widest uppercase">LOG_${item.id}.txt</div>
                    <div class="text-[10px] font-mono text-gray-500">${year}.txt</div>
                </div>
                <div class="font-mono text-gray-400 text-[10px] mb-2 uppercase tracking-tight">SOURCE: ${item.from}</div>
                <p class="font-bold text-base md:text-lg leading-snug mb-0 text-white/90">${item.quote}</p>
            </div>`;
        };
        testimonialsMarquee.innerHTML = portfolioLogs.map(renderCard).join('');
    }

    window.ensureReportsMarquee = ensureReportsMarquee;

    function scheduleReportsMarquee() {
        const section = document.getElementById('reports');
        const container = document.getElementById('testimonials-marquee');
        if (!section || !container || container.dataset.rendered === 'true') return;

        if (window.location.hash.slice(1) === 'reports') {
            ensureReportsMarquee();
            return;
        }

        if (!('IntersectionObserver' in window)) {
            ensureReportsMarquee();
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            if (!entries[0]?.isIntersecting) return;
            observer.disconnect();
            ensureReportsMarquee();
        }, { rootMargin: '320px', threshold: 0.01 });
        observer.observe(section);
    }

    scheduleReportsMarquee();

    function pauseOffscreenMarquees() {
        if (!('IntersectionObserver' in window)) return;
        document.querySelectorAll('.marquee-container').forEach((el) => {
            const observer = new IntersectionObserver((entries) => {
                el.classList.toggle('marquee-offscreen', !entries[0]?.isIntersecting);
            }, { rootMargin: '64px', threshold: 0 });
            observer.observe(el);
        });
    }

    pauseOffscreenMarquees();

    /* --- Clipboard helper --- */
    function copyToClipboard(text, btnId) {
        const copyBtn = document.getElementById(btnId);
        const onSuccess = () => {
            if (!copyBtn) return;
            const original = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="ri-check-line"></i> COPIED';
            copyBtn.classList.add('bg-neo-green', 'text-black');
            copyBtn.classList.remove('bg-neo-black', 'text-white');
            setTimeout(() => {
                copyBtn.innerHTML = original;
                copyBtn.classList.remove('bg-neo-green', 'text-black');
                copyBtn.classList.add('bg-neo-black', 'text-white');
            }, 2000);
        };
        const fallbackCopy = () => {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.cssText = 'position:fixed;opacity:0';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            onSuccess();
        };
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(text).then(onSuccess).catch(fallbackCopy);
        } else {
            fallbackCopy();
        }
    }

    window.copyContactEmail = () => copyToClipboard('prasadyuvraj8805@gmail.com', 'copy-email-btn');
    window.copyContactPhone = () => copyToClipboard('+91 62911 29896', 'copy-phone-btn');

    const CONTACT_RECIPIENT = 'prasadyuvraj8805@gmail.com';
    const CONTACT_API_TIMEOUT_MS = 12000;
    const CONTACT_CFG = window.YP_CONTACT_CONFIG || {};
    const PRODUCTION_CONTACT_API = CONTACT_CFG.productionApiUrl || 'https://yuvrajprasad.vercel.app/api/contact';
    const PRODUCTION_CONFIG_API = CONTACT_CFG.configUrl || 'https://yuvrajprasad.vercel.app/api/config';

    let cachedWeb3formsKey = CONTACT_CFG.web3formsAccessKey || '';

    function usesProductionContactApi() {
        const { protocol, hostname } = window.location;
        return protocol === 'file:' || hostname === 'localhost' || hostname === '127.0.0.1';
    }

    function getContactApiUrl() {
        return usesProductionContactApi() ? PRODUCTION_CONTACT_API : '/api/contact';
    }

    function getContactConfigUrl() {
        return usesProductionContactApi() ? PRODUCTION_CONFIG_API : '/api/config';
    }

    async function fetchWithTimeout(url, options, timeoutMs = CONTACT_API_TIMEOUT_MS) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            return await fetch(url, { ...options, signal: controller.signal });
        } finally {
            clearTimeout(timer);
        }
    }

    async function loadWeb3formsKey() {
        if (cachedWeb3formsKey) return cachedWeb3formsKey;

        try {
            const response = await fetchWithTimeout(getContactConfigUrl(), { method: 'GET' }, 8000);
            if (!response.ok) return '';
            const data = await response.json().catch(() => ({}));
            cachedWeb3formsKey = data.web3formsAccessKey || '';
        } catch {
            cachedWeb3formsKey = '';
        }

        return cachedWeb3formsKey;
    }

    async function submitViaContactApi(payload) {
        const response = await fetchWithTimeout(getContactApiUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(payload),
        });

        if (response.ok) return { ok: true };

        const err = await response.json().catch(() => ({}));
        return {
            ok: false,
            status: response.status,
            error: err.error || 'Could not send message.',
            retryable: response.status >= 500 || response.status === 503,
        };
    }

    async function submitViaWeb3Forms(accessKey, payload) {
        if (!accessKey) return false;

        const response = await fetchWithTimeout('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
                access_key: accessKey,
                name: payload.name,
                email: payload.email,
                subject: `[Portfolio] ${payload.subject} from ${payload.name}`,
                message: `From: ${payload.name} <${payload.email}>\nSubject: ${payload.subject}\n\n${payload.message}`,
            }),
        }, 15000);

        const data = await response.json().catch(() => ({}));
        return response.ok && data.success === true;
    }

    function showFormStatus(type, message) {
        const statusEl = document.getElementById('form-status');
        if (!statusEl) return;
        statusEl.textContent = message;
        statusEl.className = `font-mono text-sm font-bold form-status--${type}`;
        statusEl.classList.remove('hidden');
    }

    function hideFormStatus() {
        const statusEl = document.getElementById('form-status');
        if (!statusEl) return;
        statusEl.textContent = '';
        statusEl.className = 'font-mono text-sm font-bold hidden';
    }

    function showContactFailure(message) {
        showFormStatus('error', message);
        showToast('[ ✗ FAILED ] Could not send message.', 'error');
    }

    const CONTACT_LIMITS = { name: 100, email: 254, subject: 120, message: 5000 };

    async function submitContactForm(event) {
        event.preventDefault();
        const form = document.getElementById('contact-form');
        const submitBtn = document.getElementById('transmit-btn');
        const nameInput = document.getElementById('contact-name');
        const emailInput = document.getElementById('contact-email');
        const subjectInput = document.getElementById('contact-subject');
        const messageInput = document.getElementById('contact-message');

        if (!form || !nameInput || !emailInput || !messageInput) return false;

        const payload = {
            name: nameInput.value.trim().slice(0, CONTACT_LIMITS.name),
            email: emailInput.value.trim().slice(0, CONTACT_LIMITS.email),
            subject: (subjectInput?.value.trim() || 'Portfolio contact').slice(0, CONTACT_LIMITS.subject),
            message: messageInput.value.trim().slice(0, CONTACT_LIMITS.message),
            company: document.getElementById('contact-company')?.value.trim() || '',
        };

        if (payload.company) {
            showFormStatus('success', 'Message sent. I usually reply within 48 hours.');
            showToast('[ ✓ SENT ] Message delivered successfully.', 'success');
            form.reset();
            return false;
        }

        if (!payload.name || !payload.email || !payload.message) {
            showFormStatus('error', 'Fill in name, email, and message.');
            showToast('[ ✗ ERROR ] Please fill in all required fields.', 'error');
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(payload.email)) {
            showFormStatus('error', 'Enter a valid email address.');
            showToast('[ ✗ ERROR ] Invalid email address.', 'error');
            return false;
        }

        hideFormStatus();
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="ri-loader-4-line"></i> TRANSMITTING...';
        }

        const deliverSuccess = () => {
            showFormStatus('success', 'Message sent. I usually reply within 48 hours.');
            showToast('[ ✓ SENT ] Message delivered successfully.', 'success');
            form.reset();
            pushGtmEvent('contact_submit');
        };

        try {
            const apiResult = await submitViaContactApi(payload);
            if (apiResult.ok) {
                deliverSuccess();
                return false;
            }

            if (apiResult.status === 429) {
                showFormStatus('error', apiResult.error || 'Too many attempts. Please wait a minute.');
                showToast('[ ✗ RATE LIMIT ] Try again shortly.', 'error');
                return false;
            }

            if (apiResult.status && apiResult.status < 500 && apiResult.status !== 503) {
                showContactFailure(apiResult.error || 'Could not send message. Try the direct email link below.');
                return false;
            }

            const web3formsKey = await loadWeb3formsKey();
            if (await submitViaWeb3Forms(web3formsKey, payload)) {
                deliverSuccess();
                return false;
            }

            if (usesProductionContactApi() && window.location.protocol === 'file:') {
                showContactFailure(
                    'Contact form cannot send from a local HTML file. Open https://yuvrajprasad.vercel.app or run npm run dev, then try again.'
                );
                return false;
            }

            showContactFailure(
                'Could not deliver your message. Use SEND EMAIL DIRECTLY below or try again in a moment.'
            );
        } catch {
            showContactFailure('Network error. Check your connection or use SEND EMAIL DIRECTLY below.');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="ri-send-plane-fill"></i> TRANSMIT DATA';
            }
        }

        return false;
    }

    document.getElementById('contact-form')?.addEventListener('submit', submitContactForm);
    window.handleContactSubmit = submitContactForm;

    const leetCodeStatsImg = document.querySelector('img[alt="LeetCode Stats"]');
    if (leetCodeStatsImg) {
        leetCodeStatsImg.addEventListener('error', () => {
            const statusEl = document.getElementById('lc-badges-status');
            if (statusEl) {
                statusEl.textContent = 'Unavailable';
                statusEl.classList.remove('animate-pulse', 'text-neo-yellow', 'text-neo-green', 'text-neo-orange');
                statusEl.classList.add('text-neo-red');
            }
        }, { once: true });
    }

    /* --- Achievement filters --- */
    const achievementFilterBtns = document.querySelectorAll('.achievement-filter');
    const achievementCards = document.querySelectorAll('.achievement-card');
    achievementFilterBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.achievementFilter;
            achievementFilterBtns.forEach((b) => {
                const active = b === btn;
                b.classList.toggle('active', active);
                b.classList.toggle('bg-neo-black', active);
                b.classList.toggle('text-white', active);
                b.classList.toggle('bg-white', !active);
            });
            achievementCards.forEach((card) => {
                const year = card.dataset.year || '';
                const tier = card.dataset.tier || '';
                let show = filter === 'all';
                if (filter === '2025') show = year === filter;
                else if (filter === 'winner') show = tier === 'winner';
                else if (filter === 'runner-up') show = tier === 'runner-up';
                card.classList.toggle('achievement-hidden', !show);
            });
        });
    });

    /* --- Skill category filters --- */
    const skillFilterBtns = document.querySelectorAll('.skill-filter');
    const skillItems = document.querySelectorAll('.skill-item');
    skillFilterBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.skillFilter;
            skillFilterBtns.forEach((b) => {
                b.classList.toggle('active', b === btn);
            });
            skillItems.forEach((item) => {
                item.classList.toggle('skill-hidden', filter !== 'all' && item.dataset.category !== filter);
            });
        });
    });

    /* --- Hero typewriter roles --- */
    const heroTypewriter = document.getElementById('hero-typewriter');
    if (heroTypewriter && !prefersReducedMotion) {
        const roles = [
            'AI Product Engineer @ Orcrys',
            'Building Edquate · edquate.com',
            'Ex Tech Lead @ Mewayz',
            'Co-Founder @ KomProTech',
            'Patent Holder',
            'Hackathon Winner',
            'MERN | Java | Python | AI/ML | Web3'
        ];
        let roleIndex = 0;
        let charIndex = 0;
        let deleting = false;

        function tickTypewriter() {
            const current = roles[roleIndex];
            if (!deleting) {
                heroTypewriter.textContent = current.slice(0, charIndex + 1);
                charIndex++;
                if (charIndex === current.length) {
                    deleting = true;
                    setTimeout(tickTypewriter, 2000);
                    return;
                }
            } else {
                heroTypewriter.textContent = current.slice(0, charIndex - 1);
                charIndex--;
                if (charIndex === 0) {
                    deleting = false;
                    roleIndex = (roleIndex + 1) % roles.length;
                }
            }
            setTimeout(tickTypewriter, deleting ? 40 : 80);
        }
        setTimeout(tickTypewriter, 1000);
    }

    /* --- Profile flip: tap + dots --- */
    const profileFlipCard = document.getElementById('profile-flip-card');
    const profileFlipInner = document.getElementById('profile-flip-inner');
    const profileDots = document.querySelectorAll('.profile-flip-dot');
    let flipShowingBack = false;

    function setFlipFace(showBack) {
        flipShowingBack = showBack;
        if (profileFlipCard) profileFlipCard.classList.toggle('is-flipped', showBack);
        profileDots.forEach((dot, i) => dot.classList.toggle('active', (showBack && i === 1) || (!showBack && i === 0)));
    }

    if (profileFlipCard && isTouchDevice) {
        profileFlipCard.addEventListener('click', () => setFlipFace(!flipShowingBack));
    }

    /* --- CV preview modal --- */
    const cvModal = document.getElementById('cv-modal');
    const cvModalClose = document.getElementById('cv-modal-close');
    const cvModalFrame = document.getElementById('cv-modal-frame');
    const cvModalLoading = document.getElementById('cv-modal-loading');
    function getCvPdfUrl() {
        return window.YP_CV_CONFIG?.getPdfUrl?.()
            || new URL('Assets/Resume/Yuvraj%20Prasad%20CV.pdf', window.location.href).href;
    }

    function getCvPreviewSrc() {
        if (window.YP_CV_CONFIG?.getViewerUrl) {
            return window.YP_CV_CONFIG.getViewerUrl();
        }
        const viewer = new URL('Assets/cv-viewer.html', window.location.href);
        viewer.searchParams.set('src', '/Assets/Resume/Yuvraj%20Prasad%20CV.pdf');
        viewer.searchParams.set('v', document.querySelector('meta[name="site-version"]')?.content || String(Date.now()));
        return viewer.href;
    }

    function setCvModalLoading(visible) {
        cvModalLoading?.classList.toggle('hidden', !visible);
    }

    let cvLoadTimer;
    let releaseCvFocusTrap = null;
    let cvModalLastFocus = null;
    let cvPreviewMessageHandler = null;

    function hideCvModalLoading() {
        clearTimeout(cvLoadTimer);
        setCvModalLoading(false);
    }

    function detachCvPreviewMessageHandler() {
        if (!cvPreviewMessageHandler) return;
        window.removeEventListener('message', cvPreviewMessageHandler);
        cvPreviewMessageHandler = null;
    }

    function openCvModal() {
        if (!cvModal || !cvModalFrame) return;
        cvModalLastFocus = document.activeElement;
        cvModal.hidden = false;
        cvModal.classList.add('open');
        document.body.style.overflow = 'hidden';
        setBackgroundInert(true);
        setCvModalLoading(true);
        clearTimeout(cvLoadTimer);
        detachCvPreviewMessageHandler();
        cvModalFrame.onload = hideCvModalLoading;
        cvPreviewMessageHandler = (event) => {
            if (event.origin !== window.location.origin) return;
            if (event.source !== cvModalFrame.contentWindow) return;
            if (event.data?.type !== 'yp-cv-preview' || !event.data?.ready) return;
            hideCvModalLoading();
        };
        window.addEventListener('message', cvPreviewMessageHandler);
        // Native PDF iframes often skip onload — don't block the preview behind the overlay.
        cvLoadTimer = window.setTimeout(hideCvModalLoading, 4500);
        cvModalFrame.src = getCvPreviewSrc();
        pushGtmEvent('cv_preview');
        const panel = document.getElementById('cv-modal-panel');
        releaseCvFocusTrap?.();
        releaseCvFocusTrap = panel ? trapFocusIn(panel) : null;
    }

    function closeCvModal() {
        if (!cvModal) return;
        clearTimeout(cvLoadTimer);
        detachCvPreviewMessageHandler();
        cvModal.classList.remove('open');
        cvModal.hidden = true;
        document.body.style.overflow = '';
        setBackgroundInert(false);
        releaseCvFocusTrap?.();
        releaseCvFocusTrap = null;
        if (cvModalFrame) {
            cvModalFrame.onload = null;
            cvModalFrame.src = 'about:blank';
        }
        setCvModalLoading(true);
        if (cvModalLastFocus && typeof cvModalLastFocus.focus === 'function') {
            cvModalLastFocus.focus({ preventScroll: true });
        }
        cvModalLastFocus = null;
    }
    document.getElementById('hero-preview-cv')?.addEventListener('click', openCvModal);
    document.getElementById('sticky-preview-cv')?.addEventListener('click', openCvModal);
    cvModalClose?.addEventListener('click', closeCvModal);
    cvModal?.addEventListener('click', (e) => { if (e.target === cvModal) closeCvModal(); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && cvModal?.classList.contains('open')) closeCvModal();
    });

    /* --- Project detail modal --- */
    const projectModal = document.getElementById('project-modal');
    const projectModalBody = document.getElementById('project-modal-body');
    const projectModalTitle = document.getElementById('project-modal-title');
    const projectModalClose = document.getElementById('project-modal-close');
    let releaseProjectFocusTrap = null;
    let projectModalLastFocus = null;

    function findProjectBySlug(slug) {
        return (window.PORTFOLIO_PROJECTS || []).find((p) => p.slug === slug);
    }

    function isGithubUrl(url) {
        return /^https:\/\/(www\.)?github\.com\//i.test(url || '');
    }

    function openProjectModal(slug) {
        const project = findProjectBySlug(slug);
        if (!project || !projectModal || !projectModalBody) return;

        window.ensureProjectsGrid?.();

        projectModalLastFocus = document.activeElement;
        projectModalTitle.textContent = `${project.title.toUpperCase()}_DETAILS.txt`;

        const links = [];
        if (project.live) {
            links.push(`<a href="${project.live}" target="_blank" rel="noopener noreferrer" class="px-3 py-1 bg-neo-green text-black border-2 border-black font-mono text-xs font-bold hover:bg-black hover:text-white transition-colors" data-track="project_live">LIVE SITE</a>`);
        }
        if (project.github && isGithubUrl(project.github)) {
            links.push(`<a href="${project.github}" target="_blank" rel="noopener noreferrer" class="px-3 py-1 bg-neo-black text-white border-2 border-black font-mono text-xs font-bold hover:bg-neo-blue transition-colors" data-track="project_github">GITHUB</a>`);
        } else if (project.github && project.github !== project.live) {
            links.push(`<a href="${project.github}" target="_blank" rel="noopener noreferrer" class="px-3 py-1 bg-neo-black text-white border-2 border-black font-mono text-xs font-bold hover:bg-neo-blue transition-colors" data-track="project_link">VIEW SITE</a>`);
        }

        projectModalBody.innerHTML = `
            <p class="font-mono text-xs uppercase text-gray-500 mb-2">${project.role}</p>
            <p class="font-mono text-sm mb-4 leading-relaxed">${project.desc}</p>
            <h4 class="font-black uppercase text-sm mb-2">Highlights</h4>
            <ul class="project-modal-highlights space-y-2 font-mono text-sm mb-5">${project.highlights.map((item) => `<li>${item}</li>`).join('')}</ul>
            <div class="flex flex-wrap gap-2 mb-5">${(project.tags || []).map((tag) => `<span class="bg-neo-black text-white px-2 py-1 font-mono text-xs font-bold">${tag}</span>`).join('')}</div>
            <div class="flex flex-wrap gap-2">${links.join('')}
            <button type="button" id="project-modal-copy" class="px-3 py-1 bg-neo-yellow text-black border-2 border-black font-mono text-xs font-bold hover:bg-black hover:text-white transition-colors">COPY LINK</button></div>`;

        projectModalBody.querySelector('#project-modal-copy')?.addEventListener('click', () => {
            window.ypCopyProjectLink?.(project.slug);
        });

        projectModalBody.querySelectorAll('[data-track]').forEach((el) => {
            el.addEventListener('click', () => pushGtmEvent(el.dataset.track, { label: project.title }));
        });

        projectModal.hidden = false;
        projectModal.classList.add('open');
        document.body.style.overflow = 'hidden';
        setBackgroundInert(true);
        pushGtmEvent('project_view', { label: project.title });
        history.replaceState(null, '', `#projects?project=${encodeURIComponent(project.slug)}`);
        releaseProjectFocusTrap?.();
        releaseProjectFocusTrap = trapFocusIn(document.getElementById('project-modal-panel'));
        projectModalClose?.focus({ preventScroll: true });
    }

    function closeProjectModal() {
        if (!projectModal) return;
        projectModal.classList.remove('open');
        projectModal.hidden = true;
        document.body.style.overflow = '';
        setBackgroundInert(false);
        releaseProjectFocusTrap?.();
        releaseProjectFocusTrap = null;
        projectModalLastFocus?.focus?.({ preventScroll: true });
    }

    window.openProjectModal = openProjectModal;
    projectModalClose?.addEventListener('click', closeProjectModal);
    projectModal?.addEventListener('click', (e) => { if (e.target === projectModal) closeProjectModal(); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && projectModal?.classList.contains('open')) closeProjectModal();
    });

    /* --- Command palette (Ctrl+K / /) --- */
    const commandPalette = document.getElementById('command-palette');
    const commandInput = document.getElementById('command-palette-input');
    const commandList = document.getElementById('command-palette-list');
    const COMMANDS = [
        { cmd: 'goto about', label: 'Scroll to About', action: () => scrollToSection('about') },
        { cmd: 'goto skills', label: 'Scroll to Skills', action: () => scrollToSection('skills') },
        { cmd: 'goto logs', label: 'Scroll to Experience', action: () => scrollToSection('experience') },
        { cmd: 'goto education', label: 'Scroll to Education', action: () => scrollToSection('education') },
        { cmd: 'goto stats', label: 'Scroll to Coding Stats', action: () => scrollToSection('coding-stats') },
        { cmd: 'goto projects', label: 'Scroll to Projects', action: () => scrollToSection('projects') },
        { cmd: 'goto achievements', label: 'Scroll to Achievements', action: () => scrollToSection('achievements') },
        { cmd: 'goto patent', label: 'Scroll to Patent & IP', action: () => scrollToSection('intellectual-property') },
        { cmd: 'goto contact', label: 'Scroll to Contact', action: () => scrollToSection('contact') },
        { cmd: 'goto wins', label: 'Scroll to Portfolio Wins', action: () => scrollToSection('reports') },
        { cmd: 'download cv', label: 'Download CV', action: () => { window.location.href = getCvPdfUrl(); pushGtmEvent('cv_download'); } },
        { cmd: 'preview cv', label: 'Preview CV', action: openCvModal },
        { cmd: 'book call', label: 'Book a call · ₹10 / 30 min', action: () => { window.ypOpenBookCall?.(); pushGtmEvent('book_call'); } },
        { cmd: 'share', label: 'Share portfolio', action: () => window.ypSharePortfolio?.() },
        { cmd: 'copy link', label: 'Copy link to current section', action: () => window.ypCopySectionLink?.() },
        { cmd: 'shortcuts', label: 'Keyboard shortcuts', action: () => window.ypOpenShortcuts?.() },
        { cmd: 'copy email', label: 'Copy email to clipboard', action: () => { navigator.clipboard?.writeText('prasadyuvraj8805@gmail.com'); showToast('[ ✓ COPIED ] prasadyuvraj8805@gmail.com', 'success'); } },
        { cmd: 'privacy', label: 'Open privacy policy', action: () => { window.location.href = 'privacy.html'; } },
        { cmd: 'status', label: 'Show availability status', action: () => showToast('[ ✓ STATUS ] Available for work · Kolkata, India', 'info') }
    ];
    let commandActiveIndex = 0;

    function renderCommands(query = '') {
        if (!commandList) return;
        const q = query.toLowerCase().replace(/^>\s*/, '').trim();
        const filtered = COMMANDS.filter((c) => !q || c.cmd.includes(q) || c.label.toLowerCase().includes(q));
        commandActiveIndex = 0;
        commandList.innerHTML = filtered.map((c, i) =>
            `<div class="command-item${i === 0 ? ' active' : ''}" data-cmd="${c.cmd}">${c.label} <span class="opacity-50">— ${c.cmd}</span></div>`
        ).join('');
        commandList.querySelectorAll('.command-item').forEach((item, i) => {
            item.addEventListener('click', () => executeCommand(filtered[i]));
        });
    }

    function executeCommand(command) {
        closeCommandPalette();
        command?.action();
    }

    let releaseCommandFocusTrap = null;

    function openCommandPalette() {
        if (!commandPalette) return;
        commandPalette.hidden = false;
        commandPalette.classList.add('open');
        renderCommands('');
        commandInput.value = '';
        setBackgroundInert(true);
        releaseCommandFocusTrap?.();
        const box = document.getElementById('command-palette-box');
        releaseCommandFocusTrap = box ? trapFocusIn(box) : null;
        setTimeout(() => commandInput?.focus(), 50);
    }

    function closeCommandPalette() {
        if (!commandPalette) return;
        commandPalette.classList.remove('open');
        commandPalette.hidden = true;
        setBackgroundInert(false);
        releaseCommandFocusTrap?.();
        releaseCommandFocusTrap = null;
    }

    if (commandInput) {
        commandInput.addEventListener('input', () => renderCommands(commandInput.value));
        commandInput.addEventListener('keydown', (e) => {
            const items = commandList?.querySelectorAll('.command-item') || [];
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                commandActiveIndex = Math.min(commandActiveIndex + 1, items.length - 1);
                items.forEach((el, i) => el.classList.toggle('active', i === commandActiveIndex));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                commandActiveIndex = Math.max(commandActiveIndex - 1, 0);
                items.forEach((el, i) => el.classList.toggle('active', i === commandActiveIndex));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const q = commandInput.value.toLowerCase().replace(/^>\s*/, '').trim();
                const filtered = COMMANDS.filter((c) => !q || c.cmd.includes(q) || c.label.toLowerCase().includes(q));
                executeCommand(filtered[commandActiveIndex] || filtered[0]);
            } else if (e.key === 'Escape') {
                closeCommandPalette();
            }
        });
    }

    commandPalette?.addEventListener('click', (e) => { if (e.target === commandPalette) closeCommandPalette(); });

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            commandPalette?.classList.contains('open') ? closeCommandPalette() : openCommandPalette();
        }
        if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
            e.preventDefault();
            openCommandPalette();
        }
    });

    document.getElementById('open-command-palette-btn')?.addEventListener('click', openCommandPalette);

    function updateKolkataClock() {
        const el = document.getElementById('kolkata-clock');
        if (!el) return;
        el.textContent = `${new Intl.DateTimeFormat('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).format(new Date())} IST`;
    }

    updateKolkataClock();
    setInterval(updateKolkataClock, 30000);

    initCookieConsent();
})();
