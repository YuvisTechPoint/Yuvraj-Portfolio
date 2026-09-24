import { Redis } from '@upstash/redis';

let client = null;

export function getRedis() {
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
