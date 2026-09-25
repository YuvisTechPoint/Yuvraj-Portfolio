'use strict';

const { Redis } = require('@upstash/redis');

let client = null;

function getRedis() {
    if (client !== null) return client;

    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
        client = false;
        return null;
    }

    client = new Redis({ url, token });
    return client;
}

module.exports = { getRedis };
