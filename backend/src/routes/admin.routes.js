const express = require('express');
const { User } = require('../models/User');
const { Product } = require('../models/Product');
const ApiError = require('../utils/ApiError');
const { asyncHandler, parsePagination, paginationMeta } = require('../utils/helpers');
const { authenticate, requireAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');
const serialize = require('../serializers');
const productService = require('../services/productService');
const fraudService = require('../services/fraudService');

const router = express.Router();

// Everything below requires an authenticated admin.
router.use(authenticate, requireAdmin);

/** Products for the moderation table, including sold and inactive listings. */
async function listModerationProducts(query) {
    const { items, meta } = await productService.listProducts(query, {
        onlyAvailable: false,
        sellerFields: 'name course email'
    });
    return { products: items.map(serialize.adminProduct), pagination: meta };
}

async function listUsers(query) {
    const { page, limit, skip } = parsePagination(query, { defaultLimit: 25 });
    const [items, total] = await Promise.all([
        User.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        User.countDocuments()
    ]);
    return {
        users: items.map(serialize.adminUser),
        pagination: paginationMeta({ page, limit, total })
    };
}

router.get(
    '/stats',
    asyncHandler(async (_req, res) => {
        const [productStats, totalUsers] = await Promise.all([
            productService.statistics(),
            User.countDocuments()
        ]);
        res.json({ ...productStats, totalUsers, activeUsers: totalUsers });
    })
);

/**
 * Moderation queue.
 *
 * The response already carries each product's cached `aiFraud` verdict, which is
 * the whole point: the admin UI reads it from here instead of issuing a fraud
 * request per row (419 of them, all cache hits, on every page load).
 */
router.get(
    '/products',
    validate.adminProducts,
    asyncHandler(async (req, res) => {
        res.json(await listModerationProducts(req.query));
    })
);

router.get(
    '/users',
    validate.listPaginated,
    asyncHandler(async (req, res) => {
        res.json(await listUsers(req.query));
    })
);

/** Combined view, kept for compatibility with the original endpoint shape. */
router.get(
    '/dashboard',
    validate.adminProducts,
    asyncHandler(async (req, res) => {
        const [products, users] = await Promise.all([
            listModerationProducts(req.query),
            listUsers({ limit: 25 })
        ]);
        res.json({ ...products, users: users.users });
    })
);

// ── Fraud maintenance ─────────────────────────────────────────────────────

/**
 * Analyze every listing that has no verdict yet.
 *
 * One batched ML round trip and one bulkWrite per 100 products, replacing the
 * per-product fan-out. This is the supported way to fill gaps after a seed or an
 * ML outage.
 */
router.post(
    '/fraud/backfill',
    asyncHandler(async (_req, res) => {
        const summary = await fraudService.backfill();
        res.json({ message: 'Fraud backfill complete', ...summary });
    })
);

/** Force a fresh verdict for one listing. */
router.post(
    '/products/:id/reanalyze',
    validate.productId,
    asyncHandler(async (req, res) => {
        const product = await Product.findById(req.params.id).populate('seller', 'createdAt');
        if (!product) throw ApiError.notFound('Product not found');

        const verdict = await fraudService.analyze(product);
        if (!verdict) throw ApiError.unavailable('Fraud analysis is currently unavailable');

        res.json(verdict);
    })
);

// ── User administration ───────────────────────────────────────────────────

router.delete(
    '/users/:id',
    asyncHandler(async (req, res) => {
        const target = await User.findById(req.params.id);
        if (!target) throw ApiError.notFound('User not found');

        // Guards the original endpoint lacked: an admin could delete their own
        // account, or the only admin account, locking everyone out of the panel.
        if (String(target._id) === String(req.user._id)) {
            throw ApiError.badRequest('You cannot delete your own account');
        }
        if (target.role === 'admin' && (await User.countDocuments({ role: 'admin' })) <= 1) {
            throw ApiError.badRequest('Cannot delete the last remaining admin account');
        }

        const { deletedCount } = await Product.deleteMany({ seller: target._id });
        await target.deleteOne();

        res.json({
            message: 'User and their listings deleted',
            deletedListings: deletedCount
        });
    })
);

module.exports = router;
