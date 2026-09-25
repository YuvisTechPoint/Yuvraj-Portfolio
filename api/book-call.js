import nodemailer from 'nodemailer';
import { setCorsHeaders } from '../lib/cors.js';
import { isRateLimited as sharedRateLimit } from '../lib/rateLimit.js';

const HOST_EMAIL = process.env.BOOKING_HOST_EMAIL || process.env.GMAIL_USER || 'prasadyuvraj8805@gmail.com';
const HOST_NAME = process.env.BOOKING_HOST_NAME || 'Yuvraj Prasad';
const UPI_ID = process.env.BOOKING_UPI_ID || 'prasadyuvraj8805-5@okicici';
const AMOUNT = '10.00';
const DURATION = '30 minutes';
const SITE_URL = process.env.BOOKING_SITE_URL || 'https://yuvrajprasad.vercel.app';

const LIMITS = {
    name: 100,
    email: 254,
    phone: 20,
    topic: 500,
    ref: 40,
    date: 20,
    time: 10,
};

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;

async function isRateLimited(key) {
    return sharedRateLimit(key, { windowMs: RATE_WINDOW_MS, max: RATE_MAX });
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

function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

function makeBookingRef() {
    const t = Date.now().toString(36).toUpperCase();
    const r = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `CALL-${t}-${r}`;
}

function isTestBookingFields({ name = '', email = '', topic = '', ref = '' }) {
    if (process.env.BOOKING_ALLOW_TEST_SEND === 'true') return false;
    const emailNorm = String(email).toLowerCase();
    const blob = `${name} ${emailNorm} ${topic} ${ref}`.toLowerCase();
    return (
        /call-smoke|call-test|e2e|smoke\s*(test|guest)|demo\s*booking|test\s*report|mail\s*pipeline\s*smoke/.test(blob)
        || /@example\.(com|org|net)$/.test(emailNorm)
        || emailNorm.startsWith('test@')
    );
}

function isTestBooking(booking) {
    return isTestBookingFields(booking);
}

function isFutureSlotIst(date, time) {
    const slot = new Date(`${date}T${time}:00+05:30`);
    return !Number.isNaN(slot.getTime()) && slot.getTime() > Date.now();
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
            if (raw.length > 20_000) {
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

function pad2(n) {
    return String(n).padStart(2, '0');
}

/** Build ICS start/end in Asia/Kolkata as floating local times (no Z). */
function buildSessionTimes(date, time) {
    const [y, m, d] = date.split('-').map(Number);
    const [hh, mm] = time.split(':').map(Number);
    const start = new Date(y, m - 1, d, hh, mm, 0);
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    const fmt = (dt) =>
        `${dt.getFullYear()}${pad2(dt.getMonth() + 1)}${pad2(dt.getDate())}T${pad2(dt.getHours())}${pad2(dt.getMinutes())}00`;

    return {
        startLocal: fmt(start),
        endLocal: fmt(end),
        stamp: `${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}`,
    };
}

function buildReportText(booking) {
    const {
        name, email, phone, date, time, topic, ref, amount, duration, upiId, confirmMode,
    } = booking;

    return [
        '============================================================',
        '  CALL BOOKING CONFIRMATION — Yuvraj Prasad',
        '============================================================',
        '',
        `Generated: ${new Date().toISOString()}`,
        `Reference: ${ref}`,
        '',
        '--- SESSION ---',
        `Host: ${HOST_NAME} <${HOST_EMAIL}>`,
        `Duration: ${duration}`,
        `Fee: ₹${amount} INR`,
        `UPI: ${upiId}`,
        `Preferred slot (IST): ${date} ${time}`,
        '',
        '--- GUEST ---',
        `Name: ${name}`,
        `Email: ${email}`,
        `Phone / WhatsApp: ${phone}`,
        `Topic: ${topic}`,
        '',
        '--- NEXT STEPS ---',
        '1. Host verifies ₹10 UPI credit against this reference.',
        '2. Host confirms the slot with the guest by email / WhatsApp.',
        '3. Guest joins the agreed call channel at the scheduled IST time.',
        '',
        `This confirmation was generated by ${SITE_URL}`,
        '============================================================',
        '',
    ].join('\n');
}

function buildIcs(booking) {
    const { name, email, date, time, topic, ref, duration } = booking;
    const { startLocal, endLocal, stamp } = buildSessionTimes(date, time);
    const summary = `Call with ${HOST_NAME} (${ref})`;
    const description = [
        `30-min booked call with ${HOST_NAME}.`,
        `Ref: ${ref}`,
        `Topic: ${topic}`,
        `Guest: ${name} <${email}>`,
        `Fee: ₹${AMOUNT} via UPI ${UPI_ID}`,
    ].join('\\n');

    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Yuvraj Prasad Portfolio//Book a Call//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        `UID:${ref}@yuvrajprasad.vercel.app`,
        `DTSTAMP:${stamp}`,
        `DTSTART;TZID=Asia/Kolkata:${startLocal}`,
        `DTEND;TZID=Asia/Kolkata:${endLocal}`,
        `SUMMARY:${summary.replace(/[,;]/g, ' ')}`,
        `DESCRIPTION:${description.replace(/[,;]/g, ' ')}`,
        `ORGANIZER;CN=${HOST_NAME}:mailto:${HOST_EMAIL}`,
        `ATTENDEE;CN=${name.replace(/[,;]/g, ' ')};RSVP=TRUE:mailto:${email}`,
        `LOCATION:Online call (details by email / WhatsApp)`,
        `STATUS:CONFIRMED`,
        `TRANSP:OPAQUE`,
        `X-DURATION-NOTE:${duration}`,
        'END:VEVENT',
        'END:VCALENDAR',
        '',
    ].join('\r\n');
}

function buildAttachments(booking) {
    const report = buildReportText(booking);
    const ics = buildIcs(booking);
    const safeRef = booking.ref.replace(/[^A-Z0-9-]/gi, '');

    return {
        reportText: report,
        files: [
            {
                filename: `booking-confirmation-${safeRef}.txt`,
                content: Buffer.from(report, 'utf8'),
                contentType: 'text/plain; charset=utf-8',
            },
            {
                filename: `call-invite-${safeRef}.ics`,
                content: Buffer.from(ics, 'utf8'),
                contentType: 'text/calendar; charset=utf-8',
            },
        ],
    };
}

function buildGuestEmail(booking) {
    const { name, email, phone, date, time, topic, ref, amount, duration, upiId } = booking;
    const subject = `Booking confirmed — ${duration} call with ${HOST_NAME} (${ref})`;

    const text = [
        `Hi ${name},`,
        '',
        `Thanks for booking a ${duration} session with ${HOST_NAME}.`,
        '',
        'Your booking details',
        `-------------------`,
        `Reference: ${ref}`,
        `Date & time (IST): ${date} ${time}`,
        `Duration: ${duration}`,
        `Fee paid (UPI): ₹${amount} to ${upiId}`,
        `Topic: ${topic}`,
        `Your phone: ${phone}`,
        `Your email: ${email}`,
        '',
        'What happens next',
        '-----------------',
        `1. ${HOST_NAME} will verify your ₹${amount} UPI payment.`,
        '2. You will receive a confirmation / meeting link on this email or WhatsApp.',
        '3. Please join on time for your preferred IST slot.',
        '',
        'Attached',
        '--------',
        '- booking-confirmation-*.txt — your booking details',
        '- call-invite-*.ics — calendar invite (add to Google Calendar / Outlook)',
        '',
        'If you did not make this booking, reply to this email immediately.',
        '',
        `— ${HOST_NAME}`,
        HOST_EMAIL,
        `${SITE_URL}/#contact`,
    ].join('\n');

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#121212;max-width:560px">
        <h2 style="margin:0 0 12px">Booking confirmed</h2>
        <p>Hi <strong>${escapeHtml(name)}</strong>,</p>
        <p>Thanks for booking a <strong>${escapeHtml(duration)}</strong> session with <strong>${escapeHtml(HOST_NAME)}</strong>.</p>
        <table style="border-collapse:collapse;width:100%;margin:16px 0;font-size:14px">
          <tr><td style="padding:6px 0;border-bottom:1px solid #ddd"><strong>Reference</strong></td><td style="padding:6px 0;border-bottom:1px solid #ddd">${escapeHtml(ref)}</td></tr>
          <tr><td style="padding:6px 0;border-bottom:1px solid #ddd"><strong>Date &amp; time (IST)</strong></td><td style="padding:6px 0;border-bottom:1px solid #ddd">${escapeHtml(date)} ${escapeHtml(time)}</td></tr>
          <tr><td style="padding:6px 0;border-bottom:1px solid #ddd"><strong>Duration</strong></td><td style="padding:6px 0;border-bottom:1px solid #ddd">${escapeHtml(duration)}</td></tr>
          <tr><td style="padding:6px 0;border-bottom:1px solid #ddd"><strong>Fee (UPI)</strong></td><td style="padding:6px 0;border-bottom:1px solid #ddd">₹${escapeHtml(amount)} → ${escapeHtml(upiId)}</td></tr>
          <tr><td style="padding:6px 0;border-bottom:1px solid #ddd"><strong>Topic</strong></td><td style="padding:6px 0;border-bottom:1px solid #ddd">${escapeHtml(topic)}</td></tr>
        </table>
        <p><strong>Next steps</strong></p>
        <ol>
          <li>${escapeHtml(HOST_NAME)} verifies your UPI payment.</li>
          <li>You receive meeting details on this email or WhatsApp.</li>
          <li>Join on time for your IST slot.</li>
        </ol>
        <p>Attached: booking confirmation (<code>.txt</code>) and calendar invite (<code>.ics</code>).</p>
        <p style="color:#555;font-size:12px">If you did not make this booking, reply to this email immediately.</p>
        <p>— ${escapeHtml(HOST_NAME)}<br>${escapeHtml(HOST_EMAIL)}</p>
      </div>
    `;

    return { subject, text, html };
}

function buildHostEmail(booking) {
    const { name, email, phone, date, time, topic, ref, amount, duration, upiId, confirmMode } = booking;
    const subject = `New booking — ${name} — ${date} ${time} IST (${ref})`;

    const text = [
        `New paid call booking on ${SITE_URL}.`,
        '',
        `Reference: ${ref}`,
        `Amount: ₹${amount} INR`,
        `UPI: ${upiId}`,
        `Duration: ${duration}`,
        `Preferred slot (IST): ${date} ${time}`,
        '',
        'Guest',
        '-----',
        `Name: ${name}`,
        `Email: ${email}`,
        `Phone / WhatsApp: ${phone}`,
        `Topic: ${topic}`,
        '',
        'Action required',
        '---------------',
        `1. Verify ₹${amount} UPI credit (note / ref: ${ref}).`,
        '2. Reply to the guest with meeting link / WhatsApp confirmation.',
        '3. Attachments: booking confirmation (.txt) and calendar invite (.ics).',
        '',
        `— ${HOST_NAME} · Book a Call`,
    ].join('\n');

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#121212;max-width:560px">
        <h2 style="margin:0 0 12px">New call booking</h2>
        <p><strong>${escapeHtml(name)}</strong> booked a <strong>${escapeHtml(duration)}</strong> session.</p>
        <table style="border-collapse:collapse;width:100%;margin:16px 0;font-size:14px">
          <tr><td style="padding:6px 0;border-bottom:1px solid #ddd"><strong>Reference</strong></td><td style="padding:6px 0;border-bottom:1px solid #ddd">${escapeHtml(ref)}</td></tr>
          <tr><td style="padding:6px 0;border-bottom:1px solid #ddd"><strong>Amount</strong></td><td style="padding:6px 0;border-bottom:1px solid #ddd">₹${escapeHtml(amount)} → ${escapeHtml(upiId)}</td></tr>
          <tr><td style="padding:6px 0;border-bottom:1px solid #ddd"><strong>Slot (IST)</strong></td><td style="padding:6px 0;border-bottom:1px solid #ddd">${escapeHtml(date)} ${escapeHtml(time)}</td></tr>
          <tr><td style="padding:6px 0;border-bottom:1px solid #ddd"><strong>Guest</strong></td><td style="padding:6px 0;border-bottom:1px solid #ddd">${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</td></tr>
          <tr><td style="padding:6px 0;border-bottom:1px solid #ddd"><strong>Phone</strong></td><td style="padding:6px 0;border-bottom:1px solid #ddd">${escapeHtml(phone)}</td></tr>
          <tr><td style="padding:6px 0;border-bottom:1px solid #ddd"><strong>Topic</strong></td><td style="padding:6px 0;border-bottom:1px solid #ddd">${escapeHtml(topic)}</td></tr>
        </table>
        <p><strong>Action:</strong> verify UPI credit, then confirm the meeting with the guest. Report + calendar invite are attached.</p>
      </div>
    `;

    return { subject, text, html };
}

function toResendAttachments(files) {
    return files.map((f) => ({
        filename: f.filename,
        content: f.content.toString('base64'),
        content_type: f.contentType,
    }));
}

function toNodemailerAttachments(files) {
    return files.map((f) => ({
        filename: f.filename,
        content: f.content,
        contentType: f.contentType,
    }));
}

async function sendViaResend({ to, bcc, replyTo, subject, html, text, attachments }) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return false;

    const fromAddress = process.env.CONTACT_FROM || 'Portfolio Booking <onboarding@resend.dev>';
    const payload = {
        from: fromAddress,
        to: Array.isArray(to) ? to : [to],
        reply_to: replyTo,
        subject,
        html,
        text,
        attachments: toResendAttachments(attachments),
    };
    if (bcc) payload.bcc = Array.isArray(bcc) ? bcc : [bcc];

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error('Resend book-call error:', err);
        return false;
    }

    return true;
}

