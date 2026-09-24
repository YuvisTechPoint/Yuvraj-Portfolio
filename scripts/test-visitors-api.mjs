import handler from '../api/visitors.js';

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

async function invoke(method, body = null) {
    const req = {
        method,
        headers: { 'content-type': 'application/json' },
        body,
        socket: { remoteAddress: '127.0.0.1' },
    };
    const res = createRes();
    await handler(req, res);
    return res;
}

const cases = [];

{
    const res = await invoke('GET');
    cases.push(['GET without redis returns configured false', res.statusCode === 200 && res.body?.configured === false]);
}

{
    const res = await invoke('DELETE');
    cases.push(['rejects unsupported method', res.statusCode === 405]);
}

{
    const res = await invoke('OPTIONS');
    cases.push(['OPTIONS preflight succeeds', res.statusCode === 204]);
}

const failed = cases.filter(([, ok]) => !ok);
if (failed.length) {
    console.error('Visitors API test failures:');
    failed.forEach(([name]) => console.error(`  - ${name}`));
    process.exit(1);
}

console.log(`Visitors API tests passed (${cases.length}).`);
