import handler from '../api/contact.js';

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

const cases = [];

{
    const res = await invoke({ name: 'Bot', email: 'bot@spam.test', message: 'hi', company: 'hidden' });
    cases.push(['honeypot accepts silently', res.statusCode === 200 && res.body?.success === true]);
}

{
    const res = await invoke({ name: '', email: 'a@b.com', message: 'hi' });
    cases.push(['rejects missing name', res.statusCode === 400]);
}

{
    const res = await invoke({ name: 'Test', email: 'bad-email', message: 'hi' });
    cases.push(['rejects invalid email', res.statusCode === 400]);
}

{
    const res = await invoke({ name: 'Test', email: 'test@example.com', message: 'hello' });
    cases.push(['returns 503 without email credentials', res.statusCode === 503]);
}

const failed = cases.filter(([, ok]) => !ok);
if (failed.length) {
    console.error('Contact API test failures:');
    failed.forEach(([name]) => console.error(`  - ${name}`));
    process.exit(1);
}

console.log(`Contact API tests passed (${cases.length}).`);
