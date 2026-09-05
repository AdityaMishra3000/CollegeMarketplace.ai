/**
 * Seed the marketplace with demo users and listings.
 *
 * Uses the real models rather than re-declaring loose local schemas. The old
 * script defined its own validation-free copies, which is how it produced 420
 * products with `like-new` conditions and `@college.edu` emails that the actual
 * API would have rejected. Now anything the seed can create, the API can create.
 *
 *   node scripts/seedDatabase.js              # seed
 *   node scripts/seedDatabase.js --keep-users # keep existing accounts
 */

const db = require('../src/config/db');
const { User } = require('../src/models/User');
const { Product } = require('../src/models/Product');
const { CATEGORY_VALUES, CONDITION_VALUES } = require('../src/config/taxonomy');
const fraudService = require('../src/services/fraudService');

const DEMO_PASSWORD = 'demo1234';
const STUDENT_COUNT = 20;
const PER_CATEGORY = 60;

const courses = ['Computer Science', 'Information Technology', 'Engineering', 'Business', 'Other'];
const years = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Postgraduate'];

/** Titles and a rough new-price anchor per canonical category. */
const CATALOGUE = {
    textbooks: {
        basePrice: 800,
        titles: [
            'Data Structures in C++', 'Organic Chemistry 8th Ed', 'Macroeconomics',
            'Calculus Early Transcendentals', 'Introduction to Algorithms',
            'Database System Concepts', 'Physics for Scientists'
        ]
    },
    electronics: {
        basePrice: 8000,
        titles: [
            'MacBook Air M1', 'iPad Pro 11-inch', 'Sony WH-1000XM4', 'Dell XPS 15',
            'Mechanical Keyboard', 'Samsung Galaxy Tab', 'Logitech Wireless Mouse',
            'Arduino Starter Kit'
        ]
    },
    furniture: {
        basePrice: 3000,
        titles: [
            'Ergonomic Study Chair', 'IKEA Desk', 'Bookshelf', 'Bean Bag',
            'Folding Table', 'Desk Lamp', 'Rolling Cart'
        ]
    },
    appliances: {
        basePrice: 4000,
        titles: [
            'Mini Refrigerator 90L', 'Electric Kettle 1.5L', 'Induction Cooktop',
            'Table Fan', 'Steam Iron', 'Sandwich Maker', 'Room Heater'
        ]
    },
    clothing: {
        basePrice: 600,
        titles: [
            'College Hoodie', 'Nike Running Shoes', 'Denim Jacket', 'Formal Blazer',
            'Gym Shorts', 'Winter Coat'
        ]
    },
    sports: {
        basePrice: 1500,
        titles: [
            'Tennis Racket', 'Dumbbell Set 5kg', 'Yoga Mat', 'Cricket Bat',
            'Football', 'Basketball', 'Badminton Racket'
        ]
    },
    other: {
        basePrice: 1000,
        titles: [
            'Scientific Calculator', 'Backpack', 'Water Bottle', 'Sketching Set',
            'Desk Organizer'
        ]
    }
};

const SAFE_DESCRIPTIONS = [
    'Used for one semester. Great condition, no marks.',
    'Upgrading to a new one so selling this. Works perfectly.',
    'Barely used, sitting in my dorm. Price is slightly negotiable.',
    'Graduating soon and clearing out my stuff. Good deal.',
    'Bought this last year. Standard wear and tear but functions 100%.'
];

/** Deliberately trip the fraud heuristics so the moderation queue has content. */
const SCAM_DESCRIPTIONS = [
    'URGENT SALE!!! Send advance payment on google pay first. Contact me on whatsapp only.',
    '100% genuine. Need money fast, send money first via UPI. DO NOT MESSAGE ON APP. Whatsapp me.',
    'PRIZE WON ITEM. NO RETURN. Advance payment required. Call me only outside the app.',
    'LEAVING COUNTRY TOMORROW. AS-IS. Google pay first, then I will deliver. Whatsapp only.'
];

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function seedUsers() {
    const created = [];

    // The demo/admin account documented in the README.
    created.push(
        await User.create({
            name: 'Demo Student',
            email: 'demo@college.edu.in',
            password: DEMO_PASSWORD,
            phone: '+919876543210',
            course: 'Computer Science',
            year: '3rd Year',
            role: 'admin'
        })
    );

    for (let i = 1; i < STUDENT_COUNT; i += 1) {
        created.push(
            await User.create({
                name: `Student ${i}`,
                email: `student${i}@college.edu.in`,
                password: DEMO_PASSWORD,
                phone: `+9198765432${String(i).padStart(2, '0')}`,
                course: randomChoice(courses),
                year: randomChoice(years)
            })
        );
    }

    return created;
}

