const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

async function callMLService(endpoint, payload) {
    const url = `${ML_SERVICE_URL}${endpoint}`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const textData = await response.text();
        if (!response.ok) console.error(`ML Service Rejected (${response.status}):`, textData);
        try { return JSON.parse(textData); } catch (e) { throw new Error('ML service parse error'); }
    } catch (error) {
        console.error('Fatal ML Service Connection Error:', error.message);
        throw error;
    }
}

async function analyzeAndCacheFraud(product, sellerHistory = {}) {
    try {
        console.log(`🤖 Starting fraud analysis for product ${product._id}...`);

        const payload = {
            product: product.toObject ? product.toObject() : product,
            seller_history: sellerHistory
        };

        console.log('🤖 Sending to ML service:', JSON.stringify(payload));

        const result = await callMLService('/api/ml/fraud-check', payload);

        console.log(
            `🤖 ML response for ${product._id}:`,
            JSON.stringify(result)
        );

        if (!result || result.error || !result.risk_level) {
            console.error(
                `❌ Invalid fraud result for ${product._id}:`,
                JSON.stringify(result)
            );
            return null;
        }

        const aiFraud = {
            risk_score: result.risk_score ?? 0,
            risk_level: result.risk_level ?? 'UNKNOWN',
            flags: result.flags ?? [],
            recommendation: result.recommendation ?? '',
            is_flagged: result.is_flagged ?? false,
            analyzed_at: result.analyzed_at
                ? new Date(result.analyzed_at)
                : new Date()
        };

        console.log(
            `💾 Saving AI fraud result for ${product._id}:`,
            JSON.stringify(aiFraud)
        );

        const updated = await Product.findByIdAndUpdate(
            product._id,
            {
                $set: {
                    aiFraud,
                    isFlagged: aiFraud.is_flagged
                }
            },
            {
                new: true,
                runValidators: true
            }
        );

        console.log(
            `✅ AI fraud saved for ${product._id}:`,
            JSON.stringify(updated?.aiFraud)
        );

        return aiFraud;

    } catch (error) {
        console.error(
            `❌ Fraud analysis FAILED for product ${product._id}`
        );
        console.error(error);
        console.error(error.stack);

        return null;
    }
}

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'college_marketplace_secret_key_2024';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/college_marketplace';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
    api_key: process.env.CLOUDINARY_API_KEY || 'demo',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'demo'
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: { folder: 'college_marketplace', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'] }
});
const upload = multer({ storage: storage });

app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB error:', err));

// ── SCHEMAS ──────────────────────────────────────────
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.edu\.in$/, 'Must be a valid .edu.in email'] },
    password: { type: String, required: true },
    phone: { type: String, required: true, match: [/^\+91[0-9]{10}$/, 'Phone must be exactly 10 digits starting with +91'] },
    course: { type: String, required: true, default: 'Computer Science' },
    year: { type: String, required: true, default: '1st Year' },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    createdAt: { type: Date, default: Date.now }
});

const productSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    condition: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1, min: 0 },
    status: { type: String, enum: ['available', 'sold_out'], default: 'available' },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    imageUrl: { type: String },
    images: [{ type: String }],
    sellerPhone: { type: String, required: true, match: [/^\+91[0-9]{10}$/, 'Phone must be exactly 10 digits starting with +91'] },
    isActive: { type: Boolean, default: true },
    isSold: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    isFlagged: { type: Boolean, default: false },
    aiFraud: {
        risk_score: { type: Number, default: null },
        risk_level: { type: String, default: null },
        flags: { type: Array, default: [] },
        recommendation: { type: String, default: null },
        is_flagged: { type: Boolean, default: false },
        analyzed_at: { type: String, default: null }
    },
    createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);

// ── MIDDLEWARE ───────────────────────────────────────
const authenticateToken = async (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token required' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');
        if (!req.user) return res.status(401).json({ message: 'Invalid token' });
        next();
    } catch (e) { res.status(403).json({ message: 'Expired token' }); }
};

const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    next();
};

const generateToken = (userId) => jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });

// ── ROUTES ───────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'OK' }));

app.post('/api/upload', authenticateToken, upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    res.json({ imageUrl: req.file.path });
});

// ── Auth Routes ──
app.post('/api/auth/register', async (req, res) => {
    try {
        let { name, email, password, phone, course, year } = req.body;
        if (!email || !email.endsWith('.edu.in')) {
            return res.status(400).json({ message: 'Must use a valid .edu.in email address' });
        }
        if (phone) phone = phone.replace(/\s+/g, '');
        if (phone && !phone.startsWith('+91')) {
            phone = `+91${phone}`;
        }
        const isFirstUser = (await User.countDocuments()) === 0;
        const user = await User.create({
            name,
            email,
            password,
            phone: phone || '+919876543210',
            course: course || 'General Studies',
            year: year || '1st Year',
            role: isFirstUser ? 'admin' : 'student'
        });
        res.status(201).json({
            token: generateToken(user._id),
            user: { id: user._id, _id: user._id, name: user.name, email: user.email, course: user.course, role: user.role }
        });
    } catch (error) { res.status(400).json({ message: error.message }); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email.toLowerCase() });
        if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        res.json({
            token: generateToken(user._id),
            user: { id: user._id, _id: user._id, name: user.name, email: user.email, course: user.course, role: user.role }
        });
    } catch (error) { res.status(500).json({ message: 'Login error' }); }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
    res.json({
        user: { id: req.user._id, _id: req.user._id, name: req.user.name, email: req.user.email, course: req.user.course, role: req.user.role }
    });
});

