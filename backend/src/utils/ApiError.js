/**
 * An error with an intended HTTP status. Anything thrown that is *not* an
 * ApiError is treated as an unexpected failure by the error handler and
 * reported as a 500 without leaking internals to the client.
 */
class ApiError extends Error {
    constructor(status, message, options = {}) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.expected = true;
        if (options.code) this.code = options.code;
        if (options.errors) this.errors = options.errors;
        if (options.cause) this.cause = options.cause;
        Error.captureStackTrace?.(this, ApiError);
    }

    static badRequest(message, options) {
        return new ApiError(400, message, options);
    }
    static unauthorized(message = 'Authentication required', options) {
        return new ApiError(401, message, options);
    }
    static forbidden(message = 'Not permitted', options) {
        return new ApiError(403, message, options);
    }
    static notFound(message = 'Not found', options) {
        return new ApiError(404, message, options);
    }
    static conflict(message, options) {
        return new ApiError(409, message, options);
    }
    static unavailable(message = 'Service unavailable', options) {
        return new ApiError(503, message, options);
    }
}

module.exports = ApiError;
