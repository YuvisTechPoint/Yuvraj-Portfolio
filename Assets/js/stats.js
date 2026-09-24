(function () {
    'use strict';

    const GITHUB_USERNAME = 'YuvisTechPoint';
    const LEETCODE_USERNAME = 'YuvisTechPoint';
    const CLIENT_CACHE_TTL_MS = 15 * 60 * 1000;
    const LIVE_REFRESH_MS = 5 * 60 * 1000;
    const TOP_REPO_LIMIT = 5;
    const GH_CACHE_KEY = `gh_stats_cache_v3:${GITHUB_USERNAME}`;
    const LC_CACHE_KEY = `lc_stats_cache_v2:${LEETCODE_USERNAME}`;

    let refreshTimer = null;
    let statsStarted = false;

    function canUseApiProxy() {
        const { protocol, hostname } = window.location;
        return protocol !== 'file:' && hostname !== 'localhost' && hostname !== '127.0.0.1';
    }

    function readCache(key) {
        return window.ypReadCache?.(key) ?? null;
    }

    function writeCache(key, data) {
        window.ypWriteCache?.(key, data);
    }

    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    function formatDate(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function formatRelative(iso) {
        if (!iso) return '';
        const diff = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 48) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 14) return `${days}d ago`;
        return formatDate(iso);
    }

    function updateSyncBadge(prefix, syncedAt, cached, stale) {
        const el = document.getElementById(`${prefix}-sync-status`);
        if (!el) return;
        const label = stale ? 'STALE' : cached ? 'CACHED' : 'LIVE';
        const time = syncedAt ? formatRelative(syncedAt) : 'syncing';
        el.textContent = `${label} · ${time}`;
        el.className = `font-mono text-[8px] uppercase tracking-widest ${stale ? 'text-neo-red' : cached ? 'text-neo-yellow' : 'text-neo-green'}`;
    }

    async function fetchGitHubStats(forceFresh = false) {
        const cached = readCache(GH_CACHE_KEY);
        const isFresh = cached && Date.now() - cached.ts < CLIENT_CACHE_TTL_MS;
        if (!forceFresh && isFresh) return { ...cached.data, _clientCached: true };

        if (canUseApiProxy()) {
            const url = forceFresh ? '/api/github?fresh=1' : '/api/github';
            const response = await fetch(url, { headers: { Accept: 'application/json' } });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'GitHub stats failed');
            writeCache(GH_CACHE_KEY, data);
            return data;
        }

        const [userRes, reposRes] = await Promise.all([
            fetch(`https://api.github.com/users/${encodeURIComponent(GITHUB_USERNAME)}`, {
                headers: { Accept: 'application/vnd.github+json' },
            }),
            fetch(`https://api.github.com/users/${encodeURIComponent(GITHUB_USERNAME)}/repos?per_page=100&sort=updated`, {
                headers: { Accept: 'application/vnd.github+json' },
            }),
        ]);
        const user = await userRes.json();
        const repos = await reposRes.json();
        if (!userRes.ok) throw new Error(user.message || 'GitHub user error');

        const publicRepos = Array.isArray(repos) ? repos.filter((r) => !r.fork) : [];
        const totalStars = publicRepos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
        const mapRepo = (repo) => ({
            name: repo.name,
            url: repo.html_url,
            stars: repo.stargazers_count || 0,
            forks: repo.forks_count || 0,
            commits: 0,
            language: repo.language || null,
            pushedAt: repo.pushed_at || null,
            description: (repo.description || '').slice(0, 120),
        });
        const mapped = publicRepos.map(mapRepo);
        const data = {
            user: {
                login: user.login,
                publicRepos: user.public_repos,
                followers: user.followers,
                createdAt: user.created_at,
                htmlUrl: user.html_url,
            },
            totals: { stars: totalStars, forks: 0, repos: user.public_repos },
            topByCommits: [...mapped]
                .sort((a, b) => b.stars - a.stars || new Date(b.pushedAt) - new Date(a.pushedAt))
                .slice(0, TOP_REPO_LIMIT),
            topLanguages: [],
            syncedAt: new Date().toISOString(),
        };
        writeCache(GH_CACHE_KEY, data);
        return data;
    }

    async function fetchLeetCodeStats(forceFresh = false) {
        const cached = readCache(LC_CACHE_KEY);
        const isFresh = cached && Date.now() - cached.ts < CLIENT_CACHE_TTL_MS;
        if (!forceFresh && isFresh) return { ...cached.data, _clientCached: true };

        if (canUseApiProxy()) {
            const url = forceFresh ? '/api/leetcode?fresh=1' : '/api/leetcode';
            const response = await fetch(url, { headers: { Accept: 'application/json' } });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'LeetCode stats failed');
            writeCache(LC_CACHE_KEY, data);
            return data;
        }

        const response = await fetch(`https://alfa-leetcode-api.onrender.com/${encodeURIComponent(LEETCODE_USERNAME)}`);
        const profile = await response.json();
        if (!response.ok) throw new Error(profile.message || 'LeetCode error');
        const badgeRes = await fetch(`https://alfa-leetcode-api.onrender.com/${encodeURIComponent(LEETCODE_USERNAME)}/badges`);
        const badges = badgeRes.ok ? await badgeRes.json() : { activeBadge: null, badges: [] };
        const data = {
            username: LEETCODE_USERNAME,
            profile: {
                totalSolved: profile.totalSolved ?? 0,
                easySolved: profile.easySolved ?? 0,
                mediumSolved: profile.mediumSolved ?? 0,
                hardSolved: profile.hardSolved ?? 0,
                ranking: profile.ranking ?? null,
            },
            badges: {
                activeBadge: badges.activeBadge || null,
                badges: badges.badges || [],
            },
            syncedAt: new Date().toISOString(),
        };
        writeCache(LC_CACHE_KEY, data);
        return data;
    }

    function renderRepoRow(repo, rank) {
        const lang = repo.language ? `<span class="text-neo-green/90">${repo.language}</span>` : '';
        const commits = Number(repo.commits) || 0;
        const commitLabel = commits > 0
            ? `<span class="text-neo-green" title="Commits on default branch"><i class="ri-git-commit-fill"></i> ${commits.toLocaleString('en-IN')}</span>`
            : '<span class="text-gray-600">0 commits</span>';
        const stars = repo.stars > 0
            ? `<span class="text-neo-yellow" title="Stars"><i class="ri-star-fill"></i> ${repo.stars}</span>`
            : '';
        return `<li class="gh-repo-row flex items-start gap-3 font-mono text-xs border-b border-white/10 pb-2 last:border-0 last:pb-0">
            <span class="text-neo-green/70 shrink-0 w-5">#${rank}</span>
            <div class="min-w-0 flex-1">
                <a href="${repo.url}" target="_blank" rel="noopener noreferrer" class="text-white hover:text-neo-green transition-colors font-bold truncate block" title="${repo.name}">${repo.name}</a>
                ${repo.description ? `<p class="text-gray-500 text-[10px] mt-0.5 line-clamp-1">${repo.description}</p>` : ''}
            </div>
            <div class="shrink-0 text-right text-[10px] text-gray-400 space-y-0.5">
                <div>${commitLabel}</div>
                ${stars ? `<div>${stars}</div>` : ''}
                <div>${formatRelative(repo.pushedAt)}</div>
                ${lang ? `<div>${lang}</div>` : ''}
            </div>
        </li>`;
    }

    function renderGitHubAchievements(data) {
        const awards = [];
        const repos = data.totals?.repos ?? data.user?.publicRepos ?? 0;
        const stars = data.totals?.stars ?? 0;
        const followers = data.user?.followers ?? 0;
        if (repos >= 10) awards.push({ name: `${repos}+ Repos`, icon: 'ri-folder-open-fill' });
        if (stars >= 5) awards.push({ name: `${stars} Stars`, icon: 'ri-star-smile-fill' });
        if (followers >= 5) awards.push({ name: `${followers} Followers`, icon: 'ri-user-heart-fill' });
        (data.topLanguages || []).slice(0, 2).forEach((lang) => {
            awards.push({ name: lang.name, icon: 'ri-code-s-slash-line' });
        });
        if (!awards.length) awards.push({ name: 'Contributor', icon: 'ri-medal-line' });
        const repeated = [...awards, ...awards];
        const historyContainer = document.getElementById('gh-history-badges');
        if (!historyContainer) return;
        historyContainer.innerHTML = repeated.map((badge) =>
            `<div class="min-w-[70px] flex flex-col items-center group/badge"><div class="w-10 h-10 mb-2 relative group-hover/badge:-translate-y-1 transition-transform flex items-center justify-center border-2 border-white/20 rounded-full bg-white/5 shadow-[2px_2px_0_rgba(51,255,87,0.3)] hover:border-neo-green hover:shadow-[4px_4px_0_rgba(51,255,87,1)]"><i class="${badge.icon} text-neo-green text-xl drop-shadow-[2px_2px_0_rgba(0,0,0,1)]"></i></div><span class="text-[9px] font-mono text-gray-300 font-bold text-center w-full truncate px-1" title="${badge.name}">${badge.name}</span></div>`
        ).join('');
    }

    function renderGitHub(data) {
        const user = data.user || {};
        const totals = data.totals || {};
        setText('repos-count', String(user.publicRepos ?? totals.repos ?? '—'));
        setText('hero-repos-stat', String(user.publicRepos ?? totals.repos ?? '—'));
        setText('followers-count', String(user.followers ?? '—'));
        setText('total-contributions', String(totals.stars ?? 0));
        setText('total-contributions-grid', String(totals.stars ?? 0));
        setText('gh-forks-count', String(totals.forks ?? '—'));
        if (user.createdAt) {
            setText('created-at', new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }));
        }

        const statusEl = document.getElementById('gh-badges-status');
        if (statusEl) {
            statusEl.textContent = data.stale ? 'Stale' : data.cached || data._clientCached ? 'Synced' : 'Live';
            statusEl.classList.remove('animate-pulse', 'text-neo-yellow', 'text-neo-red');
            statusEl.classList.add('text-neo-green');
        }

        const activeContainer = document.getElementById('gh-active-badge');
        if (activeContainer) {
            const top = data.topByCommits?.[0];
            const rankTitle = top?.commits > 0
                ? `Top: ${top.name}`
                : top?.stars > 0
                    ? `Top: ${top.name}`
                    : (user.followers > 10 ? 'Popular Dev' : 'Open Sourcer');
            const iconClass = top?.commits > 0 ? 'ri-git-commit-fill' : top?.stars > 0 ? 'ri-star-smile-fill' : 'ri-git-repository-fill';
            activeContainer.innerHTML = `<div class="relative w-12 h-12 mb-2 group-hover:scale-110 transition-transform"><div class="w-full h-full rounded-full border-2 border-neo-green flex items-center justify-center bg-neo-green/10"><i class="${iconClass} text-neo-green text-2xl drop-shadow-[0_0_8px_rgba(51,255,87,0.5)]"></i></div></div><span class="text-[10px] font-mono text-white text-center leading-tight max-w-[100px] truncate" title="${rankTitle}">${rankTitle}</span>`;
        }

        renderGitHubAchievements(data);

        const topEl = document.getElementById('gh-top-repos');
        if (topEl) {
            const repos = (data.topByCommits || []).slice(0, TOP_REPO_LIMIT);
            topEl.innerHTML = repos.length
                ? `<ul class="space-y-2">${repos.map((repo, i) => renderRepoRow(repo, i + 1)).join('')}</ul>`
                : '<p class="font-mono text-xs text-gray-500">No public repositories found.</p>';
        }

        updateSyncBadge('gh', data.syncedAt, data.cached || data._clientCached, data.stale);
    }

    function renderLeetCode(data) {
        const profile = data.profile || {};
        const badgeData = data.badges || {};
        const statusEl = document.getElementById('lc-badges-status');
        if (statusEl) {
            if (data.available === false && !profile.totalSolved) {
                statusEl.textContent = 'Profile N/A';
                statusEl.classList.remove('animate-pulse', 'text-neo-yellow', 'text-neo-green');
                statusEl.classList.add('text-neo-red');
            } else {
                statusEl.textContent = data.stale ? 'Stale' : data.cached || data._clientCached ? 'Synced' : 'Live';
                statusEl.classList.remove('animate-pulse', 'text-neo-yellow', 'text-neo-red');
                statusEl.classList.add('text-neo-orange');
            }
        }

        setText('lc-total-solved', profile.totalSolved != null ? String(profile.totalSolved) : '—');
        setText('lc-easy-solved', profile.easySolved != null ? String(profile.easySolved) : '—');
        setText('lc-medium-solved', profile.mediumSolved != null ? String(profile.mediumSolved) : '—');
        setText('lc-hard-solved', profile.hardSolved != null ? String(profile.hardSolved) : '—');

        const rankingEl = document.getElementById('lc-ranking');
        if (rankingEl) {
            rankingEl.textContent = profile.ranking != null ? `#${Number(profile.ranking).toLocaleString('en-IN')}` : '—';
        }

        const activeContainer = document.getElementById('lc-active-badge');
        const activeBadge = badgeData.activeBadge;
        if (activeContainer) {
            if (activeBadge?.displayName) {
                const iconUrl = activeBadge.icon.startsWith('http') ? activeBadge.icon : `https://leetcode.com${activeBadge.icon}`;
                activeContainer.innerHTML = `<div class="relative w-12 h-12 mb-2 group-hover:scale-110 transition-transform"><img src="${iconUrl}" alt="${activeBadge.displayName}" class="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(255,159,28,0.5)]" loading="lazy"></div><span class="text-[10px] font-mono text-white text-center leading-tight max-w-[90px] truncate" title="${activeBadge.displayName}">${activeBadge.displayName}</span>`;
            } else if (profile.totalSolved > 0) {
                activeContainer.innerHTML = `<div class="relative w-12 h-12 mb-2"><div class="w-full h-full rounded-full border-2 border-neo-orange flex items-center justify-center bg-neo-orange/10"><i class="ri-trophy-fill text-neo-orange text-2xl"></i></div></div><span class="text-[10px] font-mono text-white text-center leading-tight">${profile.totalSolved} Solved</span>`;
            } else {
                activeContainer.innerHTML = '<i class="ri-lock-2-line text-2xl mb-1 text-gray-500"></i><span class="text-[10px] font-mono text-gray-500">No badge</span>';
            }
        }

        const historyContainer = document.getElementById('lc-history-badges');
        const badges = badgeData.badges || [];
        if (historyContainer) {
            if (badges.length) {
                const repeated = [...badges, ...badges, ...badges];
                historyContainer.innerHTML = repeated.map((badge) => {
                    const iconUrl = badge.icon.startsWith('http') ? badge.icon : `https://leetcode.com${badge.icon}`;
                    return `<div class="min-w-[70px] flex flex-col items-center group/badge"><div class="w-10 h-10 mb-2 relative group-hover/badge:-translate-y-1 transition-transform cursor-pointer border-2 border-transparent hover:border-neo-orange p-0.5 rounded shadow-[0_0_0_rgba(255,159,28,0)] hover:shadow-[2px_2px_0_rgba(255,159,28,1)]"><img src="${iconUrl}" alt="${badge.displayName}" class="w-full h-full object-contain drop-shadow-[2px_2px_0_rgba(0,0,0,1)]" loading="lazy"></div><span class="text-[9px] font-mono text-gray-300 font-bold text-center w-full truncate px-1" title="${badge.displayName}">${badge.displayName}</span></div>`;
                }).join('');
            } else if (profile.totalSolved > 0) {
                historyContainer.innerHTML = `<div class="text-[10px] font-mono text-gray-300 w-full text-center py-4">E ${profile.easySolved} · M ${profile.mediumSolved} · H ${profile.hardSolved}</div>`;
            } else {
                historyContainer.innerHTML = '<div class="text-[10px] font-mono text-gray-500 w-full text-center py-4">No badges yet · <a href="https://leetcode.com/u/YuvisTechPoint/" target="_blank" rel="noopener noreferrer" class="text-neo-orange hover:text-neo-yellow">View profile</a></div>';
            }
        }

        updateSyncBadge('lc', data.syncedAt, data.cached || data._clientCached, data.stale);
    }

    function renderGitHubError(error) {
        setText('repos-count', '—');
        setText('hero-repos-stat', '—');
        setText('followers-count', '—');
        setText('total-contributions', '—');
        setText('total-contributions-grid', '—');
        const statusEl = document.getElementById('gh-badges-status');
        if (statusEl) {
            const msg = error?.message || '';
            statusEl.textContent = msg.toLowerCase().includes('rate') ? 'Rate limited' : 'Unavailable';
            statusEl.className = 'text-neo-red text-[9px] font-mono uppercase tracking-widest';
        }
    }

    async function refreshCodingStats(forceFresh = false) {
        try {
            const [gh, lc] = await Promise.all([
                fetchGitHubStats(forceFresh),
                fetchLeetCodeStats(forceFresh).catch(() => null),
            ]);
            renderGitHub(gh);
            if (lc) renderLeetCode(lc);
        } catch (error) {
            console.error('Coding stats refresh error:', error);
            renderGitHubError(error);
        }
    }

    function scheduleLiveRefresh() {
        if (refreshTimer) clearInterval(refreshTimer);
        refreshTimer = setInterval(() => refreshCodingStats(true), LIVE_REFRESH_MS);
    }

    function startLiveRefreshWhenVisible() {
        const section = document.getElementById('coding-stats');
        if (!section || !('IntersectionObserver' in window)) {
            scheduleLiveRefresh();
            return;
        }
        const observer = new IntersectionObserver((entries) => {
            const visible = entries.some((entry) => entry.isIntersecting);
            if (visible) {
                if (!refreshTimer) scheduleLiveRefresh();
            } else if (refreshTimer) {
                clearInterval(refreshTimer);
                refreshTimer = null;
            }
        }, { threshold: 0.05 });
        observer.observe(section);
    }

    window.ypInitCodingStats = function initCodingStats() {
        if (statsStarted) {
            refreshCodingStats(true);
            return;
        }
        statsStarted = true;
        refreshCodingStats(false);
        startLiveRefreshWhenVisible();

        document.getElementById('gh-refresh-btn')?.addEventListener('click', () => refreshCodingStats(true));
        document.getElementById('lc-refresh-btn')?.addEventListener('click', () => refreshCodingStats(true));
    };

    window.ypRefreshCodingStats = refreshCodingStats;
    window.ypPrefetchGitHubHero = async function prefetchGitHubHero() {
        try {
            const data = await fetchGitHubStats(false);
            setText('hero-repos-stat', String(data.user?.publicRepos ?? data.totals?.repos ?? '—'));
        } catch {
            // ignore
        }
    };

    window.ypResetCodingStats = function resetCodingStats() {
        statsStarted = false;
        if (refreshTimer) {
            clearInterval(refreshTimer);
            refreshTimer = null;
        }
    };
})();
