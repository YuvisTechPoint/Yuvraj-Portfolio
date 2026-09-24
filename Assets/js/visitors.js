(function initVisitorCounter() {
    const COUNT_EL = document.getElementById('visitor-count');
    if (!COUNT_EL) return;

    const VISITOR_ID_KEY = 'yp_visitor_id';
    const SESSION_RECORDED_KEY = 'yp_visit_recorded';
    const PRODUCTION_API = 'https://yuvrajprasad.vercel.app/api/visitors';

    function getVisitorApiUrl() {
        const { protocol, hostname } = window.location;
        if (protocol === 'file:' || hostname === 'localhost' || hostname === '127.0.0.1') {
            return PRODUCTION_API;
        }
        return '/api/visitors';
    }

    function getVisitorId() {
        try {
            let id = localStorage.getItem(VISITOR_ID_KEY);
            if (!id) {
                id = crypto.randomUUID();
                localStorage.setItem(VISITOR_ID_KEY, id);
            }
            return id;
        } catch {
            return null;
        }
    }

    function formatCount(value) {
        const count = Number(value);
        if (!Number.isFinite(count) || count < 0) return '—';
        return count.toLocaleString('en-IN');
    }

    function animateCount(el, target) {
        const end = Number(target);
        if (!Number.isFinite(end) || end <= 0) {
            el.textContent = formatCount(target);
            return;
        }

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion || end < 8) {
            el.textContent = formatCount(end);
            return;
        }

        const start = Math.max(0, end - Math.min(24, Math.floor(end * 0.08)));
        const duration = 900;
        const startTime = performance.now();

        function tick(now) {
            const progress = Math.min(1, (now - startTime) / duration);
            const eased = 1 - (1 - progress) ** 3;
            const current = Math.round(start + (end - start) * eased);
            el.textContent = formatCount(current);
            if (progress < 1) requestAnimationFrame(tick);
        }

        requestAnimationFrame(tick);
    }

    function renderCount(count) {
        if (count == null) {
            COUNT_EL.textContent = '—';
            COUNT_EL.removeAttribute('data-live');
            return;
        }

        animateCount(COUNT_EL, count);
        COUNT_EL.setAttribute('data-live', 'true');
        COUNT_EL.setAttribute('title', `${formatCount(count)} unique visitors`);
    }

    async function fetchCount(apiUrl) {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            cache: 'no-store',
        });
        if (!response.ok) return null;
        const data = await response.json().catch(() => ({}));
        return data.configured ? data.count : null;
    }

    async function recordVisit(apiUrl, visitorId) {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ visitorId }),
        });
        if (!response.ok) return null;
        const data = await response.json().catch(() => ({}));
        return data.configured ? data.count : null;
    }

    async function boot() {
        const apiUrl = getVisitorApiUrl();

        try {
            let count = null;
            const visitorId = getVisitorId();
            const alreadyRecorded = sessionStorage.getItem(SESSION_RECORDED_KEY) === '1';

            if (visitorId && !alreadyRecorded) {
                count = await recordVisit(apiUrl, visitorId);
                sessionStorage.setItem(SESSION_RECORDED_KEY, '1');
            }

            if (count == null) {
                count = await fetchCount(apiUrl);
            }

            renderCount(count);
        } catch {
            renderCount(null);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
})();
