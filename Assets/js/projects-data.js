(function () {
    'use strict';

    function projectSlug(title) {
        return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    const PROJECTS = [
        {
            title: 'Oracle Community',
            role: 'Site Lead & Full Stack Developer',
            highlights: [
                'Built the official Oracle Kolkata Community hub with courses, meetups, and cloud resources.',
                'React + Vite frontend with Three.js visuals and Oracle Cloud integrations.',
                'Serves students and professionals across Cloud Architecture, DevOps, and AI/ML tracks.'
            ],
            desc: 'Official site for Oracle Kolkata Community - a free learning hub for students and professionals to connect, collaborate, and build on Oracle Cloud. Courses, meetups, missions, and resources across Cloud Architecture, Database, DevOps, Analytics, Security, and AI/ML.',
            tags: ['React', 'Vite', 'Three.js', 'Oracle Cloud', 'Node.js'],
            dataTags: 'web',
            stagger: false,
            hoverClass: 'group-hover:text-red-600',
            live: 'https://oraclekol.vercel.app/',
            github: 'https://github.com/YuvisTechPoint/Oracle-Community',
            preview: 'screenshot',
            previewUrl: 'https://oraclekol.vercel.app/',
            previewImage: 'Assets/images/previews/oracle-community.webp',
            label: 'Oracle Kolkata Community'
        },
        {
            title: 'Edquate',
            role: 'Product Engineer',
            highlights: [
                'AI-powered learning OS with visual whiteboard, adaptive roadmaps, and code lab.',
                'Combines tutor, practice, assessments, and career intelligence in one platform.',
                'Built for learners and campuses with LLM-driven personalization.'
            ],
            desc: 'AI-powered learning OS - personal tutor with visual whiteboard, adaptive roadmaps, assessments, code lab, and career intelligence. Tutor, practice, and diagnostics in one platform for learners and campuses.',
            tags: ['AI Tutor', 'EdTech', 'Roadmaps', 'Code Lab', 'LLMs'],
            dataTags: 'web ai',
            stagger: true,
            hoverClass: 'group-hover:text-neo-orange',
            live: 'https://edquate.com',
            preview: 'screenshot',
            previewUrl: 'https://edquate.com',
            previewImage: 'Assets/images/previews/edquate.webp',
            label: 'Edquate.com Preview'
        },
        {
            title: 'EscrowX',
            role: 'Full Stack Web3 Developer',
            highlights: [
                'Decentralized escrow marketplace on Sepolia with MetaMask integration.',
                'Smart contract lifecycle: lock ETH, release to seller, or buyer refund.',
                'Next.js dashboard with role filters and on-chain escrow management.'
            ],
            desc: 'Full-stack decentralized escrow marketplace on Sepolia - buyers lock ETH in a smart contract, then release payment to sellers or refund themselves. Dashboard with role filters, MetaMask integration, and on-chain escrow lifecycle management.',
            tags: ['Solidity', 'Next.js', 'Hardhat', 'ethers.js', 'Web3'],
            dataTags: 'web web3',
            stagger: false,
            hoverClass: 'group-hover:text-neo-blue',
            live: 'https://escrowx-swart.vercel.app/',
            github: 'https://github.com/YuvisTechPoint/EscrowX',
            preview: 'screenshot',
            previewUrl: 'https://escrowx-swart.vercel.app/',
            previewImage: 'Assets/images/previews/escrowx.webp',
            label: 'escrowx-swart.vercel.app',
            icon: 'ri-shield-check-line',
            iconColor: 'text-neo-green'
        },
        {
            title: 'Orcrys',
            desc: 'Technology company at the intersection of AI and infrastructure - building ventures across education, creator economy, and digital systems. Parent ecosystem behind Edquate, Glyphatic, and enterprise AI pipelines.',
            tags: ['AI Infrastructure', 'Ventures', 'Product Engineering', 'Cloud'],
            dataTags: 'web ai',
            stagger: true,
            hoverClass: 'group-hover:text-neo-purple',
            live: 'https://orcrys.com',
            preview: 'screenshot',
            previewUrl: 'https://orcrys.com',
            previewImage: 'Assets/images/previews/orcrys.webp',
            label: 'Orcrys.com Preview'
        },
        {
            title: 'Vive Music',
            desc: 'Full-stack music instruments e-commerce platform built with Django - user auth, shopping cart, Razorpay payments, and AI image-based product search that classifies instruments and surfaces matching catalog items.',
            tags: ['Django', 'Python', 'Razorpay', 'AI Search', 'E-commerce'],
            dataTags: 'web ai',
            stagger: false,
            hoverClass: 'group-hover:text-neo-yellow',
            live: 'https://vibemusic-official.vercel.app/',
            github: 'https://github.com/YuvisTechPoint/Vive-Music',
            preview: 'screenshot',
            previewUrl: 'https://vibemusic-official.vercel.app/',
            previewImage: 'Assets/images/previews/vive-music.webp',
            label: 'vibemusic-official.vercel.app'
        },
        {
            title: 'Mohasti',
            desc: 'Spiritual art and mindful stationery storefront — postcards, greeting cards, journals, and keepsakes with curated collections, secure UPI and card checkout, and a newsletter for studio drops and new launches.',
            tags: ['E-commerce', 'Stationery', 'Art', 'Web App'],
            dataTags: 'web',
            stagger: true,
            hoverClass: 'group-hover:text-neo-pink',
            live: 'https://mohasti.vercel.app/',
            preview: 'screenshot',
            previewUrl: 'https://mohasti.vercel.app/',
            previewImage: 'Assets/images/previews/mohasti.webp',
            label: 'mohasti.vercel.app'
        },
        {
            title: 'Moon Watch',
            desc: 'Real estate platform for Moon Watch Reality - property discovery across Kolkata localities with filters for budget, BHK, and type, curated project listings, partner showcases, and client enquiry flows.',
            tags: ['Real Estate', 'Property Search', 'Listings', 'Web App'],
            dataTags: 'web',
            stagger: true,
            hoverClass: 'group-hover:text-neo-blue',
            live: 'https://moonwatch.in/',
            preview: 'screenshot',
            previewUrl: 'https://moonwatch.in/',
            previewImage: 'Assets/images/previews/moon-watch.webp',
            label: 'moonwatch.in'
        },
        {
            title: 'Calcutta Hacks',
            desc: 'Official hackathon platform for Calcutta Hacks - Apex Circle\'s flagship student tech event with registration, schedules, tracks, and community updates for builders across Kolkata.',
            tags: ['Hackathon', 'Events', 'Community', 'Web'],
            dataTags: 'web',
            stagger: false,
            hoverClass: 'group-hover:text-neo-pink',
            live: 'https://calcuttahacks.xyz/',
            preview: 'screenshot',
            previewUrl: 'https://calcuttahacks.xyz/',
            previewImage: 'Assets/images/previews/calcutta-hacks.webp',
            label: 'calcuttahacks.xyz'
        },
        {
            title: 'BeetleX',
            desc: 'Full-stack hackathon platform — registration, team invites, submissions, judging workflows, and live standings during finals. Built for organizers who need operational tooling beyond spreadsheets and Discord bots.',
            tags: ['Hackathon', 'Events', 'Platform', 'Web'],
            dataTags: 'web',
            stagger: true,
            hoverClass: 'group-hover:text-neo-orange',
            live: 'https://beetlex.vercel.app/',
            preview: 'screenshot',
            previewUrl: 'https://beetlex.vercel.app/',
            previewImage: 'Assets/images/previews/beetlex.webp',
            label: 'beetlex.vercel.app'
        },
        {
            title: 'Qualytics',
            desc: 'Production-grade marketing site for an AI-augmented data quality platform — Next.js with Three.js hero visuals, D3 dashboards, Framer Motion scroll reveals, Prisma-backed demo and trial forms, and Sanity CMS content architecture.',
            tags: ['Next.js', 'Three.js', 'D3.js', 'Prisma', 'Data Quality'],
            dataTags: 'web ai',
            stagger: false,
            hoverClass: 'group-hover:text-neo-blue',
            github: 'https://github.com/YuvisTechPoint/Qualytics',
            preview: 'screenshot',
            previewUrl: 'https://github.com/YuvisTechPoint/Qualytics',
            previewImage: 'Assets/images/previews/qualytics.webp',
            label: 'github.com/YuvisTechPoint/Qualytics',
            previewBadge: 'Open Source',
        },
        {
            title: 'Jurisbloom Associates',
            desc: 'Professional law firm website for Jurisbloom Associates - practice areas across civil, criminal, cyber crime, POCSO, corporate, and property law with consultation booking, team profiles, case track record, and pan-India legal services.',
            tags: ['Legal Tech', 'Web App', 'Consultation', 'Responsive'],
            dataTags: 'web',
            stagger: true,
            hoverClass: 'group-hover:text-neo-purple',
            live: 'https://jurisbloomassociates.in/',
            preview: 'screenshot',
            previewUrl: 'https://jurisbloomassociates.in/',
            previewImage: 'Assets/images/previews/jurisbloom-associates.webp',
            label: 'jurisbloomassociates.in'
        },
        {
            title: 'CEO Debanjan',
            desc: 'Executive portfolio for Debanjan Sandhaki — Founder, CPO & CEO. Live venture showcases for Mewayz, PhantomX, Orcrys, and Edquate, plus case studies, partnership lanes, speaking topics, and contact flows for strategic advisory.',
            tags: ['Next.js', 'Portfolio', 'Executive', 'Venture Studio'],
            dataTags: 'web',
            stagger: false,
            hoverClass: 'group-hover:text-neo-green',
            live: 'https://ceodebanjan.vercel.app/',
            preview: 'screenshot',
            previewUrl: 'https://ceodebanjan.vercel.app/',
            previewImage: 'Assets/images/previews/ceo-debanjan.webp',
            label: 'ceodebanjan.vercel.app'
        },
        {
            title: 'CivicTrust',
            desc: 'A decentralized application for community governance and civic engagement. Leverages blockchain and social features to empower local decision-making - community map, decentralized voting, issue tracking, privacy-preserving auth, and MetaMask integration.',
            tags: ['Blockchain', 'Solidity', 'React.js', 'Node.js', 'MetaMask'],
            dataTags: 'web web3',
            stagger: false,
            hoverClass: 'group-hover:text-neo-red',
            github: 'https://github.com/YuvisTechPoint/CivicTrust',
            preview: 'screenshot',
            previewUrl: 'https://github.com/YuvisTechPoint/CivicTrust',
            previewImage: 'Assets/images/previews/civictrust.webp',
            label: 'github.com/YuvisTechPoint/CivicTrust',
            previewBadge: 'Open Source',
            icon: 'ri-government-line',
            iconColor: 'text-neo-purple',
            sub: 'Decentralized Governance dApp'
        },
        {
            title: 'FortiFind',
            role: 'Security Engineer',
            highlights: [
                'Custom ML model combined with Flawfinder and Bandit for vulnerability scanning.',
                'Analyzes individual files or entire Git repositories across multiple languages.',
                'Surfaces security issues for faster remediation in CI/CD workflows.'
            ],
            desc: 'Comprehensive security vulnerability scanner using a custom ML model alongside Flawfinder and Bandit. Analyzes individual files or entire Git repositories across multiple programming languages.',
            tags: ['Python', 'ML', 'Flawfinder', 'Bandit', 'Security'],
            dataTags: 'security ai',
            stagger: true,
            hoverClass: 'group-hover:text-neo-pink',
            github: 'https://github.com/YuvisTechPoint/Vulnerability-scanner',
            preview: 'screenshot',
            previewUrl: 'https://github.com/YuvisTechPoint/Vulnerability-scanner',
            previewImage: 'Assets/images/previews/fortifind.webp',
            label: 'github.com/YuvisTechPoint/Vulnerability-scanner',
            previewBadge: 'Open Source',
            icon: 'ri-shield-check-line',
            iconColor: 'text-neo-green',
            sub: 'ML Vulnerability Scanner'
        },
        {
            title: 'SkillHive',
            desc: 'AI-powered learning platform for gig workers and freelancers. Generates MCQs from educational videos and analyzes Gmail communications to identify skill gaps and deliver personalized learning paths.',
            tags: ['React.js', 'Python', 'AI/ML', 'Gmail API', 'LLMs'],
            dataTags: 'web ai',
            stagger: false,
            hoverClass: 'group-hover:text-neo-blue',
            github: 'https://github.com/YuvisTechPoint/SkillHive',
            preview: 'screenshot',
            previewUrl: 'https://github.com/YuvisTechPoint/SkillHive',
            previewImage: 'Assets/images/previews/skillhive.webp',
            label: 'github.com/YuvisTechPoint/SkillHive',
            previewBadge: 'Demo Offline',
            icon: 'ri-graduation-cap-line',
            iconColor: 'text-neo-blue',
            sub: 'AI Learning Platform',
            badge: 'Demo Offline'
        },
        {
            title: 'E-Signature',
            desc: 'Complete offline PDF scanner for Android - camera capture and gallery import, auto-crop and enhancement filters, multi-page scanning, OCR text extraction, handwritten digital signatures, and local PDF/JPG export with document management.',
            tags: ['Flutter', 'Dart', 'ML Kit OCR', 'PDF', 'Android'],
            dataTags: 'ai',
            stagger: true,
            hoverClass: 'group-hover:text-neo-orange',
            github: 'https://github.com/YuvisTechPoint/E-Signature',
            preview: 'screenshot',
            previewUrl: 'https://github.com/YuvisTechPoint/E-Signature',
            previewImage: 'Assets/images/previews/e-signature.webp',
            label: 'github.com/YuvisTechPoint/E-Signature',
            previewBadge: 'Open Source',
            icon: 'ri-smartphone-line',
            iconColor: 'text-neo-yellow',
            sub: 'Offline PDF Scanner · Android'
        }
    ];

    window.PORTFOLIO_PROJECTS = PROJECTS.map((p) => ({
        ...p,
        slug: projectSlug(p.title),
        role: p.role || 'Full Stack Developer',
        highlights: p.highlights || [p.desc]
    }));

    function screenshotUrl(url) {
        return `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`;
    }

    function tagHtml(tags) {
        return tags.map((t) => `<span class="bg-neo-black text-white px-2 py-1">${t}</span>`).join('');
    }

    function livePreviewChrome(p) {
        const badge = p.previewBadge || 'Live';
        const badgeClass = p.previewBadge ? 'text-neo-yellow' : 'text-neo-green';
        const href = p.live || p.github || '#';
        return `<div class="absolute inset-0 flex items-end justify-between p-3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-[3]">
 <span class="font-mono text-white text-xs uppercase font-bold">${p.label}</span>
 <span class="font-mono ${badgeClass} text-[10px] uppercase">${badge}</span>
 </div>
 <a href="${href}" target="_blank" rel="noopener noreferrer" class="absolute inset-0 z-[4]" aria-label="Open ${p.title}"></a>`;
    }

    function previewHtml(p) {
        if (p.preview === 'screenshot' || p.previewImage) {
            const imgAttrs = p.previewImage
                ? `src="${p.previewImage}"`
                : `data-shot-src="${p.previewUrl || p.live || ''}"`;
            return `<div class="project-live-preview block bg-black border-2 border-black aspect-video relative overflow-hidden mb-6 group-hover:shadow-none transition-all${p.previewImage ? ' is-loaded' : ''}">
 <div class="project-preview-placeholder absolute inset-0 flex items-center justify-center bg-neo-blue/30 font-mono text-white text-sm uppercase z-0">${p.title} Preview</div>
 <img ${imgAttrs} alt="${p.title} preview" class="project-preview-shot absolute inset-0 w-full h-full object-cover object-top border-0 z-[2] pointer-events-none" decoding="async"${p.previewImage ? '' : ' loading="lazy"'}>
 ${livePreviewChrome(p)}
 </div>`;
        }
        const badge = p.badge || 'Open Source';
        const badgeClass = p.badge ? 'text-neo-yellow' : 'text-neo-yellow';
        return `<a href="${p.github}" target="_blank" rel="noopener noreferrer"
 class="block bg-black border-2 border-black aspect-video relative overflow-hidden mb-6 group-hover:shadow-none transition-all cursor-hover">
 <div class="absolute inset-0 flex flex-col items-center justify-center bg-neo-purple/30 font-mono text-white z-0 p-4 text-center">
 <i class="${p.icon} text-5xl mb-3 ${p.iconColor}"></i>
 <span class="text-sm uppercase font-bold">${p.title} Preview</span>
 <span class="text-[10px] uppercase mt-1 text-white/70">${p.sub || ''}</span>
 </div>
 <div class="absolute inset-0 flex items-end justify-between p-3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-[2]">
 <span class="font-mono text-white text-xs uppercase font-bold">${p.github.replace('https://', '')}</span>
 <span class="font-mono ${badgeClass} text-[10px] uppercase">${badge}</span>
 </div>
 </a>`;
    }

    const MAX_SHOT_LOADS = 2;
    let activeShotLoads = 0;
    const shotLoadQueue = [];

    function finishShotLoad() {
        activeShotLoads = Math.max(0, activeShotLoads - 1);
        while (activeShotLoads < MAX_SHOT_LOADS && shotLoadQueue.length) {
            loadScreenshot(shotLoadQueue.shift());
        }
    }

    function canLoadExternalPreviews() {
        const consent = window.ypGetConsent?.();
        return consent !== 'decline';
    }

    function loadScreenshot(img) {
        const url = img.dataset.shotSrc;
        if (!url) return;

        if (!canLoadExternalPreviews()) {
            finishShotLoad();
            return;
        }

        if (activeShotLoads >= MAX_SHOT_LOADS) {
            shotLoadQueue.push(img);
            return;
        }

        activeShotLoads += 1;
        img.removeAttribute('data-shot-src');
        img.src = screenshotUrl(url);

        const wrap = img.closest('.project-live-preview');
        const markLoaded = () => {
            wrap?.classList.add('is-loaded');
            finishShotLoad();
        };

        if (img.complete && img.naturalWidth > 0) markLoaded();
        else {
            img.addEventListener('load', markLoaded, { once: true });
            img.addEventListener('error', finishShotLoad, { once: true });
        }
    }

    function initProjectPreviews() {
        const shots = document.querySelectorAll('#projects-grid .project-preview-shot[data-shot-src]');
        if (!shots.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                loadScreenshot(entry.target);
                observer.unobserve(entry.target);
            });
        }, { rootMargin: '200px', threshold: 0.01 });

        shots.forEach((img) => {
            if (canLoadExternalPreviews()) loadScreenshot(img);
            else observer.observe(img);
        });
    }

    function projectPrimaryUrl(p) {
        if (p.live) return p.live;
        if (p.github) return p.github;
        return '#';
    }

    window.renderProjectsGrid = function () {
        const grid = document.getElementById('projects-grid');
        if (!grid || grid.dataset.dynamic !== 'true') return;
        grid.innerHTML = PROJECTS.map((p) => `
<article class="reveal group bg-white border-4 border-black p-4 shadow-hard${p.stagger ? ' mt-0 md:mt-20' : ''}" data-tags="${p.dataTags}">
${previewHtml(p)}
<div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
<div class="min-w-0 flex-1">
<h3 class="text-2xl sm:text-3xl md:text-4xl font-black uppercase mb-2 ${p.hoverClass || ''} transition-colors glitch-hover">${p.title}</h3>
<p class="font-mono text-sm mb-4 max-w-xs">${p.desc}</p>
<div class="flex gap-2 font-mono text-xs font-bold flex-wrap">${tagHtml(p.tags)}</div>
</div>
<div class="flex gap-2 shrink-0 self-start">
<button type="button" class="project-details-btn px-3 py-2 border-2 border-black bg-neo-yellow font-mono text-xs font-bold hover:bg-black hover:text-white transition-all cursor-hover shadow-hard-sm" data-project-slug="${projectSlug(p.title)}" title="View project details">DETAILS</button>
<a href="${projectPrimaryUrl(p)}" target="_blank" rel="noopener noreferrer"
 class="w-12 h-12 border-2 border-black bg-neo-green flex items-center justify-center hover:bg-black hover:text-white transition-all cursor-hover shadow-hard-sm" title="Open project">
<i class="ri-arrow-right-up-line text-2xl"></i>
</a>
</div>
</div>
</article>`).join('');
        if (!grid.dataset.detailsBound) {
            grid.dataset.detailsBound = 'true';
            grid.addEventListener('click', (e) => {
                const btn = e.target.closest('.project-details-btn');
                if (!btn) return;
                e.preventDefault();
                window.openProjectModal?.(btn.dataset.projectSlug);
            });
        }
        initProjectPreviews();
        window.ypRefreshCursorMirror?.();
        window.observeReveals?.(grid);
    };

    window.addEventListener('yp-consent-changed', (event) => {
        if (event.detail?.choice === 'decline') return;
        initProjectPreviews();
    });
})();
