import handler from '../api/book-call.js';

function createRes() {
    const res = {
        statusCode: 200,
        headers: {},
        body: null,
        setHeader(key, value) {
            this.headers[key] = value;
        },
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        },
        end() {
            return this;
        },
    };
    return res;
}

async function invoke(body, headers = {}) {
    const req = {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'content-length': String(JSON.stringify(body).length),
            ...headers,
        },
        body,
        socket: { remoteAddress: '127.0.0.1' },
    };
    const res = createRes();
    await handler(req, res);
    return res;
}

const futureDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
const sample = {
    name: 'Priya Sharma',
    email: 'priya.sharma@proton.me',
    phone: '+91 9876543210',
    date: futureDate,
    time: '15:30',
    topic: 'MERN architecture review',
    ref: `CALL-${Date.now().toString(36).toUpperCase()}-Z9`,
    confirmMode: 'manual',
};

const cases = [];

{
    const res = await invoke({
        ...sample,
        name: 'E2E Smoke Guest',
        email: 'test@example.com',
        ref: 'CALL-SMOKE-TEST',
        topic: 'smoke test',
    });
    cases.push(['rejects test/smoke bookings', res.statusCode === 400]);
}

{
    const res = await invoke({ ...sample, company: 'bot' });
    cases.push(['honeypot accepts silently', res.statusCode === 200 && res.body?.success === true]);
}

{
    const res = await invoke({ ...sample, email: 'bad' });
    cases.push(['rejects invalid email', res.statusCode === 400]);
}

{
    const res = await invoke({ ...sample, date: '01-10-2026' });
    cases.push(['rejects invalid date', res.statusCode === 400]);
}

{
    const res = await invoke({ ...sample, name: '' });
    cases.push(['rejects missing name', res.statusCode === 400]);
}

{
    const res = await invoke(sample);
    cases.push(['returns 503 without email credentials', res.statusCode === 503]);
}

const failed = cases.filter(([, ok]) => !ok);
if (failed.length) {
    console.error('Book-call API test failures:');
    failed.forEach(([name]) => console.error(`  - ${name}`));
    process.exit(1);
}

console.log(`Book-call API tests passed (${cases.length}).`);
