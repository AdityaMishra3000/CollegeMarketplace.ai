/**
 * Test environment.
 *
 * Runs before the modules under test are loaded, so config validation sees these
 * values rather than the developer's .env.
 *
 * ML_SERVICE_URL points at a closed port on purpose: the suite asserts that the
 * marketplace keeps working when the ML service is unreachable, which is exactly
 * what the fire-and-forget fraud path is supposed to guarantee.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET =
    process.env.JWT_SECRET_TEST || 'test-only-secret-value-that-is-long-enough-abcdef';
process.env.MONGODB_URI =
    process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/college_marketplace_test';
process.env.ML_SERVICE_URL = process.env.ML_SERVICE_URL_TEST || 'http://127.0.0.1:59999';
process.env.ML_TIMEOUT_MS = '500';
process.env.ML_RECOMMEND_TIMEOUT_MS = '500';
process.env.CORS_ORIGINS = 'http://localhost:5173';
delete process.env.CLOUDINARY_CLOUD_NAME;
delete process.env.CLOUDINARY_API_KEY;
delete process.env.CLOUDINARY_API_SECRET;
