const express = require('express');
const { Product } = require('../models/Product');
const ApiError = require('../utils/ApiError');
const { asyncHandler, pick } = require('../utils/helpers');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimit');
const validate = require('../middleware/validate');
const serialize = require('../serializers');
const productService = require('../services/productService');
const fraudService = require('../services/fraudService');

const router = express.Router();

/**
 * Fields a client is allowed to set on a product.
 *
 * Both create and update used to hand `req.body` straight to Mongoose, so a
 * seller could set `seller`, `views`, `isFlagged` or overwrite the cached
 * `aiFraud` verdict simply by adding those keys to their JSON — which defeated
 * the fraud system entirely. Availability (`status`/`isActive`/`isSold`) is
 * derived from `quantity` by the model and is not client-writable either.
 */
const WRITABLE_FIELDS = [
    'title',
    'description',
    'category',
    'condition',
    'price',
    'quantity',
    'images',
    'imageUrl',
    'sellerPhone'
];

/** Keep `imageUrl` (single, legacy) and `images` (array) consistent. */
function normalizeImages(data) {
    const images = Array.isArray(data.images) ? data.images.filter(Boolean) : [];
    if (data.imageUrl && !images.includes(data.imageUrl)) images.unshift(data.imageUrl);
    return { images, imageUrl: data.imageUrl || images[0] || '' };
}

/** Load a product the caller is allowed to modify, or throw. */
async function loadOwnProduct(req) {
    const product = await Product.findById(req.params.id);
    if (!product) throw ApiError.notFound('Product not found');

    const isOwner = String(product.seller) === String(req.user._id);
    if (!isOwner && req.user.role !== 'admin') {
        throw ApiError.forbidden('You can only modify your own listings');
    }
    return product;
}

// ── Reads ─────────────────────────────────────────────────────────────────

/**
 * Marketplace listing. Paginated — this used to return the entire collection
 * (419 documents with full descriptions) on every filter change and keystroke.
 */
router.get(
    '/',
    validate.listProducts,
    asyncHandler(async (req, res) => {
        const { items, meta } = await productService.listProducts(req.query);
        res.json({ products: items.map(serialize.productCard), pagination: meta });
    })
);

/** The signed-in user's own listings, including sold ones. */
router.get(
    '/me',
    authenticate,
    validate.listPaginated,
    asyncHandler(async (req, res) => {
        const { items, meta } = await productService.listProducts(
            { ...req.query, seller: req.user._id },
            { onlyAvailable: false }
        );
        res.json({ products: items.map(serialize.productCard), pagination: meta });
    })
);

/**
 * Single product. `optionalAuthenticate` because the response widens for
 * signed-in callers: seller email and phone are only included for them.
 */
router.get(
    '/:id',
    validate.productId,
    optionalAuthenticate,
    asyncHandler(async (req, res) => {
        const product = await Product.findOneAndUpdate(
            { _id: req.params.id },
            { $inc: { views: 1 } },
            { new: true }
        )
            .populate('seller', 'name course email phone')
            .lean();

        if (!product) throw ApiError.notFound('Product not found');
        res.json(serialize.productDetail(product, { viewer: req.user }));
    })
);

// ── Writes ────────────────────────────────────────────────────────────────

router.post(
    '/',
    authenticate,
    writeLimiter,
    validate.createProduct,
    asyncHandler(async (req, res) => {
        const data = pick(req.body, WRITABLE_FIELDS);

        const product = await Product.create({
            ...data,
            ...normalizeImages(data),
            seller: req.user._id,
            sellerPhone: data.sellerPhone || req.user.phone
        });

        await product.populate('seller', 'name course email phone');

        // Respond first, analyze after. Creating a listing used to await the ML
        // round trip, so posting an item was as slow as the ML service and
        // failed along with it.
        res.status(201).json(serialize.productDetail(product, { viewer: req.user }));

        if (product.isActive && !product.isSold) fraudService.queue(product);
    })
);

router.put(
    '/:id',
    authenticate,
    writeLimiter,
    validate.updateProduct,
    asyncHandler(async (req, res) => {
        const product = await loadOwnProduct(req);
        const data = pick(req.body, WRITABLE_FIELDS);

        Object.assign(product, data);
        if (data.images || data.imageUrl) {
            Object.assign(product, normalizeImages({ ...product.toObject(), ...data }));
        }

        // Editing the text or price of a listing invalidates its cached fraud
        // verdict. Previously an update left the old verdict in place, so a
        // clean listing could be edited into a scam and keep its "Safe" badge.
        const needsReanalysis = product.fraudInputsChanged();

        // load -> assign -> save (rather than findByIdAndUpdate) so schema
        // validators and the availability hook actually run on updates.
        await product.save();

        if (needsReanalysis) {
            await fraudService.invalidate(product._id);
            // Reflect the invalidation in this response too, so the client is
            // not handed a verdict that no longer describes the listing.
            product.set('aiFraud', {});
            fraudService.queue(product);
        }

        res.json({ product: serialize.productDetail(product, { viewer: req.user }) });
    })
);

/** Mark a listing sold. Availability flags are derived by the model. */
router.patch(
    '/:id/sell',
    authenticate,
    writeLimiter,
    validate.productId,
    asyncHandler(async (req, res) => {
        const product = await loadOwnProduct(req);
        product.quantity = 0;
        await product.save();
        res.json({
            message: 'Item marked as sold successfully',
            product: serialize.productCard(product)
        });
    })
);

router.delete(
    '/:id',
    authenticate,
    writeLimiter,
    validate.productId,
    asyncHandler(async (req, res) => {
        const product = await loadOwnProduct(req);
        await product.deleteOne();
        res.json({ message: 'Deleted' });
    })
);

module.exports = router;
