const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:27017/college_marketplace';

const userSchema = new mongoose.Schema({
    name: String, email: String, password: String, phone: String, 
    course: String, year: String, createdAt: { type: Date, default: Date.now }
});

const productSchema = new mongoose.Schema({
    title: String, description: String, category: String, price: Number, 
    condition: String, seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true }, views: { type: Number, default: 0 },
    isFlagged: { type: Boolean, default: false }, createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);

// --- DATA DICTIONARIES ---
const courses = ['Computer Science', 'Engineering', 'Business', 'Arts', 'Science', 'Commerce', 'Medicine', 'Law'];
const years = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Postgraduate'];
const conditions = ['new', 'like-new', 'good', 'fair', 'poor'];

const categories = {
    textbooks: {
        titles: ['Data Structures in C++', 'Organic Chemistry 8th Ed', 'Macroeconomics', 'Calculus Early Transcendentals', 'Introduction to Algorithms', 'Database System Concepts', 'Physics for Scientists'],
        basePrice: 800
    },
    electronics: {
        titles: ['MacBook Air M1', 'iPad Pro 11-inch', 'Sony WH-1000XM4', 'Dell XPS 15', 'Mechanical Keyboard', 'Samsung Galaxy Tab', 'Logitech Wireless Mouse', 'Arduino Starter Kit'],
        basePrice: 8000
    },
    furniture: {
        titles: ['Ergonomic Study Chair', 'IKEA Desk', 'Bookshelf', 'Bean Bag', 'Folding Table', 'Desk Lamp', 'Rolling Cart'],
        basePrice: 3000
    },
    clothing: {
        titles: ['College Hoodie', 'Nike Running Shoes', 'Denim Jacket', 'Formal Blazer', 'Gym Shorts', 'Winter Coat'],
        basePrice: 600
    },
    sports: {
        titles: ['Tennis Racket', 'Dumbbell Set 5kg', 'Yoga Mat', 'Cricket Bat', 'Football', 'Basketball', 'Badminton Racket'],
        basePrice: 1500
    },
    other: {
        titles: ['Scientific Calculator', 'Backpack', 'Water Bottle', 'Sketching Set', 'Desk Organizer'],
        basePrice: 1000
    }
};

const safeDescriptions = [
    "Used for one semester. Great condition, no marks.",
    "Upgrading to a new one so selling this. Works perfectly.",
    "Barely used, sitting in my dorm. Price is slightly negotiable.",
    "Graduating soon and clearing out my stuff. Good deal.",
    "Bought this last year. Standard wear and tear but functions 100%."
];

const scamTriggers = [
    "URGENT SALE!!! Send advance payment on google pay first. Contact me on whatsapp only.",
    "100% genuine. Need money fast, send money first via UPI. DO NOT MESSAGE ON APP. Whatsapp me.",
    "PRIZE WON ITEM. NO RETURN. Advance payment required. Call me only outside the app.",
    "LEAVING COUNTRY TOMORROW. AS-IS. Google pay first, then I will deliver. Whatsapp only."
];

// --- HELPER FUNCTIONS ---
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function seedDB() {
    try {
        console.log('⏳ Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected! Clearing old data...');
        
        await User.deleteMany({});
        await Product.deleteMany({});

        // 1. Generate 20 Users
        console.log('👤 Generating 20 Students...');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('demo123', salt);
        const users = [];

        // Always create the main demo user
        users.push(await User.create({
            name: 'Demo Student', email: 'demo@college.edu', password: hashedPassword,
            phone: '+919876543210', course: 'Computer Science', year: '3rd Year'
        }));

        for(let i=1; i<20; i++) {
            users.push(await User.create({
                name: `Student ${i}`, email: `student${i}@college.edu`, password: hashedPassword,
                phone: `+9198765432${i.toString().padStart(2, '0')}`,
                course: randomChoice(courses), year: randomChoice(years)
            }));
        }

        // 2. Generate 420 Products (~70 per category)
        console.log('📦 Generating 420 Product Listings (Simulating market data & fraud risks)...');
        const productsToInsert = [];

        for (const [catName, catData] of Object.entries(categories)) {
            for (let i = 0; i < 70; i++) {
                const isFraud = Math.random() < 0.15; // 15% chance of being high-risk/scam
                const isMediumRisk = Math.random() > 0.85 && !isFraud; // 15% chance of medium risk

                let title = randomChoice(catData.titles);
                let price, description;
                let condition = randomChoice(conditions);

                if (isFraud) {
                    // HIGH RISK: Extreme low price (<15% of base) + Scam text + All caps
                    price = Math.max(50, Math.floor(catData.basePrice * 0.1)); 
                    title = title.toUpperCase() + " URGENT SALE";
                    description = randomChoice(scamTriggers).toUpperCase();
                    condition = 'new'; // Scammers usually claim brand new
                } else if (isMediumRisk) {
                    // MEDIUM RISK: Short description, slightly weird price
                    price = Math.floor(catData.basePrice * 1.5); 
                    description = "call me " + randomInt(9000000000, 9999999999); // Phone in desc flag
                } else {
                    // SAFE: Normal price variance (80% to 120% of base), safe description
                    price = Math.floor(catData.basePrice * (randomInt(80, 120) / 100));
                    description = randomChoice(safeDescriptions);
                }

                productsToInsert.push({
                    title: title,
                    description: description,
                    category: catName,
                    price: price,
                    condition: condition,
                    seller: randomChoice(users)._id,
                    views: randomInt(0, 500),
                    createdAt: new Date(Date.now() - randomInt(0, 30) * 24 * 60 * 60 * 1000) // Random date past 30 days
                });
            }
        }

        await Product.insertMany(productsToInsert);
        console.log(`✅ Successfully seeded 20 Users and ${productsToInsert.length} Products!`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
}

seedDB();