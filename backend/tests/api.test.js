const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app, connect, disconnect, clear, makeUser, makeAdmin, makeProduct } = require('./helpers');
const { CATEGORY_VALUES } = require('../src/config/taxonomy');
const { Product } = require('../src/models/Product');

beforeAll(connect);
afterAll(disconnect);
beforeEach(clear);

const validListing = {
    title: 'MacBook Air M1 2020',
    description: 'Barely used, includes original charger. Collect from the CS block.',
    category: 'electronics',
    condition: 'good',
    price: 42000
};

describe('auth', () => {
    test('first account becomes admin, later accounts do not', async () => {
        const first = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'First User',
                email: 'first@college.edu.in',
                password: 'password123',
                phone: '9876543210'
            })
            .expect(201);
        expect(first.body.user.role).toBe('admin');
        expect(first.body.token).toBeTruthy();
        // Phone is normalized to the canonical +91 form.
        expect(first.body.user.phone).toBe('+919876543210');

        const second = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Second User',
                email: 'second@college.edu.in',
                password: 'password123',
                phone: '+91 9876543211'
            })
            .expect(201);
        expect(second.body.user.role).toBe('student');
    });

    test('a client cannot promote itself to admin through the request body', async () => {
        await makeUser(); // so the caller is not the bootstrap admin
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Sneaky',
                email: 'sneaky@college.edu.in',
                password: 'password123',
                phone: '9876500000',
                role: 'admin'
            })
            .expect(201);
        expect(res.body.user.role).toBe('student');
    });

    test.each([
        ['non-.edu.in email', { email: 'someone@gmail.com' }, 'email'],
        ['short password', { password: 'short' }, 'password'],
        ['missing phone', { phone: undefined }, 'phone']
    ])('rejects registration with %s', async (_label, override, field) => {
        const payload = {
            name: 'Someone',
            email: 'someone@college.edu.in',
            password: 'password123',
            phone: '9876543212',
            ...override
        };
        if (override.phone === undefined) delete payload.phone;

        const res = await request(app).post('/api/auth/register').send(payload).expect(400);
        expect(res.body.code).toBe('VALIDATION_FAILED');
        expect(res.body.errors.map((e) => e.field)).toContain(field);
    });

    test('login failure does not reveal whether the account exists', async () => {
        const { user } = await makeUser();

        const wrongPassword = await request(app)
            .post('/api/auth/login')
            .send({ email: user.email, password: 'not-the-password' })
            .expect(400);
        const noSuchUser = await request(app)
            .post('/api/auth/login')
            .send({ email: 'ghost@college.edu.in', password: 'not-the-password' })
            .expect(400);

        expect(wrongPassword.body.message).toBe(noSuchUser.body.message);
    });

    test('login succeeds and never returns the password hash', async () => {
        const { user } = await makeUser();
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: user.email, password: 'password123' })
            .expect(200);

        expect(res.body.user.email).toBe(user.email);
        expect(JSON.stringify(res.body)).not.toContain('$2');
        expect(res.body.user.password).toBeUndefined();
    });

    test('an expired token is 401 (not 403) so the client can clear the session', async () => {
        const { user } = await makeUser();
        const expired = jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET, {
            expiresIn: '-1s'
        });

        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${expired}`)
            .expect(401);
        expect(res.body.code).toBe('TOKEN_EXPIRED');
    });

    test('a token signed with a different secret is rejected', async () => {
        const { user } = await makeUser();
        const forged = jwt.sign({ id: String(user._id) }, 'college_marketplace_secret_key_2024');

        await request(app).get('/api/auth/me').set('Authorization', `Bearer ${forged}`).expect(401);
    });
});

describe('taxonomy contract enforcement', () => {
    test('the published taxonomy is served to clients', async () => {
        const res = await request(app).get('/api/meta/taxonomy').expect(200);
        expect(res.body.categories.map((c) => c.value)).toEqual(CATEGORY_VALUES);
        expect(res.body.conditions.map((c) => c.value)).toContain('like_new');
    });

    test('an unknown category is rejected loudly, naming the valid values', async () => {
        const { auth } = await makeUser();
        const res = await request(app)
            .post('/api/products')
            .set('Authorization', auth)
            .send({ ...validListing, category: 'gadgets' })
            .expect(400);

        expect(res.body.code).toBe('VALIDATION_FAILED');
        expect(res.body.message).toContain('category must be one of');
        for (const value of CATEGORY_VALUES) expect(res.body.message).toContain(value);
    });

    test('an unknown condition is rejected rather than defaulting to "good"', async () => {
        const { auth } = await makeUser();
        const res = await request(app)
            .post('/api/products')
            .set('Authorization', auth)
            .send({ ...validListing, condition: 'brand-new' })
            .expect(400);
        expect(res.body.message).toContain('condition must be one of');
    });

    test('the legacy "like-new" alias is accepted and normalized to like_new', async () => {
        const { auth } = await makeUser();
        const res = await request(app)
            .post('/api/products')
            .set('Authorization', auth)
            .send({ ...validListing, condition: 'like-new' })
            .expect(201);

        expect(res.body.condition).toBe('like_new');
        const stored = await Product.findById(res.body._id).lean();
        expect(stored.condition).toBe('like_new');
    });

    test('an off-taxonomy filter is a 400, not silently ignored', async () => {
        await request(app).get('/api/products?category=gadgets').expect(400);
        await request(app).get('/api/products?condition=mint').expect(400);
    });

    test('"all" and empty filters mean no filter', async () => {
        const { user } = await makeUser();
        await makeProduct(user, { category: 'textbooks' });
        await makeProduct(user, { category: 'appliances', title: 'Electric Kettle 1.5L' });

        const res = await request(app)
            .get('/api/products?category=all&condition=&search=')
            .expect(200);
        expect(res.body.products).toHaveLength(2);
    });

    test('every taxonomy category is actually storable', async () => {
        const { auth } = await makeUser();
        for (const category of CATEGORY_VALUES) {
            await request(app)
                .post('/api/products')
                .set('Authorization', auth)
                .send({ ...validListing, category })
                .expect(201);
        }
        expect(await Product.countDocuments()).toBe(CATEGORY_VALUES.length);
    });
});

describe('mass assignment', () => {
    const hostile = {
        views: 99999,
        isFlagged: false,
        isSold: true,
        isActive: false,
        status: 'sold_out',
        aiFraud: { risk_score: 0, risk_level: 'LOW', recommendation: 'totally safe', flags: [] }
    };

    test('create ignores fields the client is not allowed to set', async () => {
        const { user, auth } = await makeUser();
        const other = await makeUser();

        const res = await request(app)
            .post('/api/products')
            .set('Authorization', auth)
            .send({ ...validListing, ...hostile, seller: String(other.user._id) })
            .expect(201);

        const stored = await Product.findById(res.body._id).lean();
        expect(String(stored.seller)).toBe(String(user._id)); // not `other`
        expect(stored.views).toBe(0);
        expect(stored.isSold).toBe(false);
        expect(stored.isActive).toBe(true);
        expect(stored.aiFraud.risk_level).toBeNull();
    });

    test('update cannot overwrite the cached fraud verdict or the owner', async () => {
        const { user, auth } = await makeUser();
        const other = await makeUser();
        const product = await makeProduct(user, {
            views: 12,
            isFlagged: true,
            aiFraud: {
                risk_score: 80,
                risk_level: 'VERY_HIGH',
                recommendation: 'Do not proceed.',
                is_flagged: true,
                flags: []
            }
        });

        await request(app)
            .put(`/api/products/${product._id}`)
            .set('Authorization', auth)
            .send({ price: 500, ...hostile, seller: String(other.user._id) })
            .expect(200);

        const stored = await Product.findById(product._id).lean();
        expect(stored.price).toBe(500);
        expect(String(stored.seller)).toBe(String(user._id));
        expect(stored.views).toBe(12);
        // Price changed, so the verdict was invalidated — but never replaced by
        // the attacker-supplied "LOW".
        expect(stored.aiFraud.risk_level).not.toBe('LOW');
    });

    test('quantity drives availability; the client cannot set it directly', async () => {
        const { user, auth } = await makeUser();
        const product = await makeProduct(user, { quantity: 3 });

        await request(app)
            .put(`/api/products/${product._id}`)
            .set('Authorization', auth)
            .send({ quantity: 0 })
            .expect(200);

        const sold = await Product.findById(product._id).lean();
        expect(sold).toMatchObject({ isSold: true, isActive: false, status: 'sold_out' });
    });
});

describe('seller PII', () => {
    test('the public listing exposes no email or phone number', async () => {
        const { user } = await makeUser();
        await makeProduct(user);

        const res = await request(app).get('/api/products').expect(200);
        const [card] = res.body.products;

        expect(card.seller.name).toBe(user.name);
        expect(card.seller.email).toBeUndefined();
        expect(card.seller.phone).toBeUndefined();
        expect(card.sellerPhone).toBeUndefined();
        expect(JSON.stringify(res.body)).not.toContain(user.email);
        expect(JSON.stringify(res.body)).not.toContain(user.phone);
    });

    test('an anonymous product page exposes no contact details', async () => {
        const { user } = await makeUser();
        const product = await makeProduct(user);

        const res = await request(app).get(`/api/products/${product._id}`).expect(200);
        expect(res.body.seller.name).toBe(user.name);
        expect(res.body.seller.email).toBeUndefined();
        expect(res.body.sellerPhone).toBeUndefined();
    });

    test('a signed-in buyer does get contact details on the product page', async () => {
        const { user } = await makeUser();
        const buyer = await makeUser();
        const product = await makeProduct(user);

        const res = await request(app)
            .get(`/api/products/${product._id}`)
            .set('Authorization', buyer.auth)
            .expect(200);

        expect(res.body.seller.email).toBe(user.email);
        expect(res.body.seller.phone).toBe(user.phone);
        expect(res.body.sellerPhone).toBe(user.phone);
    });

    test('the public seller listing exposes no email', async () => {
        const { user } = await makeUser();
        await makeProduct(user);

        const res = await request(app).get(`/api/users/${user._id}/products`).expect(200);
        expect(res.body.products).toHaveLength(1);
        expect(JSON.stringify(res.body)).not.toContain(user.email);
    });
});

describe('ownership', () => {
    test('a user cannot edit or delete another seller’s listing', async () => {
        const { user } = await makeUser();
        const intruder = await makeUser();
        const product = await makeProduct(user);

        await request(app)
            .put(`/api/products/${product._id}`)
            .set('Authorization', intruder.auth)
            .send({ price: 1 })
            .expect(403);

        await request(app)
            .delete(`/api/products/${product._id}`)
            .set('Authorization', intruder.auth)
            .expect(403);

        await request(app)
            .patch(`/api/products/${product._id}/sell`)
            .set('Authorization', intruder.auth)
            .expect(403);
    });

    test('an admin can moderate any listing', async () => {
        const { user } = await makeUser();
        const admin = await makeAdmin();
        const product = await makeProduct(user);

        await request(app)
            .delete(`/api/products/${product._id}`)
            .set('Authorization', admin.auth)
            .expect(200);
    });

    test('writes require authentication', async () => {
        await request(app).post('/api/products').send(validListing).expect(401);
    });
});

describe('pagination, querying and search', () => {
    async function seed(count, seller) {
        for (let i = 0; i < count; i += 1) {
            await makeProduct(seller, {
                title: `Listing number ${i}`,
                price: 100 + i,
                createdAt: new Date(Date.now() - i * 60_000)
            });
        }
    }

    test('the listing is paginated and reports the total', async () => {
        const { user } = await makeUser();
        await seed(30, user);

        const first = await request(app).get('/api/products?limit=10').expect(200);
        expect(first.body.products).toHaveLength(10);
        expect(first.body.pagination).toMatchObject({
            page: 1,
            limit: 10,
            total: 30,
            pages: 3,
            hasMore: true
        });

        const last = await request(app).get('/api/products?limit=10&page=3').expect(200);
        expect(last.body.pagination.hasMore).toBe(false);
        // Distinct pages, no overlap.
        const firstIds = first.body.products.map((p) => p._id);
        expect(last.body.products.some((p) => firstIds.includes(p._id))).toBe(false);
    });

    test('an oversized page limit is rejected', async () => {
        await request(app).get('/api/products?limit=5000').expect(400);
        await request(app).get('/api/products?page=0').expect(400);
    });

    test('sorting is restricted to known options', async () => {
        const { user } = await makeUser();
        await seed(3, user);

        const asc = await request(app).get('/api/products?sort=price_asc').expect(200);
        const prices = asc.body.products.map((p) => p.price);
        expect(prices).toEqual([...prices].sort((a, b) => a - b));

        await request(app).get('/api/products?sort=; drop everything').expect(400);
    });

    test('regex metacharacters in search are treated as literal text', async () => {
        const { user } = await makeUser();
        await makeProduct(user, { title: 'Calculus (Early Transcendentals)' });
        await makeProduct(user, { title: 'Plain textbook' });

        // Would match everything if the term were interpolated into a regex.
        const wildcard = await request(app).get('/api/products?search=.*').expect(200);
        expect(wildcard.body.products).toHaveLength(0);

        const literal = await request(app)
            .get('/api/products?search=' + encodeURIComponent('(Early'))
            .expect(200);
        expect(literal.body.products).toHaveLength(1);

        // A pattern that would be catastrophic to backtrack is just a string.
        await request(app)
            .get('/api/products?search=' + encodeURIComponent('(a+)+$'))
            .expect(200);
    });

    test('price filters work and are validated', async () => {
        const { user } = await makeUser();
        await seed(10, user); // prices 100..109

        const res = await request(app).get('/api/products?minPrice=105&maxPrice=107').expect(200);
        expect(res.body.products.map((p) => p.price).sort()).toEqual([105, 106, 107]);
    });

    test('an invalid product id is a 400, not a 500', async () => {
        await request(app).get('/api/products/not-an-id').expect(400);
        await request(app).get('/api/ai/recommendations/not-an-id').expect(400);
    });

    test('unknown routes return JSON, not HTML', async () => {
        const res = await request(app).get('/api/nope').expect(404);
        expect(res.body.message).toContain('Route not found');
    });

    test('a disallowed CORS origin is a 403, not a 500', async () => {
        const denied = await request(app)
            .get('/api/products')
            .set('Origin', 'http://evil.example.com')
            .expect(403);
        expect(denied.body.code).toBe('CORS_DENIED');

        const allowed = await request(app)
            .get('/api/products')
            .set('Origin', 'http://localhost:5173')
            .expect(200);
        expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });
});

/**
 * ML_SERVICE_URL points at a closed port for the whole suite (see setEnv.js), so
 * these tests describe what the marketplace does when the ML service is down.
 */
describe('resilience when the ML service is unavailable', () => {
    test('creating a listing still succeeds — fraud analysis is not on the request path', async () => {
        const { auth } = await makeUser();
        const res = await request(app)
            .post('/api/products')
            .set('Authorization', auth)
            .send(validListing)
            .expect(201);

        expect(res.body.title).toBe(validListing.title);
        expect(res.body.aiFraud).toBeNull(); // analysis pending, not blocking
    });

    test('the product page renders: recommendations degrade instead of failing', async () => {
        const { user } = await makeUser();
        const product = await makeProduct(user);

        const res = await request(app)
            .get(`/api/ai/recommendations/${product._id}`)
            .expect(200);
        expect(res.body).toMatchObject({ recommendations: [], count: 0, unavailable: true });
    });

    test('a cached verdict is served without contacting the ML service', async () => {
        const { user } = await makeUser();
        const product = await makeProduct(user, {
            aiFraud: {
                risk_score: 30,
                risk_level: 'MEDIUM',
                recommendation: 'Verify item before payment.',
                is_flagged: false,
                flags: [{ type: 'INCOMPLETE_LISTING', message: 'short description' }]
            }
        });

        const res = await request(app).get(`/api/ai/fraud-check/${product._id}`).expect(200);
        expect(res.body.risk_level).toBe('MEDIUM');
        expect(res.body.flags).toHaveLength(1);
    });

    test('price prediction reports the outage as 503 rather than a fake success', async () => {
        const { auth } = await makeUser();
        const res = await request(app)
            .post('/api/ai/predict-price')
            .set('Authorization', auth)
            .send(validListing)
            .expect(503);
        expect(res.body.code).toBe('ML_UNAVAILABLE');
    });

    test('price prediction still validates the taxonomy before calling out', async () => {
        const { auth } = await makeUser();
        await request(app)
            .post('/api/ai/predict-price')
            .set('Authorization', auth)
            .send({ ...validListing, category: 'gadgets' })
            .expect(400);
    });

    test('health reports the dependency as unreachable', async () => {
        const res = await request(app).get('/api/health').expect(200);
        expect(res.body).toMatchObject({ status: 'OK', database: 'connected', mlService: 'unreachable' });
    });
});

describe('admin', () => {
    test('the moderation list already contains each listing’s fraud verdict', async () => {
        const { user } = await makeUser();
        const admin = await makeAdmin();
        await makeProduct(user, {
            aiFraud: {
                risk_score: 85,
                risk_level: 'VERY_HIGH',
                recommendation: 'Do not proceed.',
                is_flagged: true,
                flags: []
            },
            isFlagged: true
        });
        await makeProduct(user, { title: 'Second listing' });

        const res = await request(app)
            .get('/api/admin/products')
            .set('Authorization', admin.auth)
            .expect(200);

        // This is the property the admin UI relies on: one request is enough,
        // so it no longer issues a fraud check per row.
        expect(res.body.products).toHaveLength(2);
        expect(res.body.products.some((p) => p.aiFraud?.risk_level === 'VERY_HIGH')).toBe(true);
        expect(res.body.pagination.total).toBe(2);
        // Admins do need seller emails for moderation.
        expect(res.body.products[0].seller.email).toBe(user.email);
    });

    test('the moderation list can be filtered to flagged listings only', async () => {
        const { user } = await makeUser();
        const admin = await makeAdmin();
        await makeProduct(user, { isFlagged: true });
        await makeProduct(user, { title: 'Clean listing', isFlagged: false });

        const res = await request(app)
            .get('/api/admin/products?flagged=true')
            .set('Authorization', admin.auth)
            .expect(200);
        expect(res.body.products).toHaveLength(1);
    });

    test('admin routes are closed to students and to anonymous callers', async () => {
        const { auth } = await makeUser();
        await request(app).get('/api/admin/products').expect(401);
        await request(app).get('/api/admin/products').set('Authorization', auth).expect(403);
        await request(app).get('/api/admin/stats').set('Authorization', auth).expect(403);
        await request(app).post('/api/admin/fraud/backfill').set('Authorization', auth).expect(403);
    });

    test('items sold is a real count, not a fabricated ratio', async () => {
        const { user } = await makeUser();
        const admin = await makeAdmin();
        await makeProduct(user);
        await makeProduct(user, { title: 'Available two' });
        await makeProduct(user, { title: 'Available three' });
        await makeProduct(user, { title: 'Available four' });
        await makeProduct(user, { title: 'Sold one', quantity: 0 });

        const res = await request(app)
            .get('/api/admin/stats')
            .set('Authorization', admin.auth)
            .expect(200);

        expect(res.body.totalProducts).toBe(5);
        expect(res.body.totalItems).toBe(4); // still available
        expect(res.body.totalSales).toBe(1); // genuinely sold
        // The old implementation reported `floor(totalProducts * 0.7)` === 3.
        expect(res.body.totalSales).not.toBe(Math.floor(5 * 0.7));
    });

    test('an admin cannot delete themselves or the last admin', async () => {
        const admin = await makeAdmin();
        const other = await makeAdmin();

        await request(app)
            .delete(`/api/admin/users/${admin.user._id}`)
            .set('Authorization', admin.auth)
            .expect(400);

        // Two admins exist, so removing one is allowed…
        await request(app)
            .delete(`/api/admin/users/${other.user._id}`)
            .set('Authorization', admin.auth)
            .expect(200);

        // …and now `admin` is the last one and cannot be removed by anyone.
        const student = await makeUser();
        await request(app)
            .delete(`/api/admin/users/${admin.user._id}`)
            .set('Authorization', student.auth)
            .expect(403);
    });

    test('deleting a user removes their listings', async () => {
        const { user } = await makeUser();
        const admin = await makeAdmin();
        await makeProduct(user);
        await makeProduct(user, { title: 'Another' });

        const res = await request(app)
            .delete(`/api/admin/users/${user._id}`)
            .set('Authorization', admin.auth)
            .expect(200);

        expect(res.body.deletedListings).toBe(2);
        expect(await Product.countDocuments()).toBe(0);
    });

    test('public stats do not disclose the user count', async () => {
        await makeUser();
        const res = await request(app).get('/api/stats').expect(200);
        expect(res.body.totalUsers).toBeUndefined();
        expect(res.body).toHaveProperty('totalItems');
    });
});