// ── Product Routes ──
app.get('/api/products', async (req, res) => {
    try {
        let query = { isActive: true, isSold: false };
        if (req.query.category && req.query.category !== 'all') query.category = req.query.category;
        if (req.query.condition && req.query.condition !== 'all') query.condition = req.query.condition;
        if (req.query.minPrice || req.query.maxPrice) {
            query.price = {};
            if (req.query.minPrice) query.price.$gte = Number(req.query.minPrice);
            if (req.query.maxPrice) query.price.$lte = Number(req.query.maxPrice);
        }
        if (req.query.search) {
            query.$or = [
                { title: { $regex: req.query.search, $options: 'i' } },
                { description: { $regex: req.query.search, $options: 'i' } }
            ];
        }
        const products = await Product.find(query).populate('seller', 'name email course').sort({ createdAt: -1 });
        res.json({ products });
    } catch (error) { res.status(500).json({ message: "Error fetching products" }); }
});

app.get('/api/products/me', authenticateToken, async (req, res) => {
    try {
        const products = await Product.find({ seller: req.user._id }).populate('seller', 'name email course').sort({ createdAt: -1 });
        res.json({ products });
    } catch (error) { res.status(500).json({ message: "Error fetching user products" }); }
});

app.get('/api/users/:userId/products', async (req, res) => {
    try {
        const products = await Product.find({ seller: req.params.userId }).populate('seller', 'name email course').sort({ createdAt: -1 });
        res.json({ products });
    } catch (error) { res.status(500).json({ message: "Error fetching user products" }); }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }, { new: true }).populate('seller', 'name email phone course');
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: "Error fetching product" });
    }
});

app.post('/api/products', authenticateToken, async (req, res) => {
    try {
        let phone = req.body.sellerPhone || req.user.phone || '+919876543210';

        if (phone && !phone.startsWith('+91')) {
            phone = `+91${phone}`;
        }

        const images =
            req.body.images ||
            (req.body.imageUrl ? [req.body.imageUrl] : []);

        const imageUrl =
            req.body.imageUrl ||
            (images.length > 0 ? images[0] : '');

        const productData = {
            ...req.body,
            seller: req.user._id,
            sellerPhone: phone,
            imageUrl,
            images
        };

        if (productData.quantity <= 0) {
            productData.status = 'sold_out';
            productData.isActive = false;
            productData.isSold = true;
        }

        // ─────────────────────────────────────────
        // CREATE LISTING
        // ─────────────────────────────────────────

        const product = await Product.create(productData);

        // ─────────────────────────────────────────
        // AI FRAUD ANALYSIS
        //
        // Analyze immediately so every newly created
        // listing gets an AI safety score.
        // ─────────────────────────────────────────

        if (product.isActive && !product.isSold) {
            const seller = await User.findById(req.user._id)
                .select('createdAt');

            let accountAgeDays = 999;

            if (seller?.createdAt) {
                accountAgeDays = Math.max(
                    0,
                    Math.floor(
                        (Date.now() -
                            new Date(seller.createdAt).getTime()) /
                            (1000 * 60 * 60 * 24)
                    )
                );
            }

            await analyzeAndCacheFraud(product, {
                account_age_days: accountAgeDays
            });
        }

        // Re-fetch so the response includes aiFraud.
        const savedProduct = await Product.findById(product._id)
            .populate('seller', 'name email course');

        res.status(201).json(savedProduct);

    } catch (error) {
        console.error('Create product error:', error);

        res.status(400).json({
            message: error.message
        });
    }
});

app.put('/api/products/:id', authenticateToken, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Not found' });
        if (product.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        
        if (req.body.quantity !== undefined) {
            if (req.body.quantity <= 0) {
                req.body.status = 'sold_out';
                req.body.isActive = false;
                req.body.isSold = true;
            } else {
                req.body.status = 'available';
                req.body.isActive = true;
                req.body.isSold = false;
            }
        }
        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ product: updatedProduct });
    } catch (error) { res.status(400).json({ message: error.message }); }
});

const handleMarkAsSold = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        if (product.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        product.quantity = 0;
        product.status = 'sold_out';
        product.isActive = false;
        product.isSold = true;
        await product.save();
        res.json({ message: 'Item marked as sold successfully', product });
    } catch (error) { res.status(400).json({ message: error.message }); }
};

