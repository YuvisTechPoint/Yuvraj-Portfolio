import githubHandler from '../api/github.js';
import leetcodeHandler from '../api/leetcode.js';

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
    };
    return res;
}

async function invoke(handler, query = {}) {
    const req = { method: 'GET', query };
    const res = createRes();
    await handler(req, res);
    return res;
}

const gh = await invoke(githubHandler);
const cases = [];
const ghLive = gh.statusCode === 200 && Array.isArray(gh.body?.topByCommits);

if (ghLive) {
    cases.push(
        ['github returns 200', true],
        ['github has top repos', gh.body.topByCommits.length > 0],
        ['github limits top repos to 5', gh.body.topByCommits.length <= 5],
        ['github top repos include commit counts', gh.body.topByCommits.every((repo) => typeof repo.commits === 'number')],
        ['github has sync time', Boolean(gh.body?.syncedAt)],
        ['github totals include stars', gh.body.totals?.stars != null],
    );
} else if ([429, 502].includes(gh.statusCode) && !process.env.GITHUB_TOKEN) {
    console.warn(`GitHub stats skipped in CI (status ${gh.statusCode} without GITHUB_TOKEN).`);
    cases.push(['github rate-limit fallback acceptable', true]);
} else {
    cases.push(['github returns usable payload', false]);
}

const lc = await invoke(leetcodeHandler);
cases.push(['leetcode returns 200', lc.statusCode === 200]);
cases.push(['leetcode has sync payload', Boolean(lc.body?.syncedAt)]);

const failed = cases.filter(([, ok]) => !ok);
if (failed.length) {
    console.error('Stats API test failures:');
    failed.forEach(([name]) => console.error(`  - ${name}`));
    process.exit(1);
}

console.log(`Stats API tests passed (${cases.length}).`);
console.log(`GitHub: ${gh.body?.topByCommits?.length} top repos, ${gh.body?.totals?.stars} stars`);
console.log(`LeetCode: ${lc.body?.profile?.totalSolved ?? '—'} solved`);
