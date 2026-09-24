const GITHUB_USERNAME = 'YuvisTechPoint';
const CACHE_TTL_MS = 3 * 60 * 1000;
const cache = { data: null, ts: 0 };

function sendJson(res, status, body) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    return res.status(status).json(body);
}

function githubHeaders() {
    const token = process.env.GITHUB_TOKEN;
    const headers = {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Yuvraj-Portfolio-Stats',
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
}

async function githubFetch(url) {
    const response = await fetch(url, { headers: githubHeaders() });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
        const message = data?.message || `GitHub API error (${response.status})`;
        const err = new Error(message);
        err.status = response.status;
        throw err;
    }
    return data;
}

async function fetchAllRepos(username) {
    const repos = [];
    for (let page = 1; page <= 3; page += 1) {
        const batch = await githubFetch(
            `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&page=${page}&sort=updated`
        );
        if (!Array.isArray(batch) || !batch.length) break;
        repos.push(...batch);
        if (batch.length < 100) break;
    }
    return repos;
}

const TOP_REPO_LIMIT = 5;

function mapRepo(repo, commitCounts = new Map()) {
    return {
        name: repo.name,
        url: repo.html_url,
        stars: repo.stargazers_count || 0,
        forks: repo.forks_count || 0,
        commits: commitCounts.get(repo.name) ?? 0,
        language: repo.language || null,
        pushedAt: repo.pushed_at || null,
        updatedAt: repo.updated_at || null,
        description: (repo.description || '').slice(0, 120),
        isFork: Boolean(repo.fork),
        topics: Array.isArray(repo.topics) ? repo.topics.slice(0, 4) : [],
    };
}

async function fetchCommitCounts() {
    const query = `
        query($login: String!) {
            user(login: $login) {
                repositories(first: 100, ownerAffiliations: OWNER, isFork: false) {
                    nodes {
                        name
                        defaultBranchRef {
                            target {
                                ... on Commit {
                                    history { totalCount }
                                }
                            }
                        }
                    }
                }
            }
        }
    `;

    const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Yuvraj-Portfolio-Stats',
    };
    const token = process.env.GITHUB_TOKEN;
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, variables: { login: GITHUB_USERNAME } }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.errors?.length) {
        const message = payload.errors?.[0]?.message || `GitHub GraphQL error (${response.status})`;
        throw new Error(message);
    }

    const counts = new Map();
    const nodes = payload.data?.user?.repositories?.nodes || [];
    nodes.forEach((node) => {
        counts.set(node.name, node.defaultBranchRef?.target?.history?.totalCount ?? 0);
    });
    return counts;
}

async function fetchCommitCountsRest(username, repos) {
    const counts = new Map();
    const publicRepos = repos.filter((repo) => !repo.fork);
    const batchSize = 6;

    for (let index = 0; index < publicRepos.length; index += batchSize) {
        const batch = publicRepos.slice(index, index + batchSize);
        await Promise.all(batch.map(async (repo) => {
            try {
                const contributors = await githubFetch(
                    `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo.name)}/contributors?per_page=100&anon=true`
                );
                const total = Array.isArray(contributors)
                    ? contributors.reduce((sum, contributor) => sum + (contributor.contributions || 0), 0)
                    : 0;
                counts.set(repo.name, total);
            } catch {
                counts.set(repo.name, 0);
            }
        }));
    }

    return counts;
}

async function resolveCommitCounts(repos) {
    try {
        const graphCounts = await fetchCommitCounts();
        if (graphCounts.size > 0) return graphCounts;
    } catch (error) {
        console.warn('GitHub commit counts unavailable:', error.message);
    }

    return fetchCommitCountsRest(GITHUB_USERNAME, repos);
}

function buildPayload(user, repos, commitCounts = new Map()) {
    const publicRepos = repos.filter((repo) => !repo.fork);
    const totalStars = publicRepos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
    const totalForks = publicRepos.reduce((sum, repo) => sum + (repo.forks_count || 0), 0);

    const mapped = publicRepos.map((repo) => mapRepo(repo, commitCounts));
    const topByCommits = [...mapped]
        .sort((a, b) => b.commits - a.commits || b.stars - a.stars || new Date(b.pushedAt || 0) - new Date(a.pushedAt || 0))
        .slice(0, TOP_REPO_LIMIT);

    const languageCounts = {};
    publicRepos.forEach((repo) => {
        if (!repo.language) return;
        languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
    });
    const topLanguages = Object.entries(languageCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

    return {
        user: {
            login: user.login,
            name: user.name || user.login,
            bio: user.bio || '',
            avatarUrl: user.avatar_url,
            publicRepos: user.public_repos ?? publicRepos.length,
            followers: user.followers ?? 0,
            following: user.following ?? 0,
            createdAt: user.created_at,
            htmlUrl: user.html_url,
        },
        totals: {
            stars: totalStars,
            forks: totalForks,
            repos: user.public_repos ?? publicRepos.length,
        },
        topByCommits,
        topLanguages,
        syncedAt: new Date().toISOString(),
    };
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return sendJson(res, 405, { error: 'Method not allowed' });
    }

    const forceFresh = req.query?.fresh === '1' || req.query?.fresh === 'true';
    const now = Date.now();
    if (!forceFresh && cache.data && now - cache.ts < CACHE_TTL_MS) {
        return sendJson(res, 200, { ...cache.data, cached: true });
    }

    try {
        const [user, repos] = await Promise.all([
            githubFetch(`https://api.github.com/users/${encodeURIComponent(GITHUB_USERNAME)}`),
            fetchAllRepos(GITHUB_USERNAME),
        ]);
        const commitCounts = await resolveCommitCounts(repos);
        const payload = buildPayload(user, repos, commitCounts);
        cache.data = payload;
        cache.ts = now;
        return sendJson(res, 200, { ...payload, cached: false });
    } catch (error) {
        if (cache.data) {
            return sendJson(res, 200, { ...cache.data, cached: true, stale: true });
        }
        const status = error.status === 403 ? 429 : 502;
        return sendJson(res, status, { error: error.message || 'GitHub stats unavailable' });
    }
}