function buildProducts(users) {
    const products = [];

    for (const [category, catalogue] of Object.entries(CATALOGUE)) {
        for (let i = 0; i < PER_CATEGORY; i += 1) {
            const roll = Math.random();
            const isScam = roll < 0.12;
            const isMediumRisk = !isScam && roll < 0.2;
            const seller = randomChoice(users);

            let title = randomChoice(catalogue.titles);
            let condition = randomChoice(CONDITION_VALUES);
            let price;
            let description;

            if (isScam) {
                title = `${title.toUpperCase()} URGENT SALE`;
                description = randomChoice(SCAM_DESCRIPTIONS).toUpperCase();
                price = Math.max(50, Math.floor(catalogue.basePrice * 0.1));
                condition = 'new';
            } else if (isMediumRisk) {
                description = `call me ${randomInt(9000000000, 9999999999)}`;
                price = Math.floor(catalogue.basePrice * 1.5);
            } else {
                description = randomChoice(SAFE_DESCRIPTIONS);
                price = Math.floor(catalogue.basePrice * (randomInt(80, 120) / 100));
            }

            products.push({
                title,
                description,
                category,
                condition,
                price,
                quantity: 1,
                seller: seller._id,
                sellerPhone: seller.phone,
                views: randomInt(0, 500),
                createdAt: new Date(Date.now() - randomInt(0, 30) * 86_400_000)
            });
        }
    }

    return products;
}

async function main() {
    const keepUsers = process.argv.includes('--keep-users');

    await db.connect();
    console.log('🧹 Clearing products…');
    await Product.deleteMany({});

    let users;
    if (keepUsers) {
        users = await User.find().select('phone');
        if (users.length === 0) throw new Error('--keep-users given but no users exist');
        console.log(`👤 Reusing ${users.length} existing accounts`);
    } else {
        await User.deleteMany({});
        users = await seedUsers();
        console.log(`👤 Created ${users.length} accounts (password: ${DEMO_PASSWORD})`);
    }

    const products = buildProducts(users);
    // Validators run on insertMany, so an off-taxonomy value fails here rather
    // than reaching the database.
    await Product.insertMany(products);
    console.log(`📦 Inserted ${products.length} listings`);

    // Fraud verdicts are filled in through the same batched path the admin panel
    // uses, instead of one ML request per product.
    try {
        const summary = await fraudService.backfill();
        console.log(
            `🤖 Fraud backfill: ${summary.analyzed}/${summary.pending} analyzed ` +
                `in ${summary.batches} batch(es), ${summary.flagged} flagged`
        );
    } catch (err) {
        console.warn(
            `⚠️  Fraud backfill skipped (${err.message}). ` +
                'Start the ML service and POST /api/admin/fraud/backfill.'
        );
    }

    const byCategory = await Product.aggregate([
        { $group: { _id: '$category', n: { $sum: 1 } } },
        { $sort: { _id: 1 } }
    ]);
    const byCondition = await Product.aggregate([
        { $group: { _id: '$condition', n: { $sum: 1 } } },
        { $sort: { _id: 1 } }
    ]);

    console.log('\n📊 Seeded distribution');
    console.log('  categories:', byCategory.map((r) => `${r._id}=${r.n}`).join(' '));
    console.log('  conditions:', byCondition.map((r) => `${r._id}=${r.n}`).join(' '));

    const unexpected = [
        ...byCategory.filter((r) => !CATEGORY_VALUES.includes(r._id)).map((r) => `category:${r._id}`),
        ...byCondition.filter((r) => !CONDITION_VALUES.includes(r._id)).map((r) => `condition:${r._id}`)
    ];
    if (unexpected.length > 0) {
        throw new Error(`seeded off-taxonomy values: ${unexpected.join(', ')}`);
    }
    console.log('✅ All seeded values are on-taxonomy.\n');
}

main()
    .then(async () => {
        await db.disconnect();
        process.exit(0);
    })
    .catch(async (err) => {
        console.error('❌ Seed failed:', err.message);
        await db.disconnect().catch(() => {});
        process.exit(1);
    });
