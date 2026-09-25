'use strict';

const { getRedis } = require('./redis.js');

const memoryBuckets = new Map();

function memoryRateLimited(key, windowMs, max) {
    const now = Date.now();
    const bucket = memoryBuckets.get(key);

    if (!bucket || now - bucket.start > windowMs) {
        memoryBuckets.set(key, { start: now, count: 1 });
        return false;
    }

    bucket.count += 1;
    if (memoryBuckets.size > 1000) {
        for (const [entryKey, entry] of memoryBuckets) {
            if (now - entry.start > windowMs) memoryBuckets.delete(entryKey);
        }
    }

    return bucket.count > max;
}

/**
 * Returns true if the request should be blocked (rate limited).
 */
async function isRateLimited(key, { windowMs = 60_000, max = 5 } = {}) {
    const safeKey = String(key || 'unknown').slice(0, 120);
    const redis = getRedis();

    if (redis) {
        try {
            const redisKey = `rl:${safeKey}`;
            const count = await redis.incr(redisKey);
            if (count === 1) {
                await redis.expire(redisKey, Math.max(1, Math.ceil(windowMs / 1000)));
            }
            return count > max;
        } catch (error) {
            console.error('Redis rate limit error:', error);
        }
    }

    return memoryRateLimited(safeKey, windowMs, max);
}

module.exports = { isRateLimited };
