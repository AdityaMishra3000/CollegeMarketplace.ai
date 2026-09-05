const rateLimit = require('express-rate-limit');
const env = require('../config/env');

/**
 * Rate limiting.
 *
 * `express-rate-limit` was already a dependency and was imported by server.js
 * but never actually applied, so login had no brute-force protection at all.
 *
 * Limits are disabled under NODE_ENV=test so the suite is not throttled.
 */
const FIFTEEN_MINUTES = 15 * 60 * 1000;

const base = {
    windowMs: FIFTEEN_MINUTES,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => env.isTest
};

const message = (text) => ({ message: text });

/** Broad backstop for the whole API. Generous: the SPA is chatty by design. */
const apiLimiter = rateLimit({
    ...base,
    max: 600,
    message: message('Too many requests. Please slow down and try again shortly.')
});

/**
 * Credential endpoints. Successful logins are not counted, so an active user is
 * never locked out by their own traffic — only repeated failures accumulate.
 */
const authLimiter = rateLimit({
    ...base,
    max: 20,
    skipSuccessfulRequests: true,
    message: message('Too many authentication attempts. Please try again in 15 minutes.')
});

/** Registration is heavier than login (bcrypt + writes) and rarely repeated. */
const registerLimiter = rateLimit({
    ...base,
    max: 10,
    message: message('Too many accounts created from this address. Please try again later.')
});

/** Routes that fan out to the ML service and therefore cost real CPU. */
const aiLimiter = rateLimit({
    ...base,
    max: 120,
    message: message('AI request limit reached. Please wait a moment and try again.')
});

/** Mutating product routes. */
const writeLimiter = rateLimit({
    ...base,
    max: 100,
    message: message('Too many changes in a short period. Please try again shortly.')
});

/** Image uploads hit a third-party API and are billable. */
const uploadLimiter = rateLimit({
    ...base,
    max: 40,
    message: message('Upload limit reached. Please try again later.')
});

module.exports = {
    apiLimiter,
    authLimiter,
    registerLimiter,
    aiLimiter,
    writeLimiter,
    uploadLimiter
};
