/**
 * Sync GMAIL_* (and optional CONTACT_FROM / RESEND_*) from .env.local to Vercel.
 * Requires: npx vercel login && npx vercel link
 *
 * Usage: node scripts/sync-vercel-env.mjs
 */
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env.local');

if (!existsSync(envPath)) {
    console.error('Missing .env.local');
    process.exit(1);
}

const wanted = new Set([
    'GMAIL_USER',
    'GMAIL_APP_PASSWORD',
    'CONTACT_FROM',
    'RESEND_API_KEY',
    'BOOKING_SITE_URL',
    'BOOKING_UPI_ID',
    'BOOKING_HOST_EMAIL',
    'BOOKING_HOST_NAME',
    'GITHUB_TOKEN',
    'KV_REST_API_URL',
    'KV_REST_API_TOKEN',
    'VISITOR_BASELINE',
    'WEB3FORMS_ACCESS_KEY',
    'ALLOWED_ORIGINS',
]);

const defaults = {
    BOOKING_SITE_URL: 'https://yuvrajprasad.vercel.app',
    BOOKING_UPI_ID: 'prasadyuvraj8805-5@okicici',
    BOOKING_HOST_EMAIL: 'prasadyuvraj8805@gmail.com',
};

const vars = {};
for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (wanted.has(key) && val) vars[key] = val;
}

if (!vars.GMAIL_USER || !vars.GMAIL_APP_PASSWORD) {
    console.error('GMAIL_USER and GMAIL_APP_PASSWORD are required in .env.local');
    process.exit(1);
}

for (const [key, value] of Object.entries(defaults)) {
    if (!vars[key]) vars[key] = value;
}

const who = spawnSync('npx', ['vercel', 'whoami'], { encoding: 'utf8', shell: true });
if (who.status !== 0 || /Logged out|Error/i.test(who.stdout + who.stderr)) {
    console.error('Vercel CLI is logged out. Run: npx vercel login');
    process.exit(1);
}

const environments = ['production', 'preview', 'development'];

for (const [key, value] of Object.entries(vars)) {
    for (const env of environments) {
        // Remove existing value (ignore failures), then add fresh
        spawnSync('npx', ['vercel', 'env', 'rm', key, env, '--yes'], {
            encoding: 'utf8',
            shell: true,
            stdio: 'ignore',
        });

        const tmp = join(root, `.vercel-env-${key}-${env}.tmp`);
        writeFileSync(tmp, value, 'utf8');
        const add = spawnSync(
            'npx',
            ['vercel', 'env', 'add', key, env, '--force'],
            {
                encoding: 'utf8',
                shell: true,
                input: value + '\n',
                stdio: ['pipe', 'pipe', 'pipe'],
            },
        );
        try { unlinkSync(tmp); } catch { /* ignore */ }

        if (add.status !== 0) {
            console.error(`Failed ${key} @ ${env}:`, add.stderr || add.stdout);
            process.exit(1);
        }
        console.log(`Set ${key} → ${env}`);
    }
}

console.log('Done. Redeploy so serverless functions pick up the new env.');
