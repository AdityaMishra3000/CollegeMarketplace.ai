const mongoose = require('mongoose');
const db = require('../src/config/db');
const { createApp } = require('../src/app');
const { User } = require('../src/models/User');
const { Product } = require('../src/models/Product');
const { issueToken } = require('../src/middleware/auth');

const app = createApp();

async function connect() {
    await db.connect();
    await Promise.all([User.syncIndexes(), Product.syncIndexes()]);
}

async function disconnect() {
    await mongoose.connection.dropDatabase();
    await db.disconnect();
}

async function clear() {
    await Promise.all([User.deleteMany({}), Product.deleteMany({})]);
}

let counter = 0;

/** Create a user and return it together with a usable bearer token. */
async function makeUser(overrides = {}) {
    counter += 1;
    const user = await User.create({
        name: `Test User ${counter}`,
        email: `user${counter}.${Date.now()}@college.edu.in`,
        password: 'password123',
        phone: `+9198765${String(counter).padStart(5, '0')}`,
        course: 'Computer Science',
        year: '2nd Year',
        ...overrides
    });
    return { user, token: issueToken(user._id), auth: `Bearer ${issueToken(user._id)}` };
}

const makeAdmin = (overrides = {}) => makeUser({ role: 'admin', ...overrides });

/** Insert a listing directly, bypassing the API. */
async function makeProduct(seller, overrides = {}) {
    return Product.create({
        title: 'Engineering Textbook Bundle',
        description: 'Used for one semester, no marks inside, collect from hostel block C.',
        category: 'textbooks',
        condition: 'good',
        price: 400,
        quantity: 1,
        seller: seller._id,
        sellerPhone: seller.phone,
        ...overrides
    });
}

module.exports = { app, connect, disconnect, clear, makeUser, makeAdmin, makeProduct };
