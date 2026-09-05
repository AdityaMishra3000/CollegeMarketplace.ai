/**
 * Small shared helpers. Deliberately one file — these are a few lines each and
 * splitting them across modules would cost more than it explains.
 */

/**
 * Wrap an async route handler so a rejected promise reaches the Express error
 * handler. Without this, every handler needs its own try/catch and a missed one
 * hangs the request.
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Escape a user-supplied string for safe use inside a RegExp.
 *
 * Search terms used to be interpolated straight into `$regex`, which let a
 * client inject regex syntax and stall the server with a pathological pattern.
 */
function escapeRegex(input) {
    return String(input).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Copy only the listed keys from an object, skipping keys that were not sent.
 *
 * This is the defence against mass assignment: request bodies are never spread
 * into a document, so a client cannot set `seller`, `isFlagged`, `aiFraud` or
 * `views` by adding fields to its JSON.
 */
function pick(source, keys) {
    const out = {};
    if (!source || typeof source !== 'object') return out;
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
            out[key] = source[key];
        }
    }
    return out;
}

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;

/**
 * Normalize `page` / `limit` query params into skip/limit.
 * Values are already range-checked by the validation layer; this clamps again
 * so the helper is safe to call from scripts and tests too.
 */
function parsePagination(query = {}, { defaultLimit = DEFAULT_PAGE_SIZE } = {}) {
    const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
    const requested = Number.parseInt(query.limit, 10) || defaultLimit;
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, requested));
    return { page, limit, skip: (page - 1) * limit };
}

/** Envelope returned alongside every paginated list. */
function paginationMeta({ page, limit, total }) {
    return {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
        hasMore: page * limit < total
    };
}

/** Whole days between `date` and now, floored at 0. */
function accountAgeDays(date) {
    if (!date) return null;
    const ms = Date.now() - new Date(date).getTime();
    if (!Number.isFinite(ms)) return null;
    return Math.max(0, Math.floor(ms / 86_400_000));
}

module.exports = {
    asyncHandler,
    escapeRegex,
    pick,
    parsePagination,
    paginationMeta,
    accountAgeDays,
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE
};
