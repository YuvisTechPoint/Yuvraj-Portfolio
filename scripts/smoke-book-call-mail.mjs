/**
 * Dev-only mail smoke test. Sends REAL emails — blocked unless explicitly enabled.
 *
 *   BOOKING_ALLOW_TEST_SEND=true node scripts/smoke-book-call-mail.mjs
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import handler from '../api/book-call.js';

if (process.env.BOOKING_ALLOW_TEST_SEND !== 'true') {
    console.error('Blocked: set BOOKING_ALLOW_TEST_SEND=true to send test booking emails.');
    console.error('Production bookings only come from the live site UI.');
    process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const envPath = join(root, '.env.local');

if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq < 0) continue;
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim();
        if (!process.env[key]) process.env[key] = val;
    }
}

if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error('Missing GMAIL_USER / GMAIL_APP_PASSWORD in .env.local');
    process.exit(1);
}

function createRes() {
    return {
        statusCode: 200,
        headers: {},
        body: null,
        setHeader(k, v) { this.headers[k] = v; },
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.body = payload; return this; },
        end() { return this; },
    };
}

const tomorrow = new Date(Date.now() + 86400000);
const date = tomorrow.toISOString().slice(0, 10);
const guest = process.env.SMOKE_GUEST_EMAIL || process.env.GMAIL_USER;
const ref = `CALL-${Date.now().toString(36).toUpperCase()}-DEV`;

const body = {
    name: 'Dev Mail Check',
    email: guest,
    phone: '+91 6291129896',
    date,
    time: '11:00',
    topic: 'Dev-only mail pipeline verification',
    ref,
    confirmMode: 'manual',
};

const req = {
    method: 'POST',
    headers: {
        'content-type': 'application/json',
        'content-length': String(JSON.stringify(body).length),
        origin: 'http://localhost:8765',
    },
    body,
    socket: { remoteAddress: '127.0.0.1' },
};

const res = createRes();
await handler(req, res);

console.log(JSON.stringify({ status: res.statusCode, body: res.body }, null, 2));
if (res.statusCode !== 200 || !res.body?.success) process.exit(1);
console.log('OK — dev smoke mail sent to', guest);
