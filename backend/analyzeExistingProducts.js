const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI =
    process.env.MONGODB_URI ||
    'mongodb://mongo:27017/college_marketplace';

const ML_SERVICE_URL =
    process.env.ML_SERVICE_URL ||
    'http://ml-service:5001';

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    phone: String,
    course: String,
    year: String,
    role: String,
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
    isActive: Boolean,
    isSold: Boolean,
    isFlagged: Boolean,
    aiFraud: {
        risk_score: Number,
        risk_level: String,
        flags: Array,
        recommendation: String,
        is_flagged: Boolean,
        analyzed_at: Date
    }
});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);

async function callMLService(product, sellerHistory) {
    const response = await fetch(
        `${ML_SERVICE_URL}/api/ml/fraud-check`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                product,
                seller_history: sellerHistory
            })
        }
    );

    if (!response.ok) {
        throw new Error(
            `ML service returned HTTP ${response.status}`
        );
    }

    return response.json();
}

async function main() {
    console.log('Connecting to MongoDB...');

    await mongoose.connect(MONGODB_URI);

    console.log('Connected.');

    const products = await Product
        .find({
            $or: [
                { aiFraud: { $exists: false } },
                { 'aiFraud.risk_level': { $exists: false } }
            ]
        })
        .populate('seller');

    console.log(
        `Found ${products.length} products requiring fraud analysis.`
    );

    let completed = 0;
    let failed = 0;

    for (const product of products) {
        try {
            let accountAgeDays = 999;

            if (product.seller?.createdAt) {
                accountAgeDays = Math.max(
                    0,
                    Math.floor(
                        (
                            Date.now() -
                            new Date(product.seller.createdAt).getTime()
                        ) /
                        (1000 * 60 * 60 * 24)
                    )
                );
            }

            const result = await callMLService(
                product.toObject(),
                {
                    account_age_days: accountAgeDays
                }
            );

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

            await Product.findByIdAndUpdate(
                product._id,
                {
                    $set: {
                        aiFraud,
                        isFlagged: aiFraud.is_flagged
                    }
                }
            );

            completed++;

            console.log(
                `[${completed + failed}/${products.length}]`,
                product.title,
                '→',
                aiFraud.risk_level,
                `(${aiFraud.risk_score}/100)`
            );

        } catch (error) {
            failed++;

            console.error(
                `FAILED: ${product._id} ${product.title}`,
                error.message
            );
        }
    }

    console.log('');
    console.log('────────────────────────────');
    console.log('Fraud analysis complete.');
    console.log(`Successful: ${completed}`);
    console.log(`Failed:     ${failed}`);
    console.log('────────────────────────────');

    await mongoose.disconnect();
}

main().catch(async error => {
    console.error('Fatal migration error:', error);

    try {
        await mongoose.disconnect();
    } catch {}

    process.exit(1);
});