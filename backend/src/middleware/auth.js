const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { User } = require('../models/User');

/**
 * Sign an access token.
 *
 * `algorithms` is pinned on verify so a token claiming `alg: none` (or an
 * asymmetric algorithm) can never be accepted against our symmetric secret.
 */
function issueToken(userId) {
    return jwt.sign({ id: String(userId) }, env.JWT_SECRET, {
        expiresIn: env.JWT_EXPIRES_IN,
        algorithm: 'HS256'
    });
}

function readBearerToken(req) {
    const header = req.headers.authorization;
    if (!header) return null;
    const [scheme, token] = header.split(' ');
    if (!token || scheme.toLowerCase() !== 'bearer') return null;
    return token.trim() || null;
}

async function resolveUser(token) {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    // Loaded on every request so a deleted user or a demoted admin loses access
    // immediately rather than at token expiry.
    return User.findById(payload.id);
}

/** Errors jsonwebtoken raises for a token we should reject with a 401. */
const JWT_ERROR_NAMES = new Set(['TokenExpiredError', 'JsonWebTokenError', 'NotBeforeError']);

/**
 * Require a valid token.
 *
 * Every failure is 401. The old code answered 403 for an expired token, which
 * the browser client only handles for 401 — so an expired session was never
 * cleared and the user was stuck until they cleared storage by hand.
 */
async function authenticate(req, _res, next) {
    const token = readBearerToken(req);
    if (!token) {
        return next(ApiError.unauthorized('Authentication required', { code: 'NO_TOKEN' }));
    }
    try {
        const user = await resolveUser(token);
        if (!user) {
            return next(ApiError.unauthorized('Session is no longer valid', { code: 'NO_USER' }));
        }
        req.user = user;
        return next();
    } catch (err) {
        // Only token problems are 401. A database failure here must surface as
        // a 500, not be mislabelled as a bad credential.
        if (!JWT_ERROR_NAMES.has(err.name)) return next(err);
        const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID';
        const message =
            code === 'TOKEN_EXPIRED' ? 'Session expired, please sign in again' : 'Invalid token';
        return next(ApiError.unauthorized(message, { code }));
    }
}

/**
 * Attach `req.user` when a usable token is present, otherwise continue
 * anonymously. Used by endpoints that widen their response for signed-in
 * callers — seller contact details, for example.
 */
async function optionalAuthenticate(req, _res, next) {
    const token = readBearerToken(req);
    if (!token) return next();
    try {
        req.user = (await resolveUser(token)) || undefined;
    } catch (err) {
        if (!JWT_ERROR_NAMES.has(err.name)) return next(err);
        // An invalid token on a public endpoint is simply anonymous access.
        req.user = undefined;
    }
    return next();
}

function requireAdmin(req, _res, next) {
    if (!req.user) {
        return next(ApiError.unauthorized());
    }
    if (req.user.role !== 'admin') {
        return next(ApiError.forbidden('Admin access required'));
    }
    return next();
}

module.exports = { issueToken, authenticate, optionalAuthenticate, requireAdmin, readBearerToken };
