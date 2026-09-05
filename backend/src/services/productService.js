const { Product } = require('../models/Product');
const { escapeRegex, parsePagination, paginationMeta } = require('../utils/helpers');

/**
 * Product querying.
 *
 * Route handlers describe *what* they want; this module owns how it is fetched:
 * filter construction, sorting, pagination and projection. Keeping it in one
 * place is what stopped four different handlers from each writing their own
 * slightly different version of the "visible listing" query.
 */

/** Fields a list response needs. Notably excludes seller contact details. */
const CARD_FIELDS = [
    'title',
    'description',
    'category',
    'condition',
    'price',
    'quantity',
    'status',
    'imageUrl',
    'images',
    'isActive',
    'isSold',
    'views',
    'isFlagged',
    'aiFraud',
    'createdAt',
    'seller'
].join(' ');

const SORTS = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    popular: { views: -1, createdAt: -1 }
};

const sortSpec = (sort) => SORTS[sort] || SORTS.newest;

/**
 * Build the Mongo filter for a marketplace query.
 * `query` has already been validated and normalized by the request validators,
 * so unknown categories/conditions never reach this point.
 */
function buildListFilter(query = {}, { onlyAvailable = true } = {}) {
    const filter = {};

    if (onlyAvailable) {
        filter.isActive = true;
        filter.isSold = false;
    }

    if (query.category) filter.category = query.category;
    if (query.condition) filter.condition = query.condition;
    if (query.seller) filter.seller = query.seller;
    if (query.flagged !== undefined) filter.isFlagged = query.flagged;

    const min = query.minPrice;
    const max = query.maxPrice;
    if (min !== undefined || max !== undefined) {
        filter.price = {};
        if (min !== undefined) filter.price.$gte = min;
        if (max !== undefined) filter.price.$lte = max;
    }

    if (query.search) {
        // Escaped: the raw term used to be interpolated into $regex, which let a
        // client inject a pattern and stall the server.
        const term = new RegExp(escapeRegex(query.search), 'i');
        filter.$or = [{ title: term }, { description: term }];
    }

    return filter;
}

/**
 * Paginated fetch. Returns lean documents — nothing here needs Mongoose
 * document machinery, and the serializers read plain properties.
 */
async function listProducts(query = {}, options = {}) {
    const { page, limit, skip } = parsePagination(query, options);
    const filter = buildListFilter(query, options);

    const [items, total] = await Promise.all([
        Product.find(filter)
            .select(options.select || CARD_FIELDS)
            .populate('seller', options.sellerFields || 'name course')
            .sort(sortSpec(query.sort))
            .skip(skip)
            .limit(limit)
            .lean(),
        Product.countDocuments(filter)
    ]);

    return { items, meta: paginationMeta({ page, limit, total }) };
}

/** Marketplace statistics. One aggregation pass instead of four count queries. */
async function statistics() {
    const [result] = await Product.aggregate([
        {
            $facet: {
                totals: [{ $count: 'count' }],
                active: [
                    { $match: { isActive: true, isSold: false } },
                    {
                        $group: {
                            _id: null,
                            count: { $sum: 1 },
                            totalValue: { $sum: '$price' },
                            avgPrice: { $avg: '$price' }
                        }
                    }
                ],
                sold: [{ $match: { isSold: true } }, { $count: 'count' }],
                flagged: [{ $match: { isFlagged: true } }, { $count: 'count' }]
            }
        }
    ]);

    const active = result?.active?.[0];
    return {
        totalProducts: result?.totals?.[0]?.count || 0,
        totalItems: active?.count || 0,
        totalValue: active?.totalValue || 0,
        avgPrice: active?.avgPrice || 0,
        // Was `Math.floor(totalProducts * 0.7)` — an invented number presented
        // to admins as a real metric.
        totalSales: result?.sold?.[0]?.count || 0,
        flaggedProducts: result?.flagged?.[0]?.count || 0
    };
}

/** Per-category aggregates for GET /api/ai/insights. Active listings only. */
async function categoryInsights() {
    return Product.aggregate([
        { $match: { isActive: true, isSold: false } },
        {
            $group: {
                _id: '$category',
                listing_count: { $sum: 1 },
                avg_price: { $avg: '$price' },
                min_price: { $min: '$price' },
                max_price: { $max: '$price' }
            }
        },
        { $sort: { listing_count: -1 } }
    ]);
}

module.exports = {
    CARD_FIELDS,
    SORTS,
    sortSpec,
    buildListFilter,
    listProducts,
    statistics,
    categoryInsights
};