async function sendViaGmail({ to, bcc, replyTo, subject, html, text, attachments }) {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    if (!user || !pass) return false;

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
    });

    await transporter.sendMail({
        from: `"${HOST_NAME}" <${user}>`,
        to,
        bcc,
        replyTo,
        subject,
        text,
        html,
        attachments: toNodemailerAttachments(attachments),
    });

    return true;
}

async function deliverMail(mail) {
    // Gmail can deliver to arbitrary guest inboxes; prefer it for dual-party booking mail.
    try {
        if (await sendViaGmail(mail)) return 'gmail';
    } catch (err) {
        console.error('Gmail book-call send failed:', err?.response || err?.message || err);
    }
    try {
        if (await sendViaResend(mail)) return 'resend';
    } catch (err) {
        console.error('Resend book-call send failed:', err?.message || err);
    }
    return null;
}

export default async function handler(req, res) {
    setCorsHeaders(res, req);

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
    if (contentLength > 20_000) {
        return sendJson(res, 413, { error: 'Payload too large' });
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

    // Honeypot
    if (sanitizeField(payload.company, 200)) {
        return sendJson(res, 200, { success: true });
    }

    if (isTestBookingFields({
        name: sanitizeField(payload.name, LIMITS.name),
        email: sanitizeField(payload.email, LIMITS.email),
        topic: sanitizeField(payload.topic, LIMITS.topic),
        ref: sanitizeField(payload.ref, LIMITS.ref).toUpperCase(),
    })) {
        return sendJson(res, 400, { error: 'Invalid booking request.' });
    }

    const clientIp = getClientIp(req);
    if (await isRateLimited(clientIp)) {
        return sendJson(res, 429, { error: 'Too many requests. Try again in a minute.' });
    }

    const clientRef = sanitizeField(payload.ref, LIMITS.ref).toUpperCase();
    const refValid = /^CALL-[A-Z0-9]+-[A-Z0-9]+$/.test(clientRef);

    const booking = {
        name: sanitizeField(payload.name, LIMITS.name),
        email: sanitizeField(payload.email, LIMITS.email),
        phone: sanitizeField(payload.phone, LIMITS.phone),
        date: sanitizeField(payload.date, LIMITS.date),
        time: sanitizeField(payload.time, LIMITS.time),
        topic: sanitizeField(payload.topic, LIMITS.topic),
        ref: refValid ? clientRef : makeBookingRef(),
        amount: AMOUNT,
        duration: DURATION,
        upiId: UPI_ID,
        confirmMode: sanitizeField(payload.confirmMode || 'manual', 20),
    };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!booking.name || !booking.email || !booking.phone || !booking.date || !booking.time || !booking.topic) {
        return sendJson(res, 400, { error: 'Missing required booking fields' });
    }
    if (!emailRegex.test(booking.email)) {
        return sendJson(res, 400, { error: 'Invalid email address' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(booking.date) || !/^\d{2}:\d{2}$/.test(booking.time)) {
        return sendJson(res, 400, { error: 'Invalid date or time' });
    }
    if (!isFutureSlotIst(booking.date, booking.time)) {
        return sendJson(res, 400, { error: 'Choose a future date and time (IST).' });
    }
    if (isTestBooking(booking)) {
        return sendJson(res, 400, { error: 'Invalid booking request.' });
    }

    if (await isRateLimited(`${clientIp}:${booking.email.toLowerCase()}`)) {
        return sendJson(res, 429, { error: 'Too many attempts for this email. Try again in a minute.' });
    }

    const { files } = buildAttachments(booking);
    const guestMail = buildGuestEmail(booking);
    const hostMail = buildHostEmail(booking);

    try {
        // Guest mail BCCs host so both always get the report+ICS even if the
        // dedicated host send is blocked by Gmail daily limits.
        const guestOk = await deliverMail({
            to: booking.email,
            bcc: HOST_EMAIL,
            replyTo: HOST_EMAIL,
            subject: guestMail.subject,
            html: guestMail.html,
            text: guestMail.text,
            attachments: files,
        });

        let hostOk = false;
        if (!guestOk) {
            hostOk = await deliverMail({
                to: HOST_EMAIL,
                replyTo: booking.email,
                subject: hostMail.subject,
                html: hostMail.html,
                text: hostMail.text,
                attachments: files,
            });
        }

        if (!guestOk && !hostOk) {
            return sendJson(res, 503, {
                error: 'Email service not configured or sending failed. Set GMAIL_USER + GMAIL_APP_PASSWORD on Vercel.',
            });
        }

        return sendJson(res, 200, {
            success: true,
            ref: booking.ref,
            mailed: {
                guest: Boolean(guestOk),
                host: Boolean(guestOk) || Boolean(hostOk),
                via: guestOk || hostOk,
            },
        });
    } catch (error) {
        console.error('Book-call handler error:', error);
        return sendJson(res, 500, { error: 'Failed to send booking emails' });
    }
}
