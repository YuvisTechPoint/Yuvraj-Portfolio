const { setCorsHeaders, isAllowedOrigin } = require('../lib/cors.js');

function handler(req, res) {
    setCorsHeaders(res, req, 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'GET') {
        res.setHeader('Content-Type', 'application/json');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!isAllowedOrigin(req)) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(403).json({ error: 'Forbidden', web3formsAccessKey: '' });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
        web3formsAccessKey: process.env.WEB3FORMS_ACCESS_KEY || '',
    });
}

module.exports = handler;
