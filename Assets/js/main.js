(function () {
    'use strict';

    if (window.renderProjectsGrid) window.renderProjectsGrid();

    const GITHUB_USERNAME = 'YuvisTechPoint';
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
                if (key.startsWith('gh_user_cache_') || key.startsWith('lc_badges_cache_')) {
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

    const GTM_ID = 'GTM-TLNG322R';
    let gtmLoaded = false;
    let statsApisStarted = false;
    let githubPromise = null;

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
        githubPromise = null;
        githubReposPromise = null;
        statsApisStarted = false;
    }

    function startStatsApis() {
        if (statsApisStarted) return;
        statsApisStarted = true;
        initGitHub();
        fetchLeetCodeBadges();
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
        startStatsApis();
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
            startStatsApis();
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
                hideCookieConsent();
            }
        });

        if (cacheConsent) {
            hideCookieConsent();
            applyGtmConsentUpdate(cacheConsent);
            startStatsApis();
            return;
        }

        showCookieConsent();
    }

    window.ypOpenCookieSettings = showCookieConsent;
    window.ypGetConsent = () => cacheConsent;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    /* --- Custom cursor (magnifier lens on interactive elements) --- */
    const cursor = document.getElementById('cursor');
    const CURSOR_DEFAULT = 24;
    const CURSOR_HOVER = 80;
    const CURSOR_ZOOM = 2.1;
    const CURSOR_INTERACTIVE = '.cursor-hover, a, button, input, textarea, select, label, h1, h2, h3, h4, h5, h6';
    const CURSOR_MAGNIFY_BLOCK = '#profile-flip-card, #cv-modal, #command-palette, #mobile-menu, #mobile-menu-backdrop';

    if (cursor && !prefersReducedMotion && !isTouchDevice && window.innerWidth >= 1024) {
        const mirrorHost = cursor.querySelector('.cursor-mirror');
        let cursorExpanded = false;
        let mirrorSources = [];

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

        function getMirrorZIndex(el) {
            const style = getComputedStyle(el);
            const parsed = parseInt(style.zIndex, 10);
            if (!Number.isNaN(parsed)) return parsed;
            if (style.position === 'fixed' || style.position === 'sticky') return 20;
            return 0;
        }

        function syncMirrorLayerPositions() {
            mirrorSources.forEach(({ original, clone }) => {
                if (!original.isConnected) return;
                const rect = original.getBoundingClientRect();
                if (rect.width < 1 && rect.height < 1) {
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
                if (child === cursor || child.tagName === 'SCRIPT' || child.tagName === 'NOSCRIPT') return;
                const clone = child.cloneNode(true);
                clone.removeAttribute('id');
                clone.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
                clone.setAttribute('aria-hidden', 'true');
                clone.style.zIndex = String(getMirrorZIndex(child));
                page.appendChild(clone);
                mirrorSources.push({ original: child, clone });
            });

            mirrorHost.appendChild(page);
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

        let lastCursorX = 0;
        let lastCursorY = 0;

        document.addEventListener('mousemove', (e) => {
            lastCursorX = e.clientX;
            lastCursorY = e.clientY;
            cursor.style.left = `${e.clientX}px`;
            cursor.style.top = `${e.clientY}px`;
            const interactive = shouldMagnifyAt(e.clientX, e.clientY);
            setCursorExpanded(interactive, e.clientX, e.clientY);
            if (cursorExpanded) updateViewportMirror(e.clientX, e.clientY, CURSOR_HOVER);
        }, { passive: true });

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
    const NAV_SECTIONS = ['about', 'skills', 'experience', 'projects', 'reports', 'contact'];
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
            progressBar.style.width = (height > 0 ? (scrollTop / height) * 100 : 0) + '%';
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
    document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

    /* --- Project tag filters --- */
    const filterBtns = document.querySelectorAll('.project-filter');
    const projectArticles = document.querySelectorAll('#projects-grid article[data-tags]');
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
            projectArticles.forEach((article) => {
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

    /* --- Portfolio highlights --- */
    const SHOW_TESTIMONIALS = false;
    const clientTestimonials = [
        // { from: 'Client Name', quote: 'Real testimonial quote here.' }
    ];
    const testimonialsMarquee = document.getElementById('testimonials-marquee');
    if (testimonialsMarquee) {
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
        const stars = '';
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

    function openMailtoContact({ name, email, subject, message }) {
        const mailSubject = encodeURIComponent(`Portfolio: ${subject || 'New message'} from ${name}`);
        const mailBody = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
        window.location.href = `mailto:${CONTACT_RECIPIENT}?subject=${mailSubject}&body=${mailBody}`;
    }

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
            name: nameInput.value.trim(),
            email: emailInput.value.trim(),
            subject: subjectInput?.value.trim() || 'Portfolio contact',
            message: messageInput.value.trim(),
        };

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

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                showFormStatus('success', 'Message sent. I usually reply within 48 hours.');
                showToast('[ ✓ SENT ] Message delivered successfully.', 'success');
                form.reset();
                pushGtmEvent('contact_submit');
                return false;
            }

            const err = await response.json().catch(() => ({}));
            if (response.status === 501) {
                openMailtoContact(payload);
                showFormStatus('info', 'Email service not configured here — your mail app should open. Send the message to complete contact.');
                showToast('[ ✓ OPENING ] Use your email app to send the message.', 'info');
                return false;
            }

            showFormStatus('error', err.error || 'Could not send message. Try the direct email link below.');
            showToast('[ ✗ FAILED ] Could not send message.', 'error');
        } catch {
            openMailtoContact(payload);
            showFormStatus('info', 'Network error — opening your email app as a fallback.');
            showToast('[ ✓ OPENING ] Email app fallback.', 'info');
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

    /* --- GitHub (single API call for stats + badges) --- */
    const GH_CACHE_KEY = `gh_user_cache_v1:${GITHUB_USERNAME}`;
    const GH_REPOS_CACHE_KEY = `gh_repos_cache_v1:${GITHUB_USERNAME}`;
    let githubReposPromise = null;

    function fetchGitHubRepos() {
        if (!githubReposPromise) {
            const cached = readCache(GH_REPOS_CACHE_KEY);
            if (cached && (Date.now() - cached.ts) < CACHE_TTL_MS) {
                githubReposPromise = Promise.resolve(cached.data);
            } else {
                githubReposPromise = fetch(`https://api.github.com/users/${encodeURIComponent(GITHUB_USERNAME)}/repos?per_page=100&sort=updated`, {
                    headers: { Accept: 'application/vnd.github.v3+json' }
                }).then(async (r) => {
                    const json = await r.json().catch(() => []);
                    if (!r.ok) throw new Error(`GH repos error (${r.status})`);
                    writeCache(GH_REPOS_CACHE_KEY, json);
                    return json;
                }).catch((err) => {
                    if (cached?.data) return cached.data;
                    throw err;
                });
            }
        }
        return githubReposPromise;
    }

    function fetchGitHubUser() {
        if (!githubPromise) {
            const cached = readCache(GH_CACHE_KEY);
            if (cached && (Date.now() - cached.ts) < CACHE_TTL_MS) {
                githubPromise = Promise.resolve(cached.data);
            } else {
                githubPromise = fetch(`https://api.github.com/users/${encodeURIComponent(GITHUB_USERNAME)}`, {
                    headers: { Accept: 'application/vnd.github.v3+json' }
                }).then(async (r) => {
                    const json = await r.json().catch(() => ({}));
                    if (!r.ok) {
                        const message = json?.message || `GH API error (${r.status})`;
                        const err = new Error(message);
                        err.status = r.status;
                        throw err;
                    }
                    writeCache(GH_CACHE_KEY, json);
                    return json;
                }).catch((err) => {
                    // fall back to stale cache if available
                    if (cached?.data) return cached.data;
                    throw err;
                });
            }
        }
        return githubPromise;
    }

    async function initGitHub() {
        const setText = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };
        try {
            const [data, repos] = await Promise.all([fetchGitHubUser(), fetchGitHubRepos().catch(() => [])]);
            const repoCount = data.public_repos ?? '0';
            setText('repos-count', repoCount);
            setText('hero-repos-stat', repoCount);
            setText('followers-count', data.followers ?? '0');
            if (data.created_at) {
                setText('created-at', new Date(data.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }));
            }
            const totalStars = Array.isArray(repos)
                ? repos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0)
                : 0;
            setText('total-contributions', String(totalStars));
            setText('total-contributions-grid', String(totalStars));

            const statusEl = document.getElementById('gh-badges-status');
            if (statusEl) {
                statusEl.textContent = 'Loaded';
                statusEl.classList.remove('animate-pulse', 'text-neo-yellow');
                statusEl.classList.add('text-neo-green');
            }

            const activeContainer = document.getElementById('gh-active-badge');
            if (activeContainer) {
                const rankTitle = data.followers > 20 ? 'Star Developer' : 'Open Sourcer';
                const iconClass = data.followers > 20 ? 'ri-star-smile-fill' : 'ri-git-repository-fill';
                activeContainer.innerHTML = `<div class="relative w-12 h-12 mb-2 group-hover:scale-110 transition-transform"><div class="w-full h-full rounded-full border-2 border-neo-green flex items-center justify-center bg-neo-green/10"><i class="${iconClass} text-neo-green text-2xl drop-shadow-[0_0_8px_rgba(51,255,87,0.5)]"></i></div></div><span class="text-[10px] font-mono text-white text-center leading-tight max-w-[90px] truncate" title="${rankTitle}">${rankTitle}</span>`;
            }

            const historyContainer = document.getElementById('gh-history-badges');
            if (historyContainer) {
                const awards = [];
                if (data.public_repos >= 10) awards.push({ name: '10+ Repos', icon: 'ri-folder-open-fill' });
                if (data.public_repos >= 50) awards.push({ name: '50+ Repos', icon: 'ri-folder-add-fill' });
                if (data.followers > 10) awards.push({ name: 'Popular', icon: 'ri-user-heart-fill' });
                if (!awards.length) awards.push({ name: 'Contributor', icon: 'ri-medal-line' });
                const repeated = [...awards, ...awards, ...awards, ...awards];
                historyContainer.innerHTML = repeated.map((badge) =>
                    `<div class="min-w-[70px] flex flex-col items-center group/badge"><div class="w-10 h-10 mb-2 relative group-hover/badge:-translate-y-1 transition-transform flex items-center justify-center border-2 border-white/20 rounded-full bg-white/5 shadow-[2px_2px_0_rgba(51,255,87,0.3)] hover:border-neo-green hover:shadow-[4px_4px_0_rgba(51,255,87,1)] cursor-pointer"><i class="${badge.icon} text-neo-green text-xl drop-shadow-[2px_2px_0_rgba(0,0,0,1)]"></i></div><span class="text-[9px] font-mono text-gray-300 font-bold text-center w-full truncate px-1" title="${badge.name}">${badge.name}</span></div>`
                ).join('');
            }
        } catch (error) {
            console.error('GitHub fetch error:', error);
            setText('repos-count', '--');
            setText('hero-repos-stat', '--');
            setText('followers-count', '--');
            setText('total-contributions', '--');
            setText('total-contributions-grid', '--');
            setText('created-at', '--');
            const statusEl = document.getElementById('gh-badges-status');
            if (statusEl) {
                const msg = typeof error?.message === 'string' ? error.message : '';
                statusEl.textContent = msg.toLowerCase().includes('rate limit') ? 'Rate limited' : 'Unavailable';
                statusEl.className = 'text-neo-red text-[9px] font-mono uppercase tracking-widest';
            }
        }
    }

    /* --- LeetCode badges --- */
    const LC_CACHE_KEY = `lc_badges_cache_v1:${LEETCODE_USERNAME}`;
    async function fetchLeetCodeBadges() {
        const statusEl = document.getElementById('lc-badges-status');
        const activeContainer = document.getElementById('lc-active-badge');
        const historyContainer = document.getElementById('lc-history-badges');

        const renderUnavailable = (label = 'Unavailable') => {
            if (statusEl) {
                statusEl.textContent = label;
                statusEl.classList.remove('animate-pulse', 'text-neo-yellow', 'text-neo-red', 'text-neo-green', 'text-neo-orange');
                statusEl.classList.add('text-neo-red');
            }
            if (activeContainer) {
                activeContainer.innerHTML = '<span class="text-[10px] font-mono text-gray-500 text-center">Stats unavailable</span>';
            }
            if (historyContainer) {
                historyContainer.innerHTML = '<a href="https://leetcode.com/u/' + encodeURIComponent(LEETCODE_USERNAME) + '/" target="_blank" rel="noopener noreferrer" class="text-[10px] font-mono text-neo-orange hover:text-neo-yellow">View on LeetCode →</a>';
            }
        };

        try {
            const cached = readCache(LC_CACHE_KEY);
            const isFresh = cached && (Date.now() - cached.ts) < CACHE_TTL_MS;

            let data;
            if (isFresh) {
                data = cached.data;
            } else {
                const response = await fetch(`https://alfa-leetcode-api.onrender.com/${encodeURIComponent(LEETCODE_USERNAME)}/badges`);
                if (!response.ok) throw new Error(`API Error (${response.status})`);
                data = await response.json();
                writeCache(LC_CACHE_KEY, data);
            }

            if (typeof data?.message === 'string' && /not\s*found/i.test(data.message)) {
                throw new Error('User not found');
            }

            if (statusEl) {
                statusEl.textContent = isFresh ? 'Cached' : 'Loaded';
                statusEl.classList.remove('animate-pulse', 'text-neo-yellow', 'text-neo-red', 'text-neo-green');
                statusEl.classList.add('text-neo-orange');
            }

            const activeBadge = data.activeBadge;
            if (activeContainer) {
                if (activeBadge?.displayName) {
                    const iconUrl = activeBadge.icon.startsWith('http') ? activeBadge.icon : 'https://leetcode.com' + activeBadge.icon;
                    activeContainer.innerHTML = `<div class="relative w-12 h-12 mb-2 group-hover:scale-110 transition-transform"><img src="${iconUrl}" alt="${activeBadge.displayName}" class="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(255,159,28,0.5)]" loading="lazy"></div><span class="text-[10px] font-mono text-white text-center leading-tight max-w-[90px] truncate" title="${activeBadge.displayName}">${activeBadge.displayName}</span>`;
                } else {
                    activeContainer.innerHTML = `<i class="ri-lock-2-line text-2xl mb-1 text-gray-500"></i><span class="text-[10px] font-mono text-gray-500">Locked</span>`;
                }
            }

            const badges = data.badges || [];
            if (historyContainer) {
                if (badges.length) {
                    const repeated = [...badges, ...badges, ...badges];
                    historyContainer.innerHTML = repeated.map((badge) => {
                        const iconUrl = badge.icon.startsWith('http') ? badge.icon : 'https://leetcode.com' + badge.icon;
                        return `<div class="min-w-[70px] flex flex-col items-center group/badge"><div class="w-10 h-10 mb-2 relative group-hover/badge:-translate-y-1 transition-transform cursor-pointer border-2 border-transparent hover:border-neo-orange p-0.5 rounded shadow-[0_0_0_rgba(255,159,28,0)] hover:shadow-[2px_2px_0_rgba(255,159,28,1)]"><img src="${iconUrl}" alt="${badge.displayName}" class="w-full h-full object-contain drop-shadow-[2px_2px_0_rgba(0,0,0,1)]" loading="lazy"></div><span class="text-[9px] font-mono text-gray-300 font-bold text-center w-full truncate px-1" title="${badge.displayName}">${badge.displayName}</span><span class="text-[8px] font-mono text-neo-orange mt-1">${badge.creationDate || ''}</span></div>`;
                    }).join('');
                } else {
                    historyContainer.innerHTML = '<div class="text-[10px] font-mono text-gray-500 w-full text-center py-4">No history awards</div>';
                }
            }
        } catch (error) {
            console.error('LeetCode fetch error:', error);
            const msg = typeof error?.message === 'string' ? error.message : '';
            const isNotFound = msg.toLowerCase().includes('not found');
            renderUnavailable(isNotFound ? 'User not found' : 'Unavailable');
        }
    }

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
                if (filter === '2025' || filter === '2026') show = year === filter;
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
            'AI Product Engineer',
            'Co-Founder @ Apex Circle',
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
    const CV_PDF_PATH = 'Assets/Resume/Yuvraj%20Prasad%20CV.pdf';

    function getCvPdfUrl() {
        return new URL(CV_PDF_PATH, window.location.href).href;
    }

    function getCvPreviewSrc() {
        const pdfUrl = getCvPdfUrl();
        if (window.location.protocol === 'file:') {
            return pdfUrl;
        }
        const viewer = new URL('Assets/cv-viewer.html', window.location.href);
        viewer.searchParams.set('src', pdfUrl);
        return viewer.href;
    }

    function setCvModalLoading(visible) {
        cvModalLoading?.classList.toggle('hidden', !visible);
    }

    let cvLoadTimer;
    let releaseCvFocusTrap = null;
    let cvModalLastFocus = null;

    function openCvModal() {
        if (!cvModal || !cvModalFrame) return;
        cvModalLastFocus = document.activeElement;
        cvModal.hidden = false;
        cvModal.classList.add('open');
        document.body.style.overflow = 'hidden';
        setCvModalLoading(true);
        clearTimeout(cvLoadTimer);
        cvModalFrame.onload = () => {
            clearTimeout(cvLoadTimer);
            setCvModalLoading(false);
        };
        cvLoadTimer = window.setTimeout(() => setCvModalLoading(false), 8000);
        cvModalFrame.src = getCvPreviewSrc();
        pushGtmEvent('cv_preview');
        const panel = document.getElementById('cv-modal-panel');
        releaseCvFocusTrap?.();
        releaseCvFocusTrap = panel ? trapFocusIn(panel) : null;
    }

    function closeCvModal() {
        if (!cvModal) return;
        clearTimeout(cvLoadTimer);
        cvModal.classList.remove('open');
        cvModal.hidden = true;
        document.body.style.overflow = '';
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

    /* --- Command palette (Ctrl+K / /) --- */
    const commandPalette = document.getElementById('command-palette');
    const commandInput = document.getElementById('command-palette-input');
    const commandList = document.getElementById('command-palette-list');
    const COMMANDS = [
        { cmd: 'goto about', label: 'Scroll to About', action: () => scrollToSection('about') },
        { cmd: 'goto skills', label: 'Scroll to Skills', action: () => scrollToSection('skills') },
        { cmd: 'goto logs', label: 'Scroll to Experience', action: () => scrollToSection('experience') },
        { cmd: 'goto projects', label: 'Scroll to Projects', action: () => scrollToSection('projects') },
        { cmd: 'goto contact', label: 'Scroll to Contact', action: () => scrollToSection('contact') },
        { cmd: 'goto wins', label: 'Scroll to Portfolio Wins', action: () => scrollToSection('reports') },
        { cmd: 'download cv', label: 'Download CV', action: () => { window.location.href = 'Assets/Resume/Yuvraj%20Prasad%20CV.pdf'; pushGtmEvent('cv_download'); } },
        { cmd: 'preview cv', label: 'Preview CV', action: openCvModal },
        { cmd: 'copy email', label: 'Copy email to clipboard', action: () => { navigator.clipboard?.writeText('prasadyuvraj8805@gmail.com'); showToast('[ ✓ COPIED ] prasadyuvraj8805@gmail.com', 'success'); } },
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

    function openCommandPalette() {
        if (!commandPalette) return;
        commandPalette.hidden = false;
        commandPalette.classList.add('open');
        renderCommands('');
        commandInput.value = '';
        setTimeout(() => commandInput?.focus(), 50);
    }

    function closeCommandPalette() {
        if (!commandPalette) return;
        commandPalette.classList.remove('open');
        commandPalette.hidden = true;
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

    initCookieConsent();
})();
