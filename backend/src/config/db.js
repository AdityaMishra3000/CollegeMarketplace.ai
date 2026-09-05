const mongoose = require('mongoose');
const env = require('./env');

/**
 * Connect to MongoDB and fail fast.
 *
 * The old implementation logged the connection error and carried on, so the
 * process would bind its port and then answer every request with a 500. A
 * server that cannot reach its database is not healthy and should not start.
 */
async function connect(uri = env.MONGODB_URI) {
    mongoose.set('strictQuery', true);

    // Surface post-startup connection loss instead of swallowing it.
    mongoose.connection.on('error', (err) => {
        console.error('[db] connection error:', err.message);
    });
    mongoose.connection.on('disconnected', () => {
        console.warn('[db] disconnected');
    });

    await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10_000,
        maxPoolSize: 20
    });

    if (!env.isTest) {
        console.log(`[db] connected to ${redact(uri)}`);
    }

    return mongoose.connection;
}

async function disconnect() {
    await mongoose.disconnect();
}

/** Strip credentials before a URI reaches the logs. */
function redact(uri) {
    return String(uri).replace(/\/\/[^@/]+@/, '//***:***@');
}

/** Used by GET /api/health. 1 === connected. */
function isConnected() {
    return mongoose.connection.readyState === 1;
}

module.exports = { connect, disconnect, isConnected, redact };
