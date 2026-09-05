const mongoose = require('mongoose');
const { CATEGORY_VALUES, CONDITION_VALUES } = require('../config/taxonomy');
const { PHONE_PATTERN } = require('./User');

/**
 * Cached ML fraud verdict.
 *
 * Stored on the product so the marketplace, the product page and the admin
 * moderation table all read one already-computed value instead of each asking
 * the ML service again. `_id: false` keeps it a plain embedded object.
 */
const aiFraudSchema = new mongoose.Schema(
    {
        risk_score: { type: Number, default: null, min: 0, max: 100 },
        risk_level: {
            type: String,
            default: null,
            enum: ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH', null]
        },
        flags: { type: [mongoose.Schema.Types.Mixed], default: [] },
        recommendation: { type: String, default: null },
        is_flagged: { type: Boolean, default: false },
        // Was declared as String while the code assigned a Date, so Mongoose
        // silently cast every timestamp to a string.
        analyzed_at: { type: Date, default: null }
    },
    { _id: false }
);

const productSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true, minlength: 3, maxlength: 140 },
        description: { type: String, required: true, trim: true, minlength: 10, maxlength: 4000 },
        // enum from the canonical taxonomy: an unknown category is now a
        // validation error rather than a silent fallback inside the ML service.
        category: { type: String, required: true, enum: CATEGORY_VALUES },
        condition: { type: String, required: true, enum: CONDITION_VALUES },
        price: { type: Number, required: true, min: 0, max: 10_000_000 },
        quantity: { type: Number, required: true, default: 1, min: 0, max: 1000 },
        status: { type: String, enum: ['available', 'sold_out'], default: 'available' },
        seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        sellerPhone: {
            type: String,
            required: true,
            match: [PHONE_PATTERN, 'Phone must be +91 followed by exactly 10 digits']
        },
        imageUrl: { type: String, default: '' },
        images: { type: [String], default: [] },
        isActive: { type: Boolean, default: true },
        isSold: { type: Boolean, default: false },
        views: { type: Number, default: 0, min: 0 },
        isFlagged: { type: Boolean, default: false },
        aiFraud: { type: aiFraudSchema, default: () => ({}) },
        createdAt: { type: Date, default: Date.now }
    },
    { versionKey: false }
);

/**
 * Availability is derived from quantity, in one place.
 *
 * The three fields below were previously kept in sync by hand in four separate
 * route handlers, which is how they drifted apart. A pre-validate hook means
 * every save path — routes, scripts, seeds — gets the same answer.
 */
productSchema.pre('validate', function deriveAvailability(next) {
    if (this.quantity <= 0) {
        this.status = 'sold_out';
        this.isActive = false;
        this.isSold = true;
    } else if (this.isSold !== true || this.isModified('quantity')) {
        this.status = 'available';
        this.isActive = true;
        this.isSold = false;
    }
    next();
});

/** True when a change should invalidate the cached fraud verdict. */
const FRAUD_INPUT_FIELDS = ['title', 'description', 'price', 'category', 'condition'];
productSchema.methods.fraudInputsChanged = function fraudInputsChanged() {
    return FRAUD_INPUT_FIELDS.some((field) => this.isModified(field));
};

// ── Indexes ───────────────────────────────────────────────────────────────
// Before this the collection had only the default _id index, so every
// marketplace query was a full scan followed by an in-memory sort.
//
// Two listing indexes rather than one: with `category` sitting between the
// equality keys and the sort key, the compound index below can only serve the
// sort when a category is actually supplied, so the unfiltered marketplace query
// needs its own index (equality keys, then sort key).
productSchema.index({ isActive: 1, isSold: 1, createdAt: -1 });
productSchema.index({ isActive: 1, isSold: 1, category: 1, createdAt: -1 });
// Price-range filtering and price sorts.
productSchema.index({ isActive: 1, isSold: 1, price: 1 });
// "My listings" and the public seller listing.
productSchema.index({ seller: 1, createdAt: -1 });
// Admin moderation: flagged items first.
productSchema.index({ isFlagged: 1, createdAt: -1 });
// Fraud backfill looks for products with no verdict yet.
productSchema.index({ 'aiFraud.risk_level': 1 });

const Product = mongoose.model('Product', productSchema);

module.exports = { Product, FRAUD_INPUT_FIELDS };
