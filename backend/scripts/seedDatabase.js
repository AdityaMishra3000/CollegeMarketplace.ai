const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI =
    process.env.MONGODB_URI || 'mongodb://mongo:27017/college_marketplace';

// --- SCHEMAS ---

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    phone: String,
    course: String,
    year: String,
    createdAt: { type: Date, default: Date.now }
});

const productSchema = new mongoose.Schema({
    title: String,
    description: String,
    category: String,
    price: Number,
    condition: String,

    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Current marketplace/backend fields
    sellerPhone: {
        type: String,
        required: true
    },

    isActive: {
        type: Boolean,
        default: true
    },

    isSold: {
        type: Boolean,
        default: false
    },

    quantity: {
        type: Number,
        default: 1
    },

    status: {
        type: String,
        enum: ['available', 'sold_out'],
        default: 'available'
    },

    views: {
        type: Number,
        default: 0
    },

    isFlagged: {
        type: Boolean,
        default: false
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);

// --- DATA DICTIONARIES ---

const courses = [
    'Computer Science',
    'Engineering',
    'Business',
    'Arts',
    'Science',
    'Commerce',
    'Medicine',
    'Law'
];

const years = [
    '1st Year',
    '2nd Year',
    '3rd Year',
    '4th Year',
    'Postgraduate'
];

const conditions = [
    'new',
    'like-new',
    'good',
    'fair',
    'poor'
];

const categories = {
    textbooks: {
        titles: [
            'Data Structures in C++',
            'Organic Chemistry 8th Ed',
            'Macroeconomics',
            'Calculus Early Transcendentals',
            'Introduction to Algorithms',
            'Database System Concepts',
            'Physics for Scientists'
        ],
        basePrice: 800
    },

    electronics: {
        titles: [
            'MacBook Air M1',
            'iPad Pro 11-inch',
            'Sony WH-1000XM4',
            'Dell XPS 15',
            'Mechanical Keyboard',
            'Samsung Galaxy Tab',
            'Logitech Wireless Mouse',
            'Arduino Starter Kit'
        ],
        basePrice: 8000
    },

    furniture: {
        titles: [
            'Ergonomic Study Chair',
            'IKEA Desk',
            'Bookshelf',
            'Bean Bag',
            'Folding Table',
            'Desk Lamp',
            'Rolling Cart'
        ],
        basePrice: 3000
    },

    clothing: {
        titles: [
            'College Hoodie',
            'Nike Running Shoes',
            'Denim Jacket',
            'Formal Blazer',
            'Gym Shorts',
            'Winter Coat'
        ],
        basePrice: 600
    },

    sports: {
        titles: [
            'Tennis Racket',
            'Dumbbell Set 5kg',
            'Yoga Mat',
            'Cricket Bat',
            'Football',
            'Basketball',
            'Badminton Racket'
        ],
        basePrice: 1500
    },

    other: {
        titles: [
            'Scientific Calculator',
            'Backpack',
            'Water Bottle',
            'Sketching Set',
            'Desk Organizer'
        ],
        basePrice: 1000
    }
};

const safeDescriptions = [
    'Used for one semester. Great condition, no marks.',
    'Upgrading to a new one so selling this. Works perfectly.',
    'Barely used, sitting in my dorm. Price is slightly negotiable.',
    'Graduating soon and clearing out my stuff. Good deal.',
    'Bought this last year. Standard wear and tear but functions 100%.'
];

const scamTriggers = [
    'URGENT SALE!!! Send advance payment on google pay first. Contact me on whatsapp only.',
    '100% genuine. Need money fast, send money first via UPI. DO NOT MESSAGE ON APP. Whatsapp me.',
    'PRIZE WON ITEM. NO RETURN. Advance payment required. Call me only outside the app.',
    'LEAVING COUNTRY TOMORROW. AS-IS. Google pay first, then I will deliver. Whatsapp only.'
];

// --- HELPER FUNCTIONS ---

const randomInt = (min, max) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

const randomChoice = (arr) =>
    arr[Math.floor(Math.random() * arr.length)];

// --- SEED FUNCTION ---

async function seedDB() {
    try {
        console.log('⏳ Connecting to MongoDB...');

        await mongoose.connect(MONGODB_URI);

        console.log('✅ Connected!');
        console.log('🧹 Clearing old users and products...');

        await User.deleteMany({});
        await Product.deleteMany({});

        // --------------------------------------------------
        // 1. GENERATE USERS
        // --------------------------------------------------

        console.log('👤 Generating 20 Students...');

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('demo123', salt);

        const users = [];

        // Always create the main demo user
        const demoUser = await User.create({
            name: 'Demo Student',
            email: 'demo@college.edu',
            password: hashedPassword,
            phone: '+919876543210',
            course: 'Computer Science',
            year: '3rd Year'
        });

        users.push(demoUser);

        // Generate remaining 19 students
        for (let i = 1; i < 20; i++) {
            const user = await User.create({
                name: `Student ${i}`,
                email: `student${i}@college.edu`,
                password: hashedPassword,
                phone: `+9198765432${i.toString().padStart(2, '0')}`,
                course: randomChoice(courses),
                year: randomChoice(years)
            });

            users.push(user);
        }

        console.log(`✅ Created ${users.length} users.`);

        // --------------------------------------------------
        // 2. GENERATE PRODUCTS
        // --------------------------------------------------

        console.log(
            '📦 Generating 420 Product Listings (70 per category)...'
        );

        const productsToInsert = [];

        for (const [catName, catData] of Object.entries(categories)) {
            for (let i = 0; i < 70; i++) {
                const isFraud = Math.random() < 0.15;

                const isMediumRisk =
                    Math.random() > 0.85 && !isFraud;

                let title = randomChoice(catData.titles);
                let price;
                let description;
                let condition = randomChoice(conditions);

                // --------------------------------------------------
                // HIGH RISK / SCAM PRODUCT
                // --------------------------------------------------

                if (isFraud) {
                    price = Math.max(
                        50,
                        Math.floor(catData.basePrice * 0.1)
                    );

                    title = `${title.toUpperCase()} URGENT SALE`;

                    description =
                        randomChoice(scamTriggers).toUpperCase();

                    condition = 'new';
                }

                // --------------------------------------------------
                // MEDIUM RISK PRODUCT
                // --------------------------------------------------

                else if (isMediumRisk) {
                    price = Math.floor(catData.basePrice * 1.5);

                    description =
                        `call me ${randomInt(
                            9000000000,
                            9999999999
                        )}`;
                }

                // --------------------------------------------------
                // SAFE PRODUCT
                // --------------------------------------------------

                else {
                    price = Math.floor(
                        catData.basePrice *
                        (randomInt(80, 120) / 100)
                    );

                    description = randomChoice(
                        safeDescriptions
                    );
                }

                // Pick seller ONCE so sellerPhone matches seller
                const seller = randomChoice(users);

                productsToInsert.push({
                    title,
                    description,
                    category: catName,
                    price,
                    condition,

                    seller: seller._id,
                    sellerPhone: seller.phone,

                    // IMPORTANT:
                    // These fields are required by the current
                    // marketplace/backend logic.
                    isActive: true,
                    isSold: false,
                    quantity: 1,
                    status: 'available',

                    views: randomInt(0, 500),

                    createdAt: new Date(
                        Date.now() -
                        randomInt(0, 30) *
                        24 *
                        60 *
                        60 *
                        1000
                    )
                });
            }
        }

        // --------------------------------------------------
        // 3. INSERT PRODUCTS
        // --------------------------------------------------

        await Product.insertMany(productsToInsert);

        console.log(
            `✅ Successfully seeded ${users.length} Users and ${productsToInsert.length} Products!`
        );

        // --------------------------------------------------
        // 4. VERIFY SEED
        // --------------------------------------------------

        const userCount = await User.countDocuments();

        const productCount = await Product.countDocuments();

        const activeProductCount = await Product.countDocuments({
            isActive: true
        });

        const marketplaceProductCount =
            await Product.countDocuments({
                isActive: true,
                isSold: false
            });

        console.log('');
        console.log('📊 Seed Verification');
        console.log('--------------------');
        console.log(`Users:                  ${userCount}`);
        console.log(`Products:               ${productCount}`);
        console.log(`Active products:        ${activeProductCount}`);
        console.log(
            `Marketplace products:   ${marketplaceProductCount}`
        );
        console.log('');

        if (marketplaceProductCount !== productCount) {
            console.warn(
                '⚠️ Warning: Not all products are marketplace-visible.'
            );
        } else {
            console.log(
                '✅ All seeded products are marketplace-visible.'
            );
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
}

seedDB();