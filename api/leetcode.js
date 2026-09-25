const LEETCODE_USERNAME = 'YuvisTechPoint';
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = { data: null, ts: 0 };

function sendJson(res, status, body) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=180');
    return res.status(status).json(body);
}

async function fetchJson(url, timeoutMs = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
            throw new Error(data?.message || `LeetCode API error (${response.status})`);
        }
        return data;
    } finally {
        clearTimeout(timer);
    }
}

function mapAlfaProfile(data) {
    if (!data || data.matchedUser == null) return null;
    const submitStats = data.matchedUser?.submitStats?.acSubmissionNum || [];
    const byDiff = (difficulty) => submitStats.find((item) => item.difficulty === difficulty)?.count ?? 0;
    const totalSolved = data.totalSolved ?? data.matchedUser?.submitStatsGlobal?.acSubmissionNum
        ?.find((item) => item.difficulty === 'All')?.count ?? byDiff('All');
    return {
        totalSolved: data.totalSolved ?? totalSolved ?? 0,
        easySolved: data.easySolved ?? byDiff('Easy'),
        mediumSolved: data.mediumSolved ?? byDiff('Medium'),
        hardSolved: data.hardSolved ?? byDiff('Hard'),
        ranking: data.ranking ?? data.matchedUser?.profile?.ranking ?? null,
        acceptanceRate: data.acceptanceRate ?? null,
        contributionPoints: data.contributionPoints ?? null,
        reputation: data.reputation ?? null,
    };
}

async function fetchLeetCodeProfile(username) {
    const sources = [
        `https://alfa-leetcode-api.onrender.com/${encodeURIComponent(username)}`,
        `https://leetcode-stats-api.herokuapp.com/${encodeURIComponent(username)}`,
    ];

    for (const url of sources) {
        try {
            const data = await fetchJson(url);
            const mapped = mapAlfaProfile(data);
            if (mapped) return mapped;
            if (data && (data.totalSolved != null || data.totalSolved === 0)) {
                return {
                    totalSolved: data.totalSolved ?? 0,
                    easySolved: data.easySolved ?? 0,
                    mediumSolved: data.mediumSolved ?? 0,
                    hardSolved: data.hardSolved ?? 0,
                    ranking: data.ranking ?? null,
                    acceptanceRate: data.acceptanceRate ?? null,
                    contributionPoints: data.contributionPoints ?? null,
                    reputation: data.reputation ?? null,
                };
            }
        } catch {
            // try next source
        }
    }
    return null;
}

async function fetchLeetCodeBadges(username) {
    try {
        const data = await fetchJson(
            `https://alfa-leetcode-api.onrender.com/${encodeURIComponent(username)}/badges`
        );
        if (typeof data?.message === 'string' && /not\s*found/i.test(data.message)) {
            return { activeBadge: null, badges: [] };
        }
        return {
            activeBadge: data.activeBadge || null,
            badges: Array.isArray(data.badges) ? data.badges : [],
        };
    } catch {
        return { activeBadge: null, badges: [] };
    }
}

async function handler(req, res) {
    if (req.method !== 'GET') {
        return sendJson(res, 405, { error: 'Method not allowed' });
    }

    const forceFresh = req.query?.fresh === '1' || req.query?.fresh === 'true';
    const now = Date.now();
    if (!forceFresh && cache.data && now - cache.ts < CACHE_TTL_MS) {
        return sendJson(res, 200, { ...cache.data, cached: true });
    }

    try {
        const [profile, badges] = await Promise.all([
            fetchLeetCodeProfile(LEETCODE_USERNAME),
            fetchLeetCodeBadges(LEETCODE_USERNAME),
        ]);

        const payload = {
            username: LEETCODE_USERNAME,
            profile,
            badges,
            available: Boolean(profile || badges.badges.length || badges.activeBadge),
            syncedAt: new Date().toISOString(),
        };
        cache.data = payload;
        cache.ts = now;
        return sendJson(res, 200, { ...payload, cached: false });
    } catch (error) {
        if (cache.data) {
            return sendJson(res, 200, { ...cache.data, cached: true, stale: true });
        }
        return sendJson(res, 502, { error: error.message || 'LeetCode stats unavailable' });
    }
}

module.exports = handler;
