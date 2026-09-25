const { getRedis } = require('../lib/redis.js');
const { setCorsHeaders } = require('../lib/cors.js');
const { isRateLimited } = require('../lib/rateLimit.js');

const VISITOR_SET_KEY = 'portfolio:visitor_ids';
const VISITOR_CARDINALITY_KEY = 'portfolio:visitor_count';

function getBaseline() {
    const value = Number(process.env.VISITOR_BASELINE || 0);
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

function sendJson(res, status, body) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(status).json(body);
}

async function readJsonBody(req) {
    if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
        return req.body;
    }
    if (typeof req.body === 'string' && req.body.trim()) {
        try {
            return JSON.parse(req.body);
        } catch {
            return null;
        }
    }

    return new Promise((resolve, reject) => {
        let raw = '';
        req.on('data', (chunk) => {
            raw += chunk;
            if (raw.length > 512) reject(new Error('Payload too large'));
        });
        req.on('end', () => {
            if (!raw.trim()) {
                resolve(null);
                return;
            }
            try {
                resolve(JSON.parse(raw));
            } catch {
                resolve(null);
            }
        });
        req.on('error', reject);
    });
}

function sanitizeVisitorId(value) {
    const id = String(value || '').trim().slice(0, 64);
    if (!/^[a-zA-Z0-9_-]{8,64}$/.test(id)) return '';
    return id;
}

async function getVisitorCount(redis) {
    const stored = await redis.get(VISITOR_CARDINALITY_KEY);
    if (stored !== null && stored !== undefined) {
        return (Number(stored) || 0) + getBaseline();
    }
    const unique = await redis.scard(VISITOR_SET_KEY);
    return (Number(unique) || 0) + getBaseline();
}

async function handler(req, res) {
    setCorsHeaders(res, req, 'GET, POST, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'GET' && req.method !== 'POST') {
        return sendJson(res, 405, { error: 'Method not allowed' });
    }

    const redis = getRedis();
    if (!redis) {
        return sendJson(res, 200, { count: null, configured: false });
    }

    const clientIp = getClientIp(req);
    const rateKey = req.method === 'GET' ? `visitors:get:${clientIp}` : `visitors:post:${clientIp}`;
    const rateMax = req.method === 'GET' ? 60 : 30;

    if (await isRateLimited(rateKey, { max: rateMax })) {
        return sendJson(res, 429, { error: 'Too many requests' });
    }

    if (req.method === 'GET') {
        try {
            const count = await getVisitorCount(redis);
            return sendJson(res, 200, { count, configured: true });
        } catch (error) {
            console.error('Visitors GET error:', error);
            return sendJson(res, 500, { error: 'Could not load visitor count' });
        }
    }

    let payload;
    try {
        payload = await readJsonBody(req);
    } catch {
        return sendJson(res, 413, { error: 'Payload too large' });
    }

    const visitorId = sanitizeVisitorId(payload?.visitorId);
    if (!visitorId) {
        return sendJson(res, 400, { error: 'Invalid visitorId' });
    }

    try {
        const added = await redis.sadd(VISITOR_SET_KEY, visitorId);
        if (added === 1) {
            await redis.incr(VISITOR_CARDINALITY_KEY);
        }
        const count = await getVisitorCount(redis);
        return sendJson(res, 200, {
            count,
            configured: true,
            newVisitor: added === 1,
        });
    } catch (error) {
        console.error('Visitors POST error:', error);
        return sendJson(res, 500, { error: 'Could not record visit' });
    }
}

module.exports = handler;
