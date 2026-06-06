(function () {
    'use strict';

    const PROJECTS = [
        {
            title: 'Oracle Community',
            desc: 'Official site for Oracle Kolkata Community - a free learning hub for students and professionals to connect, collaborate, and build on Oracle Cloud. Courses, meetups, missions, and resources across Cloud Architecture, Database, DevOps, Analytics, Security, and AI/ML.',
            tags: ['React', 'Vite', 'Three.js', 'Oracle Cloud', 'Node.js'],
            dataTags: 'web web3',
            stagger: false,
            hoverClass: 'group-hover:text-red-600',
            live: 'https://oraclekol.vercel.app/',
            github: 'https://github.com/YuvisTechPoint/Oracle-Community',
            preview: 'iframe',
            previewUrl: 'https://oraclekol.vercel.app/',
            label: 'Oracle Kolkata Community'
        },
        {
            title: 'Edquate',
            desc: 'AI-powered learning OS - personal tutor with visual whiteboard, adaptive roadmaps, assessments, code lab, and career intelligence. Tutor, practice, and diagnostics in one platform for learners and campuses.',
            tags: ['AI Tutor', 'EdTech', 'Roadmaps', 'Code Lab', 'LLMs'],
            dataTags: 'web ai',
            stagger: true,
            hoverClass: 'group-hover:text-neo-orange',
            live: 'https://edquate.com',
            github: 'https://edquate.com',
            preview: 'iframe',
            previewUrl: 'https://edquate.com',
            label: 'Edquate.com Preview'
        },
        {
            title: 'EscrowX',
            desc: 'Full-stack decentralized escrow marketplace on Sepolia - buyers lock ETH in a smart contract, then release payment to sellers or refund themselves. Dashboard with role filters, MetaMask integration, and on-chain escrow lifecycle management.',
            tags: ['Solidity', 'Next.js', 'Hardhat', 'ethers.js', 'Web3'],
            dataTags: 'web web3',
            stagger: false,
            hoverClass: 'group-hover:text-neo-blue',
            live: 'https://escrowx-swart.vercel.app/',
            github: 'https://github.com/YuvisTechPoint/EscrowX',
            preview: 'iframe',
            previewUrl: 'https://escrowx-swart.vercel.app/',
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
            github: 'https://orcrys.com',
            preview: 'iframe',
            previewUrl: 'https://orcrys.com',
            label: 'Orcrys.com Preview'
        },
        {
            title: 'Vive Music',
            desc: 'Full-stack music instruments e-commerce platform built with Django - user auth, shopping cart, Razorpay payments, and AI image-based product search that classifies instruments and surfaces matching catalog items.',
            tags: ['Django', 'Python', 'Razorpay', 'AI Search', 'E-commerce'],
            dataTags: 'web ai',
            stagger: false,
            hoverClass: 'group-hover:text-neo-yellow',
            live: 'https://vibemusic-sandy.vercel.app/',
            github: 'https://github.com/YuvisTechPoint/Vive-Music',
            preview: 'screenshot',
            previewUrl: 'https://vibemusic-sandy.vercel.app/',
            label: 'vibemusic-sandy.vercel.app'
        },
        {
            title: 'Moon Watch',
            desc: 'Real estate platform for Moon Watch Reality - property discovery across Kolkata localities with filters for budget, BHK, and type, curated project listings, partner showcases, and client enquiry flows.',
            tags: ['Real Estate', 'Property Search', 'Listings', 'Web App'],
            dataTags: 'web',
            stagger: true,
            hoverClass: 'group-hover:text-neo-blue',
            live: 'https://moonwatch.in/',
            github: 'https://moonwatch.in/',
            preview: 'iframe',
            previewUrl: 'https://moonwatch.in/',
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
            github: 'https://calcuttahacks.xyz/',
            preview: 'iframe',
            previewUrl: 'https://calcuttahacks.xyz/',
            label: 'calcuttahacks.xyz'
        },
        {
            title: 'Jurisbloom Associates',
            desc: 'Professional law firm website for Jurisbloom Associates - practice areas across civil, criminal, cyber crime, POCSO, corporate, and property law with consultation booking, team profiles, case track record, and pan-India legal services.',
            tags: ['Legal Tech', 'Web App', 'Consultation', 'Responsive'],
            dataTags: 'web',
            stagger: true,
            hoverClass: 'group-hover:text-neo-purple',
            live: 'https://jurisbloomassociates.in/',
            github: 'https://jurisbloomassociates.in/',
            preview: 'iframe',
            previewUrl: 'https://jurisbloomassociates.in/',
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
            github: 'https://ceodebanjan.vercel.app/',
            preview: 'iframe',
            previewUrl: 'https://ceodebanjan.vercel.app/',
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
            preview: 'github',
            icon: 'ri-government-line',
            iconColor: 'text-neo-purple',
            sub: 'Decentralized Governance dApp'
        },
        {
            title: 'FortiFind',
            desc: 'Comprehensive security vulnerability scanner using a custom ML model alongside Flawfinder and Bandit. Analyzes individual files or entire Git repositories across multiple programming languages.',
            tags: ['Python', 'ML', 'Flawfinder', 'Bandit', 'Security'],
            dataTags: 'security ai',
            stagger: true,
            hoverClass: 'group-hover:text-neo-pink',
            github: 'https://github.com/YuvisTechPoint/Vulnerability-scanner',
            preview: 'github',
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
            preview: 'github',
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
            preview: 'github',
            icon: 'ri-smartphone-line',
            iconColor: 'text-neo-yellow',
            sub: 'Offline PDF Scanner · Android'
        }
    ];

    function screenshotUrl(url) {
        return `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`;
    }

    function livePreviewChrome(p) {
        return `<div class="absolute inset-0 flex items-end justify-between p-3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-[3]">
 <span class="font-mono text-white text-xs uppercase font-bold">${p.label}</span>
 <span class="font-mono text-neo-green text-[10px] uppercase">Live</span>
 </div>
 <a href="${p.live}" target="_blank" rel="noopener noreferrer" class="absolute inset-0 z-[4]" aria-label="Open ${p.title} live site"></a>`;
    }

    function previewHtml(p) {
        if (p.preview === 'iframe' || p.preview === 'screenshot') {
            return `<div class="project-live-preview block bg-black border-2 border-black aspect-video relative overflow-hidden mb-6 group-hover:shadow-none transition-all">
 <div class="project-preview-placeholder absolute inset-0 flex items-center justify-center bg-neo-blue/30 font-mono text-white text-sm uppercase z-0">${p.title} Preview</div>
 <img data-shot-src="${p.previewUrl}" alt="${p.title} live site preview" class="project-preview-shot absolute inset-0 w-full h-full object-cover object-top border-0 z-[2] pointer-events-none" decoding="async">
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

    function tagHtml(tags) {
        return tags.map((t) => `<span class="bg-neo-black text-white px-2 py-1">${t}</span>`).join('');
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

    function loadScreenshot(img) {
        const url = img.dataset.shotSrc;
        if (!url) return;

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
        }, { rootMargin: '120px', threshold: 0.01 });

        shots.forEach((img) => observer.observe(img));
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
<a href="${p.github}" target="_blank" rel="noopener noreferrer"
 class="w-12 h-12 shrink-0 border-2 border-black bg-neo-green flex items-center justify-center hover:bg-black hover:text-white transition-all cursor-hover shadow-hard-sm" title="View on GitHub">
<i class="ri-arrow-right-up-line text-2xl"></i>
</a>
</div>
</article>`).join('');
        initProjectPreviews();
        document.querySelectorAll('#projects-grid .reveal').forEach((el) => {
            const revealObserver = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('active');
                        revealObserver.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1 });
            revealObserver.observe(el);
        });
    };
})();
