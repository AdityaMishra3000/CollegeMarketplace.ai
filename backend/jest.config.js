/**
 * Jest configuration.
 *
 * `runInBand` (set in the npm script) plus a single worker: the suite talks to a
 * real MongoDB test database, so parallel workers would fight over it.
 */
module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    setupFiles: ['<rootDir>/tests/setEnv.js'],
    maxWorkers: 1,
    testTimeout: 20000,
    // Report open handles rather than hanging if a connection is left behind.
    detectOpenHandles: false,
    forceExit: false
};
