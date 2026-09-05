const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const env = require('./config/env');
const routes = require('./routes');
const ApiError = require('./utils/ApiError');
const { apiLimiter } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/errorHandler');

/**
 * Express application assembly.
 *
 * Kept separate from server.js so tests can mount the app with supertest without
 * binding a port or starting the process.
 */
function createApp() {
    const app = express();

    // Sits behind nginx in the compose setup; one hop, so client IPs used for
    // rate limiting are real rather than the proxy's.
    app.set('trust proxy', env.TRUST_PROXY_HOPS);
    app.disable('x-powered-by');

    app.use(helmet());
    app.use(compression());

    if (!env.isTest) {
        app.use(morgan(env.isProduction ? 'combined' : 'dev'));
    }

    /**
     * CORS was `origin: '*'` with `credentials: true` on an API that serves
     * authenticated requests — a wildcard that also silently disabled the
     * credentials flag. Now an explicit allowlist.
     */
    app.use(
        cors({
            origin(origin, callback) {
                // No Origin header: same-origin GET, curl, server-to-server.
                if (!origin) return callback(null, true);
                if (env.CORS_ORIGINS.includes(origin)) return callback(null, true);

                // Logged, because a rejected origin is almost always a
                // misconfiguration and a bare 403 in an access log does not say
                // which value needs adding or where.
                console.warn(
                    `[cors] rejected origin "${origin}" — allowed: ${env.CORS_ORIGINS.join(', ')}. ` +
                        'Add it to CORS_ORIGINS (backend/.env, or the backend service in docker-compose.yml).'
                );
                return callback(
                    ApiError.forbidden(`Origin not allowed: ${origin}`, { code: 'CORS_DENIED' })
                );
            },
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            maxAge: 600
        })
    );

    // Was 10mb. Product payloads are a few KB — images are uploaded separately
    // as multipart — so a smaller ceiling removes a cheap memory-pressure vector.
    app.use(express.json({ limit: '256kb' }));
    app.use(express.urlencoded({ extended: false, limit: '256kb' }));

    app.use('/api', apiLimiter, routes);

    app.use(notFound);
    app.use(errorHandler);

    return app;
}

module.exports = { createApp };
