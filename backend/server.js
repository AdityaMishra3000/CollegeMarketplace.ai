/**
 * Process entry point.
 *
 * Responsibilities are deliberately narrow: validate configuration, connect to
 * the database, start listening, shut down cleanly. Everything else lives under
 * src/ (the previous version of this file held the schemas, the middleware, the
 * ML client and all 20-odd routes in 612 lines).
 */

const env = require('./src/config/env');
const db = require('./src/config/db');
const { createApp } = require('./src/app');

async function main() {
    // Fail before binding a port: a server that cannot reach its database used
    // to start anyway and answer every request with a 500.
    await db.connect();

    // Ensures the compound indexes declared on the models exist. Cheap when
    // they already do; skipped in production where index builds should be a
    // deliberate, monitored operation.
    if (!env.isProduction) {
        const mongoose = require('mongoose');
        await Promise.all(Object.values(mongoose.models).map((model) => model.syncIndexes()));
    }

    const app = createApp();
    const server = app.listen(env.PORT, () => {
        console.log(`[server] listening on port ${env.PORT} (${env.NODE_ENV})`);
        console.log(`[server] ml service: ${env.ML_SERVICE_URL}`);
        console.log(`[server] allowed origins: ${env.CORS_ORIGINS.join(', ')}`);
    });

    const shutdown = async (signal) => {
        console.log(`[server] ${signal} received, shutting down`);
        server.close(async () => {
            await db.disconnect();
            process.exit(0);
        });
        // Don't hang forever on a stuck connection.
        setTimeout(() => process.exit(1), 10_000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
    console.error('[server] failed to start:\n', err.message);
    process.exit(1);
});
