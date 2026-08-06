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

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'college_marketplace_secret_key_2024';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:27017/college_marketplace';

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
    course: { type: String, required: true },
    year: { type: String, required: true },
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
    sellerPhone: { type: String, required: true, match: [/^\+91[0-9]{10}$/, 'Phone must be exactly 10 digits starting with +91'] },
    isActive: { type: Boolean, default: true },
    views: { type: Number, default: 0 },
    isFlagged: { type: Boolean, default: false },
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

app.post('/api/auth/register', async (req, res) => {
    try {
        let { name, email, password, phone, course, year } = req.body;
        if (!email.endsWith('.edu.in')) return res.status(400).json({ message: 'Must use .edu.in email' });
        if (phone) phone = phone.replace(/\s+/g, '');
        const isFirstUser = (await User.countDocuments()) === 0;
        const user = await User.create({ name, email, password, phone, course, year, role: isFirstUser ? 'admin' : 'student' });
        res.status(201).json({ token: generateToken(user._id), user: { id: user._id, name, email, role: user.role } });
    } catch (error) { res.status(400).json({ message: error.message }); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email.toLowerCase() });
        if (!user || !(await bcrypt.compare(req.body.password, user.password))) return res.status(400).json({ message: 'Invalid credentials' });
        res.json({ token: generateToken(user._id), user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (error) { res.status(500).json({ message: 'Login error' }); }
});

app.get('/api/auth/me', authenticateToken, (req, res) => res.json({ user: { id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role } }));

// ── Products ──
app.get('/api/products', async (req, res) => {
    try {
        let query = { isActive: true };
        if (req.query.category && req.query.category !== 'all') query.category = req.query.category;
        if (req.query.condition && req.query.condition !== 'all') query.condition = req.query.condition;
        if (req.query.minPrice || req.query.maxPrice) {
            query.price = {};
            if (req.query.minPrice) query.price.$gte = Number(req.query.minPrice);
            if (req.query.maxPrice) query.price.$lte = Number(req.query.maxPrice);
        }
        if (req.query.search) {
            query.$or = [{ title: { $regex: req.query.search, $options: 'i' } }, { description: { $regex: req.query.search, $options: 'i' } }];
        }
        const products = await Product.find(query).populate('seller', 'name email course').sort({ createdAt: -1 });
        res.json({ products });
    } catch (error) { res.status(500).json({ message: "Error fetching products" }); }
});

app.get('/api/users/:userId/products', async (req, res) => {
    try {
        const products = await Product.find({ seller: req.params.userId }).populate('seller', 'name email course').sort({ createdAt: -1 });
        res.json({ products });
    } catch (error) { res.status(500).json({ message: "Error fetching user products" }); }
});

// 🆕 THE MISSING ROUTE RESTORED! Fixes "Product Not Found" error
app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }).populate('seller', 'name email phone course');
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: "Error fetching product" });
    }
});

app.post('/api/products', authenticateToken, async (req, res) => {
    try {
        const productData = { ...req.body, seller: req.user._id };
        if (productData.quantity <= 0) { productData.status = 'sold_out'; productData.isActive = false; }
        const product = await Product.create(productData);
        res.status(201).json({ product });
    } catch (error) { res.status(400).json({ message: error.message }); }
});

app.put('/api/products/:id', authenticateToken, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Not found' });
        if (product.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
        
        if (req.body.quantity !== undefined) {
            if (req.body.quantity <= 0) { req.body.status = 'sold_out'; req.body.isActive = false; } 
            else { req.body.status = 'available'; req.body.isActive = true; }
        }
        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ product: updatedProduct });
    } catch (error) { res.status(400).json({ message: error.message }); }
});

app.put('/api/products/:id/sell-one', authenticateToken, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        if (product.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
        if (product.quantity <= 0) return res.status(400).json({ message: 'Item is already sold out' });

        product.quantity -= 1;
        if (product.quantity === 0) { product.status = 'sold_out'; product.isActive = false; }
        await product.save();
        res.json({ message: 'Item sold successfully', product });
    } catch (error) { res.status(400).json({ message: error.message }); }
});

app.delete('/api/products/:id', authenticateToken, async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Not found' });
    if (product.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
});

// Stats & Admin & AI
app.get('/api/stats', async (req, res) => {
    const totalItems = await Product.countDocuments({ isActive: true });
    const activeUsers = await User.countDocuments(); 
    const avgPriceResult = await Product.aggregate([{ $match: { isActive: true } }, { $group: { _id: null, avgPrice: { $avg: '$price' } } }]);
    res.json({ totalItems, activeUsers, totalSales: Math.floor(totalItems * 0.7), avgPrice: avgPriceResult[0]?.avgPrice || 0 });
});
app.get('/api/admin/dashboard', authenticateToken, isAdmin, async (req, res) => {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    const products = await Product.find().populate('seller', 'name').sort({ createdAt: -1 });
    res.json({ users, products });
});
app.delete('/api/admin/users/:id', authenticateToken, isAdmin, async (req, res) => {
    await User.findByIdAndDelete(req.params.id);
    await Product.deleteMany({ seller: req.params.id }); 
    res.json({ message: 'User and their listings deleted' });
});
app.post('/api/ai/predict-price', authenticateToken, async (req, res) => {
    try { res.json(await callMLService('/api/ml/predict-price', req.body)); } catch (e) { res.json({ fallback: true, error: 'ML offline' }); }
});
app.get('/api/ai/recommendations/:productId', async (req, res) => {
    try {
        const target = await Product.findById(req.params.productId);
        const all = await Product.find({ isActive: true }).limit(50);
        res.json(await callMLService('/api/ml/recommend', { target_product: target, all_products: all }));
    } catch (e) { res.json({ recommendations: [] }); }
});
app.get('/api/ai/fraud-check/:productId', async (req, res) => {
    try {
        const product = await Product.findById(req.params.productId).populate('seller');
        res.json(await callMLService('/api/ml/fraud-check', { product, seller_history: { account_age_days: 10 } }));
    } catch (e) { res.json({ risk_level: 'UNKNOWN' }); }
});
app.get('/api/ai/insights', async (req, res) => {
    try {
        const stats = await Product.aggregate([{ $group: { _id: '$category', count: { $sum: 1 }, avgPrice: { $avg: '$price' } } }]);
        res.json({ trending_categories: stats.map(c => ({ category: c._id, listing_count: c.count, avg_price: c.avgPrice })), market_health: {} });
    } catch (e) { res.json({}); }
});

app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));