const CONTACT_TO = 'prasadyuvraj8805@gmail.com';

const LIMITS = {
    name: 100,
    email: 254,
    subject: 120,
    message: 5000,
};

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;
const rateBuckets = new Map();

function jsonResponse(status, body) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
        },
    });
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function sanitizeField(value, maxLen) {
    return String(value || '')
        .replace(/[\r\n\t]/g, ' ')
        .trim()
        .slice(0, maxLen);
}

function getClientIp(request) {
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || 'unknown';
}

function isRateLimited(key) {
    const now = Date.now();
    const bucket = rateBuckets.get(key);

    if (!bucket || now - bucket.start > RATE_WINDOW_MS) {
        rateBuckets.set(key, { start: now, count: 1 });
        return false;
    }

    bucket.count += 1;
    if (bucket.count > RATE_MAX) return true;

    if (rateBuckets.size > 500) {
        for (const [entryKey, entry] of rateBuckets) {
            if (now - entry.start > RATE_WINDOW_MS) rateBuckets.delete(entryKey);
        }
    }

    return false;
}

export default async function handler(request) {
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                Allow: 'POST, OPTIONS',
                'Cache-Control': 'no-store',
            },
        });
    }

    if (request.method !== 'POST') {
        return jsonResponse(405, { error: 'Method not allowed' });
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        return jsonResponse(415, { error: 'Content-Type must be application/json' });
    }

    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 12_000) {
        return jsonResponse(413, { error: 'Payload too large' });
    }

    if (isRateLimited(getClientIp(request))) {
        return jsonResponse(429, { error: 'Too many requests. Try again in a minute.' });
    }

    let payload;
    try {
        payload = await request.json();
    } catch {
        return jsonResponse(400, { error: 'Invalid JSON body' });
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return jsonResponse(400, { error: 'Invalid request body' });
    }

    const company = sanitizeField(payload.company, 200);
    if (company) {
        return jsonResponse(200, { success: true });
    }

    const name = sanitizeField(payload.name, LIMITS.name);
    const email = sanitizeField(payload.email, LIMITS.email);
    const message = sanitizeField(payload.message, LIMITS.message);
    const subject = sanitizeField(payload.subject || 'Portfolio contact', LIMITS.subject);

    if (!name || !email || !message) {
        return jsonResponse(400, { error: 'Name, email, and message are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return jsonResponse(400, { error: 'Invalid email address' });
    }

    if (isRateLimited(`${getClientIp(request)}:${email.toLowerCase()}`)) {
        return jsonResponse(429, { error: 'Too many attempts for this email. Try again in a minute.' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        return jsonResponse(501, { error: 'Email service not configured' });
    }

    const fromAddress = process.env.CONTACT_FROM || 'Portfolio Contact <onboarding@resend.dev>';
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');
    const mailSubject = `[Portfolio] ${subject.replace(/[\r\n]/g, ' ')} from ${name.replace(/[\r\n]/g, ' ')}`.slice(0, 200);

    const htmlBody = `
        <h2>New portfolio message</h2>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Subject:</strong> ${safeSubject}</p>
        <p><strong>Message:</strong></p>
        <p>${safeMessage}</p>
    `;

    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: fromAddress,
                to: [CONTACT_TO],
                reply_to: email,
                subject: mailSubject,
                html: htmlBody,
            }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            console.error('Resend error:', err);
            return jsonResponse(502, { error: 'Failed to send message' });
        }

        return jsonResponse(200, { success: true });
    } catch (error) {
        console.error('Contact handler error:', error);
        return jsonResponse(500, { error: 'Failed to send message' });
    }
}