app.patch('/api/products/:id/sell', authenticateToken, handleMarkAsSold);
app.put('/api/products/:id/sell-one', authenticateToken, handleMarkAsSold);

app.delete('/api/products/:id', authenticateToken, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Not found' });
        if (product.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (error) { res.status(500).json({ message: 'Error deleting product' }); }
});

// ── Stats & Admin Routes ──
const handleStats = async (req, res) => {
    try {
        const totalProducts = await Product.countDocuments();
        const totalUsers = await User.countDocuments();
        const activeItems = await Product.countDocuments({ isActive: true, isSold: false });
        const totalValResult = await Product.aggregate([
            { $match: { isSold: false, isActive: true } },
            { $group: { _id: null, totalValue: { $sum: '$price' }, avgPrice: { $avg: '$price' } } }
        ]);

        const totalValue = totalValResult[0]?.totalValue || 0;
        const avgPrice = totalValResult[0]?.avgPrice || 0;

        res.json({
            totalUsers,
            totalProducts,
            totalValue,
            totalItems: activeItems,
            activeUsers: totalUsers,
            totalSales: Math.floor(totalProducts * 0.7),
            avgPrice
        });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch statistics' });
    }
};

app.get('/api/stats', handleStats);
app.get('/api/admin/stats', authenticateToken, isAdmin, handleStats);

const handleAdminDashboard = async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        const products = await Product.find().populate('seller', 'name email').sort({ createdAt: -1 });
        res.json({ users, products });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch admin dashboard' });
    }
};

app.get('/api/admin/dashboard', authenticateToken, isAdmin, handleAdminDashboard);
app.get('/api/admin/products', authenticateToken, isAdmin, handleAdminDashboard);

app.delete('/api/admin/users/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        await Product.deleteMany({ seller: req.params.id }); 
        res.json({ message: 'User and their listings deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting user' });
    }
});

// ── AI & ML Routes ──
app.post('/api/ai/predict-price', authenticateToken, async (req, res) => {
    try { res.json(await callMLService('/api/ml/predict-price', req.body)); } catch (e) { res.json({ fallback: true, error: 'ML offline' }); }
});

app.get('/api/ai/recommendations/:productId', async (req, res) => {
    try {
        const target = await Product.findById(req.params.productId);

        if (!target) {
            return res.status(404).json({
                message: 'Product not found',
                recommendations: []
            });
        }

        const all = await Product.find({
            isActive: true,
            isSold: false,
            _id: { $ne: target._id }
        })
            .populate('seller', 'name email course')
            .sort({ createdAt: -1 })
            .limit(500);

        const result = await callMLService('/api/ml/recommend', {
            target_product: target.toObject(),
            all_products: all.map(product => product.toObject()),
            top_n: 6
        });

        res.json(result);
    } catch (e) {
        console.error('Recommendation error:', e);
        res.json({
            recommendations: [],
            count: 0
        });
    }
});

app.get('/api/ai/fraud-check/:productId', async (req, res) => {
    try {
        const product = await Product
            .findById(req.params.productId)
            .populate('seller');

        if (!product) {
            return res.status(404).json({
                message: 'Product not found'
            });
        }

        // ─────────────────────────────────────────
        // CACHE HIT
        // ─────────────────────────────────────────
        if (
            product.aiFraud &&
            product.aiFraud.risk_level
        ) {
            return res.json(product.aiFraud);
        }

        // ─────────────────────────────────────────
        // CACHE MISS
        // Analyze once and save it.
        // ─────────────────────────────────────────
        let accountAgeDays = 999;

        if (product.seller?.createdAt) {
            accountAgeDays = Math.max(
                0,
                Math.floor(
                    (Date.now() - new Date(product.seller.createdAt).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
            );
        }

        const result = await analyzeAndCacheFraud(
            product,
            {
                account_age_days: accountAgeDays
            }
        );

        if (!result) {
            return res.json({
                risk_level: 'UNKNOWN',
                risk_score: 0,
                flags: [],
                recommendation: 'Fraud analysis is currently unavailable.',
                is_flagged: false
            });
        }

        return res.json(result);

    } catch (error) {
        console.error('Fraud check error:', error);

        res.json({
            risk_level: 'UNKNOWN',
            risk_score: 0,
            flags: [],
            recommendation: 'Fraud analysis is currently unavailable.',
            is_flagged: false
        });
    }
});

app.get('/api/ai/insights', async (req, res) => {
    try {
        const stats = await Product.aggregate([{ $group: { _id: '$category', count: { $sum: 1 }, avgPrice: { $avg: '$price' } } }]);
        res.json({ trending_categories: stats.map(c => ({ category: c._id, listing_count: c.count, avg_price: c.avgPrice })), market_health: {} });
    } catch (e) { res.json({}); }
});

app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));