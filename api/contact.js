const CONTACT_TO = 'prasadyuvraj8805@gmail.com';

function jsonResponse(status, body) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

export default async function handler(request) {
    if (request.method !== 'POST') {
        return jsonResponse(405, { error: 'Method not allowed' });
    }

    let payload;
    try {
        payload = await request.json();
    } catch {
        return jsonResponse(400, { error: 'Invalid JSON body' });
    }

    const name = String(payload.name || '').trim();
    const email = String(payload.email || '').trim();
    const message = String(payload.message || '').trim();
    const subject = String(payload.subject || 'Portfolio contact').trim();

    if (!name || !email || !message) {
        return jsonResponse(400, { error: 'Name, email, and message are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return jsonResponse(400, { error: 'Invalid email address' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        return jsonResponse(501, { error: 'Email service not configured' });
    }

    const fromAddress = process.env.CONTACT_FROM || 'Portfolio Contact <onboarding@resend.dev>';
    const safeSubject = subject.replace(/[\r\n]/g, ' ').slice(0, 120);
    const htmlBody = `
        <h2>New portfolio message</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${safeSubject}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
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
                subject: `[Portfolio] ${safeSubject} from ${name}`,
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
