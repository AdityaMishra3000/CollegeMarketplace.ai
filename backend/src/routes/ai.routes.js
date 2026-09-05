const express = require('express');
const { Product } = require('../models/Product');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const { CATEGORY_LABELS } = require('../config/taxonomy');
const { asyncHandler } = require('../utils/helpers');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimit');
const validate = require('../middleware/validate');
const serialize = require('../serializers');
const mlClient = require('../services/mlClient');
const fraudService = require('../services/fraudService');
const productService = require('../services/productService');

const router = express.Router();

router.use(aiLimiter);

/**
 * Small TTL cache for recommendations.
 *
 * Every product page view triggers a recommendation request, and the answer only
 * changes when the catalogue does. A short TTL removes the repeat work without
 * introducing any infrastructure. Bounded so it cannot grow without limit.
 */
const CACHE_MAX_ENTRIES = 500;
const recommendationCache = new Map();

function cacheGet(key) {
    const entry = recommendationCache.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
        recommendationCache.delete(key);
        return null;
    }
    return entry.value;
}

function cacheSet(key, value) {
    if (recommendationCache.size >= CACHE_MAX_ENTRIES) {
        // Oldest insertion first — Map preserves insertion order.
        recommendationCache.delete(recommendationCache.keys().next().value);
    }
    recommendationCache.set(key, { value, expiresAt: Date.now() + env.RECOMMEND_CACHE_TTL_MS });
}

/** Exposed so tests and the seed/migration scripts can clear it. */
router.clearRecommendationCache = () => recommendationCache.clear();

// ── Price prediction ──────────────────────────────────────────────────────

router.post(
    '/predict-price',
    authenticate,
    validate.predictPrice,
    asyncHandler(async (req, res) => {
        const { title, description, category, condition } = req.body;
        res.json(await mlClient.predictPrice({ title, description, category, condition }));
    })
);

// ── Recommendations ───────────────────────────────────────────────────────

/**
 * Similar listings for a product page.
 *
 * Previously this loaded up to 500 products, populated every one of their seller
 * records, and shipped the lot to the ML service — including image arrays,
 * phone numbers and cached fraud verdicts that the scorer never reads.
 *
 * Now: candidates are projected down to the fields the scorer uses, the ML
 * service returns only a ranking, and just the top few products are read back in
 * full for the response.
 */
router.get(
    '/recommendations/:productId',
    validate.recommendationTarget,
    asyncHandler(async (req, res) => {
        const { productId } = req.params;

        const cached = cacheGet(productId);
        if (cached) {
            res.set('X-Cache', 'HIT');
            return res.json(cached);
        }

        const target = await Product.findById(productId)
            .select(mlClient.CANDIDATE_FIELDS.join(' '))
            .lean();
        if (!target) throw ApiError.notFound('Product not found');

        const candidates = await Product.find({
            isActive: true,
            isSold: false,
            _id: { $ne: target._id }
        })
            .select(mlClient.CANDIDATE_FIELDS.join(' '))
            .sort({ createdAt: -1 })
            .limit(env.RECOMMEND_CANDIDATE_LIMIT)
            .lean();

        let ranking;
        try {
            ranking = await mlClient.recommend({ target, candidates, topN: 6 });
        } catch (err) {
            // Recommendations are a nice-to-have; the product page must still
            // render if the ML service is down.
            console.warn(`[ai] recommendations unavailable: ${err.message}`);
            return res.json({ recommendations: [], count: 0, unavailable: true });
        }

        const scores = new Map(ranking.map((r) => [r.productId, r.score]));
        const products = await Product.find({ _id: { $in: [...scores.keys()] } })
            .select(productService.CARD_FIELDS)
            .populate('seller', 'name course')
            .lean();

        const payload = {
            recommendations: products
                .map((product) => ({
                    ...serialize.productCard(product),
                    recommendation_score: scores.get(String(product._id)) ?? 0
                }))
                .sort((a, b) => b.recommendation_score - a.recommendation_score),
            count: products.length
        };

        cacheSet(productId, payload);
        res.set('X-Cache', 'MISS');
        return res.json(payload);
    })
);

// ── Fraud detection ───────────────────────────────────────────────────────

/**
 * Verdict for an existing listing: served from the cached value, computed once
 * on a miss. Kept public because the same verdict already appears on the
 * marketplace card.
 */
router.get(
    '/fraud-check/:productId',
    validate.recommendationTarget,
    asyncHandler(async (req, res) => {
        const product = await Product.findById(req.params.productId).populate(
            'seller',
            'createdAt'
        );
        if (!product) throw ApiError.notFound('Product not found');

        const verdict = await fraudService.getOrAnalyze(product);
        if (!verdict) {
            return res.status(503).json({
                risk_level: null,
                risk_score: 0,
                flags: [],
                recommendation: 'Fraud analysis is currently unavailable.',
                is_flagged: false
            });
        }
        return res.json(serialize.fraudSummary(verdict));
    })
);

/**
 * Check a listing that has not been created yet, so a seller can see the risk
 * assessment before publishing. Documented in the README but never implemented.
 */
router.post(
    '/fraud-check',
    authenticate,
    validate.fraudCheckDraft,
    asyncHandler(async (req, res) => {
        const { title, description, category, condition, price } = req.body;
        const verdict = await mlClient.fraudCheck({
            product: { title, description, category, condition, price },
            sellerHistory: await fraudService.sellerHistoryFor({ seller: req.user })
        });
        if (!verdict) throw ApiError.unavailable('Fraud analysis is currently unavailable');
        res.json(verdict);
    })
);

// ── Market insights ───────────────────────────────────────────────────────

router.get(
    '/insights',
    optionalAuthenticate,
    asyncHandler(async (_req, res) => {
        // Was aggregating over sold and inactive listings too, and returned an
        // empty `market_health` object.
        const [byCategory, stats] = await Promise.all([
            productService.categoryInsights(),
            productService.statistics()
        ]);

        res.json({
            trending_categories: byCategory.map((row) => ({
                category: row._id,
                label: CATEGORY_LABELS[row._id] || row._id,
                listing_count: row.listing_count,
                avg_price: Math.round(row.avg_price),
                min_price: row.min_price,
                max_price: row.max_price
            })),
            market_health: {
                active_listings: stats.totalItems,
                total_value: stats.totalValue,
                average_price: Math.round(stats.avgPrice),
                items_sold: stats.totalSales
            }
        });
    })
);

module.exports = router;
