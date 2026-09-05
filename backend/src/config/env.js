/**
 * Environment loading and validation.
 *
 * Config is resolved and checked exactly once, at boot. A misconfigured process
 * exits immediately instead of starting up and silently signing tokens with a
 * secret that is public knowledge.
 */

const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const isTest = NODE_ENV === 'test';

/**
 * Secrets that were committed to this repository at some point (server.js
 * fallback, docker-compose.yml, .env.example). Anyone with the git history can
 * forge an admin token with these, so they are refused outright.
 */
const BURNED_SECRETS = new Set([
    'college_marketplace_secret_key_2024',
    'college_marketplace_aiml_secret_2024',
    'your_super_secret_jwt_key',
    'secret',
    'changeme'
]);

const MIN_SECRET_LENGTH = 32;

const errors = [];

function required(name) {
    const value = process.env[name];
    if (!value || !value.trim()) {
        errors.push(`${name} is required but not set`);
        return undefined;
    }
    return value.trim();
}

function optionalNumber(name, fallback) {
    const raw = process.env[name];
    if (raw === undefined || raw === '') return fallback;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
        errors.push(`${name} must be a number (got "${raw}")`);
        return fallback;
    }
    return parsed;
}

// ── JWT secret: never has a default, in any environment ────────────────────
const JWT_SECRET = required('JWT_SECRET');

if (JWT_SECRET) {
    if (BURNED_SECRETS.has(JWT_SECRET)) {
        errors.push(
            'JWT_SECRET is one of the values previously committed to this repository. ' +
                'Generate a new one: openssl rand -base64 48'
        );
    } else if (JWT_SECRET.length < MIN_SECRET_LENGTH) {
        errors.push(
            `JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters (got ${JWT_SECRET.length}). ` +
                'Generate one: openssl rand -base64 48'
        );
    }
}

// ── Database ──────────────────────────────────────────────────────────────
// A localhost default is fine for development but would be a footgun in
// production, where pointing at the wrong database is a silent data problem.
let MONGODB_URI = process.env.MONGODB_URI?.trim();
if (!MONGODB_URI) {
    if (isProduction) {
        errors.push('MONGODB_URI is required when NODE_ENV=production');
    } else {
        MONGODB_URI = 'mongodb://127.0.0.1:27017/college_marketplace';
    }
}

// ── CORS ──────────────────────────────────────────────────────────────────
// Previously `origin: '*'` on an API that serves authenticated requests.
const DEFAULT_DEV_ORIGINS = [
    'http://localhost',
    'http://localhost:80',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173'
];

const CORS_ORIGINS = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

if (CORS_ORIGINS.length === 0) {
    if (isProduction) {
        errors.push(
            'CORS_ORIGINS is required when NODE_ENV=production ' +
                '(comma-separated list of allowed browser origins)'
        );
    } else {
        CORS_ORIGINS.push(...DEFAULT_DEV_ORIGINS);
    }
}

// ── Image uploads ─────────────────────────────────────────────────────────
// Cloudinary used to fall back to the literal string 'demo', which produced
// confusing upstream failures. Uploads are now explicitly disabled unless all
// three credentials are present.
const cloudinary = {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME?.trim() || null,
    apiKey: process.env.CLOUDINARY_API_KEY?.trim() || null,
    apiSecret: process.env.CLOUDINARY_API_SECRET?.trim() || null
};
cloudinary.enabled = Boolean(cloudinary.cloudName && cloudinary.apiKey && cloudinary.apiSecret);

if (errors.length > 0) {
    const message = ['Invalid configuration:', ...errors.map((e) => `  - ${e}`)].join('\n');
    // Throwing rather than process.exit keeps this testable.
    throw new Error(message);
}

module.exports = {
    NODE_ENV,
    isProduction,
    isTest,
    PORT: optionalNumber('PORT', 5000),
    MONGODB_URI,
    JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    CORS_ORIGINS,
    ML_SERVICE_URL: (process.env.ML_SERVICE_URL || 'http://localhost:5001').replace(/\/+$/, ''),
    ML_TIMEOUT_MS: optionalNumber('ML_TIMEOUT_MS', 5000),
    ML_RECOMMEND_TIMEOUT_MS: optionalNumber('ML_RECOMMEND_TIMEOUT_MS', 8000),
    RECOMMEND_CANDIDATE_LIMIT: optionalNumber('RECOMMEND_CANDIDATE_LIMIT', 200),
    RECOMMEND_CACHE_TTL_MS: optionalNumber('RECOMMEND_CACHE_TTL_MS', 60_000),
    TRUST_PROXY_HOPS: optionalNumber('TRUST_PROXY_HOPS', 1),
    cloudinary
};
