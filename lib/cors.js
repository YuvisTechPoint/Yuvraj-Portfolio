const SITE_URL = process.env.BOOKING_SITE_URL || 'https://yuvrajprasad.vercel.app';

const DEFAULT_ORIGINS = new Set([
    SITE_URL,
    'https://yuvrajprasad.vercel.app',
    'https://yuvraj-prasad.vercel.app',
    'http://localhost:8080',
    'http://localhost:8765',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:8765',
]);

function getAllowedOrigins() {
    const allowed = new Set(DEFAULT_ORIGINS);
    const extra = process.env.ALLOWED_ORIGINS || '';
    for (const item of extra.split(',')) {
        const trimmed = item.trim();
        if (trimmed) allowed.add(trimmed);
    }
    return allowed;
}

export function resolveCorsOrigin(req) {
    const origin = req.headers?.origin || '';
    const allowed = getAllowedOrigins();

    if (origin && allowed.has(origin)) return origin;
    if (!origin) return process.env.VERCEL_ENV === 'production' ? SITE_URL : '*';
    if (process.env.VERCEL_ENV === 'production') return SITE_URL;
    return '*';
}

export function isAllowedOrigin(req) {
    const origin = req.headers?.origin || '';
    if (!origin) return true;
    const allowed = getAllowedOrigins();
    if (allowed.has(origin)) return true;
    if (process.env.VERCEL_ENV !== 'production') return true;
    return false;
}

export function setCorsHeaders(res, req, methods = 'POST, OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', resolveCorsOrigin(req));
    res.setHeader('Access-Control-Allow-Methods', methods);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Vary', 'Origin');
}
