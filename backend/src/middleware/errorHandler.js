const env = require('../config/env');
const ApiError = require('../utils/ApiError');

/**
 * Unmatched routes. Previously an unknown path fell through to Express's
 * default HTML 404, which a JSON client cannot parse.
 */
function notFound(req, _res, next) {
    next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * Central error handler.
 *
 * Every route delegates here, so error shape is defined once:
 *   { message, code?, errors? }
 * `message` is kept because the browser client already reads
 * `err.response.data.message`.
 */
// eslint-disable-next-line no-unused-vars -- Express requires the 4-arg signature
function errorHandler(err, req, res, _next) {
    let status = err.status || err.statusCode || 500;
    let message = err.message || 'Internal server error';
    let errors = err.errors;
    let code = err.code;

    // Mongoose schema validation — this is how an off-taxonomy category or an
    // out-of-range price surfaces if it ever bypasses the request validators.
    if (err.name === 'ValidationError' && err.errors) {
        status = 400;
        code = 'SCHEMA_VALIDATION_FAILED';
        errors = Object.values(err.errors).map((e) => ({
            field: e.path,
            message: e.message
        }));
        message = errors[0]?.message || 'Validation failed';
    } else if (err.name === 'CastError') {
        status = 400;
        code = 'INVALID_VALUE';
        message = `Invalid value for ${err.path}`;
    } else if (err.code === 11000) {
        status = 409;
        code = 'DUPLICATE_KEY';
        const field = Object.keys(err.keyPattern || {})[0] || 'value';
        message = `That ${field} is already registered`;
    } else if (err.name === 'MulterError') {
        status = 400;
        code = err.code;
        message =
            err.code === 'LIMIT_FILE_SIZE' ? 'Image is larger than 5 MB' : 'Image upload rejected';
    }

    // A deliberately-raised ApiError is an expected outcome, even at 5xx — "the
    // ML service is down" is not an internal fault and does not need a stack.
    // Anything else at 5xx is a real bug: log it in full, report it generically.
    if (err.expected) {
        if (status >= 500) console.warn(`[warn] ${req.method} ${req.originalUrl}: ${message}`);
    } else if (status >= 500) {
        console.error(`[error] ${req.method} ${req.originalUrl}`, err);
        if (env.isProduction) message = 'Internal server error';
    }

    const payload = { message };
    if (code) payload.code = code;
    if (errors?.length) payload.errors = errors;
    if (!env.isProduction && status >= 500 && !err.expected) payload.stack = err.stack;

    res.status(status).json(payload);
}

module.exports = { notFound, errorHandler };
