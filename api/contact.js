import nodemailer from 'nodemailer';

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

function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
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

function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, status, body) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(status).json(body);
}

async function readJsonBody(req) {
    if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
        return req.body;
    }
    if (typeof req.body === 'string' && req.body.trim()) {
        try {
            return JSON.parse(req.body);
        } catch {
            return null;
        }
    }

    return new Promise((resolve, reject) => {
        let raw = '';
        req.on('data', (chunk) => {
            raw += chunk;
            if (raw.length > 12_000) {
                reject(new Error('Payload too large'));
            }
        });
        req.on('end', () => {
            if (!raw.trim()) {
                resolve(null);
                return;
            }
            try {
                resolve(JSON.parse(raw));
            } catch {
                resolve(null);
            }
        });
        req.on('error', reject);
    });
}

function buildMailContent({ name, email, subject, message }) {
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');
    const mailSubject = `[Portfolio] ${subject.replace(/[\r\n]/g, ' ')} from ${name.replace(/[\r\n]/g, ' ')}`.slice(0, 200);
    const textBody = `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\n${message}`;
    const htmlBody = `
        <h2>New portfolio message</h2>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Subject:</strong> ${safeSubject}</p>
        <p><strong>Message:</strong></p>
        <p>${safeMessage}</p>
    `;

    return { mailSubject, textBody, htmlBody };
}

async function sendViaResend({ name, email, subject, message }) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return false;

    const fromAddress = process.env.CONTACT_FROM || 'Portfolio Contact <onboarding@resend.dev>';
    const { mailSubject, htmlBody } = buildMailContent({ name, email, subject, message });

    const response = await fetch('https://api.resend.com/emails', {
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

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error('Resend error:', err);
        return false;
    }

    return true;
}

async function sendViaGmail({ name, email, subject, message }) {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    if (!user || !pass) return false;

    const { mailSubject, textBody, htmlBody } = buildMailContent({ name, email, subject, message });
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
    });

    await transporter.sendMail({
        from: user,
        to: CONTACT_TO,
        replyTo: email,
        subject: mailSubject,
        text: textBody,
        html: htmlBody,
    });

    return true;
}

export default async function handler(req, res) {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
        res.setHeader('Allow', 'POST, OPTIONS');
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        return sendJson(res, 405, { error: 'Method not allowed' });
    }

    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('application/json')) {
        return sendJson(res, 415, { error: 'Content-Type must be application/json' });
    }

    const contentLength = Number(req.headers['content-length'] || 0);
    if (contentLength > 12_000) {
        return sendJson(res, 413, { error: 'Payload too large' });
    }

    const clientIp = getClientIp(req);
    if (isRateLimited(clientIp)) {
        return sendJson(res, 429, { error: 'Too many requests. Try again in a minute.' });
    }

    let payload;
    try {
        payload = await readJsonBody(req);
    } catch {
        return sendJson(res, 413, { error: 'Payload too large' });
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return sendJson(res, 400, { error: 'Invalid request body' });
    }

    const company = sanitizeField(payload.company, 200);
    if (company) {
        return sendJson(res, 200, { success: true });
    }

    const name = sanitizeField(payload.name, LIMITS.name);
    const email = sanitizeField(payload.email, LIMITS.email);
    const message = sanitizeField(payload.message, LIMITS.message);
    const subject = sanitizeField(payload.subject || 'Portfolio contact', LIMITS.subject);

    if (!name || !email || !message) {
        return sendJson(res, 400, { error: 'Name, email, and message are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return sendJson(res, 400, { error: 'Invalid email address' });
    }

    if (isRateLimited(`${clientIp}:${email.toLowerCase()}`)) {
        return sendJson(res, 429, { error: 'Too many attempts for this email. Try again in a minute.' });
    }

    const mailPayload = { name, email, subject, message };

    try {
        // Prefer Gmail when configured (reliable guest/host delivery with App Password).
        try {
            if (await sendViaGmail(mailPayload)) {
                return sendJson(res, 200, { success: true, via: 'gmail' });
            }
        } catch (err) {
            console.error('Gmail contact send failed:', err?.response || err?.message || err);
        }

        try {
            if (await sendViaResend(mailPayload)) {
                return sendJson(res, 200, { success: true, via: 'resend' });
            }
        } catch (err) {
            console.error('Resend contact send failed:', err?.message || err);
        }

        return sendJson(res, 503, {
            error: 'Email service not configured. Set GMAIL_USER + GMAIL_APP_PASSWORD (recommended) or RESEND_API_KEY on Vercel.',
        });
    } catch (error) {
        console.error('Contact handler error:', error);
        return sendJson(res, 500, { error: 'Failed to send message' });
    }
}
