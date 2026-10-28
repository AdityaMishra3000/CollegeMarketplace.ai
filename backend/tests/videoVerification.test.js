const request = require('supertest');
const { app, connect, disconnect, clear, makeUser, makeProduct } = require('./helpers');

beforeAll(connect);
afterAll(disconnect);
beforeEach(clear);

// A minimal valid MP4 header buffer (ftypisom box)
function createDummyMp4(sizeBytes = 1024) {
    const buf = Buffer.alloc(Math.max(64, sizeBytes));
    // MP4 header: 4 bytes length, 'ftyp', 'isom', minor version
    buf.writeUInt32BE(28, 0);
    buf.write('ftyp', 4, 'ascii');
    buf.write('isom', 8, 'ascii');
    buf.writeUInt32BE(512, 12);
    buf.write('isomiso2mp41', 16, 'ascii');
    return buf;
}

describe('mobile-only video verification enforcement', () => {
    it('rejects verification video upload from web browser origin with 403', async () => {
        const { user, auth } = await makeUser();
        const product = await makeProduct(user);

        const res = await request(app)
            .post(`/api/products/${product._id}/verify-video`)
            .set('Authorization', auth)
            .set('Origin', 'http://localhost:5173')
            .set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')
            .set('X-App-Platform', 'android-native')
            .attach('video', createDummyMp4(), 'verify.mp4');

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('MOBILE_ONLY_VERIFICATION');
    });

    it('rejects verification video upload missing native platform header with 403', async () => {
        const { user, auth } = await makeUser();
        const product = await makeProduct(user);

        const res = await request(app)
            .post(`/api/products/${product._id}/verify-video`)
            .set('Authorization', auth)
            .set('User-Agent', 'Mozilla/5.0 (Linux; Android 14; Pixel 8)')
            .attach('video', createDummyMp4(), 'verify.mp4');

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('MOBILE_ONLY_VERIFICATION');
    });

    it('accepts verification video upload from native android app workflow', async () => {
        const { user, auth } = await makeUser();
        const product = await makeProduct(user);

        const res = await request(app)
            .post(`/api/products/${product._id}/verify-video`)
            .set('Authorization', auth)
            .set('X-App-Platform', 'android-native')
            .set('Origin', 'https://localhost')
            .set('User-Agent', 'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) Capacitor/8.0')
            .field('duration', '12.5')
            .attach('video', createDummyMp4(4096), 'verify.mp4');

        expect(res.status).toBe(200);
        expect(res.body.verification).toBeDefined();
        expect(['verified', 'review_required']).toContain(res.body.verification.status);
        expect(res.body.verification.duration_seconds).toBe(12.5);
    });

    it('rejects video duration shorter than 3 seconds', async () => {
        const { user, auth } = await makeUser();
        const product = await makeProduct(user);

        const res = await request(app)
            .post(`/api/products/${product._id}/verify-video`)
            .set('Authorization', auth)
            .set('X-App-Platform', 'android-native')
            .set('Origin', 'https://localhost')
            .set('User-Agent', 'Mozilla/5.0 (Linux; Android 14; wv)')
            .field('duration', '1.8')
            .attach('video', createDummyMp4(), 'verify.mp4');

        expect(res.status).toBe(200);
        expect(res.body.verification.status).toBe('rejected');
        expect(res.body.verification.details.explanation).toContain('too short');
    });

    it('rejects video duration longer than 30 seconds', async () => {
        const { user, auth } = await makeUser();
        const product = await makeProduct(user);

        const res = await request(app)
            .post(`/api/products/${product._id}/verify-video`)
            .set('Authorization', auth)
            .set('X-App-Platform', 'android-native')
            .set('Origin', 'https://localhost')
            .set('User-Agent', 'Mozilla/5.0 (Linux; Android 14; wv)')
            .field('duration', '35.0')
            .attach('video', createDummyMp4(), 'verify.mp4');

        expect(res.status).toBe(200);
        expect(res.body.verification.status).toBe('rejected');
        expect(res.body.verification.details.explanation).toContain('exceeds');
    });

    it('prevents clients from setting videoVerification directly via createProduct', async () => {
        const { auth } = await makeUser();

        const res = await request(app)
            .post('/api/products')
            .set('Authorization', auth)
            .send({
                title: 'Tamper Test Product',
                description: 'Attempting to inject verified status via body.',
                category: 'electronics',
                condition: 'good',
                price: 500,
                videoVerification: { status: 'verified' }
            });

        expect(res.status).toBe(201);
        expect(res.body.videoVerification.status).toBe('not_submitted');
    });

    it('prevents clients from tampering with videoVerification via updateProduct', async () => {
        const { user, auth } = await makeUser();
        const product = await makeProduct(user);

        const res = await request(app)
            .put(`/api/products/${product._id}`)
            .set('Authorization', auth)
            .send({
                title: 'Updated Title',
                videoVerification: { status: 'verified' }
            });

        expect(res.status).toBe(200);
        expect(res.body.product.videoVerification.status).toBe('not_submitted');
    });

    it('exposes videoVerification status in public product detail', async () => {
        const { user } = await makeUser();
        const product = await makeProduct(user, {
            videoVerification: {
                status: 'verified',
                duration_seconds: 14.2,
                file_size_bytes: 8400000,
                submitted_at: new Date(),
                verified_at: new Date(),
                details: {
                    checks: { format_valid: true, duration_valid: true, size_valid: true },
                    explanation: 'Verified'
                }
            }
        });

        const res = await request(app).get(`/api/products/${product._id}`);
        expect(res.status).toBe(200);
        expect(res.body.videoVerification).toBeDefined();
        expect(res.body.videoVerification.status).toBe('verified');
        expect(res.body.videoVerification.duration_seconds).toBe(14.2);
        // Ensure private internal filename is NOT leaked publicly
        expect(res.body.videoVerification.video_filename).toBeUndefined();
    });
});
