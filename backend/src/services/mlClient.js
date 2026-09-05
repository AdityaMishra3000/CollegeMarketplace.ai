const env = require('../config/env');
const ApiError = require('../utils/ApiError');

/**
 * ML SERVICE BOUNDARY.
 *
 * This is the only module that knows the ML service's URL, wire format or field
 * names. Routes call `predictPrice(...)` / `fraudCheck(...)` and receive plain
 * objects; they never build ML payloads themselves.
 *
 * The current implementation behind these calls is a hard-coded heuristic engine
 * that is going to be replaced by trained models. When that happens this file is
 * the only thing that has to change — and if the replacement speaks a different
 * protocol (gRPC, a hosted endpoint, an in-process model) the rest of the
 * backend does not need to know.
 */

const PATHS = {
    predictPrice: '/api/ml/predict-price',
    recommend: '/api/ml/recommend',
    fraudCheck: '/api/ml/fraud-check',
    fraudCheckBatch: '/api/ml/batch-fraud-check',
    health: '/health'
};

/** Fields the recommendation scorer actually reads. */
const CANDIDATE_FIELDS = ['_id', 'title', 'description', 'category', 'condition', 'price', 'createdAt', 'isActive'];

async function request(path, { method = 'POST', payload, timeoutMs = env.ML_TIMEOUT_MS } = {}) {
    const url = `${env.ML_SERVICE_URL}${path}`;
    let response;

    try {
        response = await fetch(url, {
            method,
            headers: payload ? { 'Content-Type': 'application/json' } : undefined,
            body: payload ? JSON.stringify(payload) : undefined,
            // Without a timeout a hung ML service holds Node's sockets open and
            // the request never resolves.
            signal: AbortSignal.timeout(timeoutMs)
        });
    } catch (cause) {
        const reason = cause.name === 'TimeoutError' ? `timed out after ${timeoutMs}ms` : cause.message;
        throw ApiError.unavailable(`ML service unreachable (${reason})`, {
            code: 'ML_UNAVAILABLE',
            cause
        });
    }

    const text = await response.text();
    let data = null;
    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            throw ApiError.unavailable('ML service returned a non-JSON response', {
                code: 'ML_BAD_RESPONSE'
            });
        }
    }

    if (!response.ok) {
        // A 4xx from the ML service means we sent something it rejected — a
        // real bug on our side, so log it loudly rather than reporting "offline".
        console.error(`[ml] ${method} ${path} -> ${response.status}`, data ?? text);
        throw ApiError.unavailable(data?.error || `ML service error (${response.status})`, {
            code: 'ML_REJECTED'
        });
    }

    return data;
}

/** Shape a product (document or lean object) into the ML wire format. */
function toMLProduct(product) {
    const source = typeof product?.toObject === 'function' ? product.toObject() : product || {};
    return {
        _id: String(source._id ?? ''),
        title: source.title ?? '',
        description: source.description ?? '',
        category: source.category ?? '',
        condition: source.condition ?? '',
        price: Number(source.price ?? 0),
        createdAt:
            source.createdAt instanceof Date
                ? source.createdAt.toISOString()
                : source.createdAt ?? null,
        isActive: source.isActive !== false
    };
}

/** Price suggestion for a draft listing. */
async function predictPrice({ title, description, category, condition }) {
    return request(PATHS.predictPrice, {
        payload: { title, description, category, condition }
    });
}

/**
 * Content-based recommendations.
 *
 * The candidate set is passed in by the caller, already trimmed and projected —
 * this used to ship up to 500 fully-populated product documents (including
 * seller records and image arrays the scorer never looks at) on every product
 * page view.
 */
async function recommend({ target, candidates, topN = 6 }) {
    const data = await request(PATHS.recommend, {
        timeoutMs: env.ML_RECOMMEND_TIMEOUT_MS,
        payload: {
            target_product: toMLProduct(target),
            all_products: candidates.map(toMLProduct),
            top_n: topN
        }
    });

    // Only the ranking is used; the caller re-reads the products it needs.
    return (data?.recommendations || []).map((item) => ({
        productId: String(item._id),
        score: Number(item.recommendation_score ?? 0)
    }));
}

/** Normalize a fraud verdict into the shape stored on the product. */
function toFraudVerdict(raw) {
    if (!raw || raw.error || !raw.risk_level) return null;
    const analyzedAt = raw.analyzed_at ? new Date(raw.analyzed_at) : new Date();
    return {
        risk_score: Number.isFinite(raw.risk_score) ? raw.risk_score : 0,
        risk_level: raw.risk_level,
        flags: Array.isArray(raw.flags) ? raw.flags : [],
        recommendation: raw.recommendation ?? '',
        is_flagged: Boolean(raw.is_flagged),
        analyzed_at: Number.isNaN(analyzedAt.getTime()) ? new Date() : analyzedAt
    };
}

/** Fraud verdict for a single product. Returns null if the ML result is unusable. */
async function fraudCheck({ product, sellerHistory = {} }) {
    const data = await request(PATHS.fraudCheck, {
        payload: { product: toMLProduct(product), seller_history: sellerHistory }
    });
    return toFraudVerdict(data);
}

/**
 * Fraud verdicts for many products in one round trip.
 *
 * `items` is `[{ product, sellerHistory }]`. Seller history travels inside each
 * product entry so the batch path scores identically to the single-product path.
 * Returns a Map of productId -> verdict.
 */
async function fraudCheckBatch(items) {
    if (items.length === 0) return new Map();
    const data = await request(PATHS.fraudCheckBatch, {
        timeoutMs: env.ML_RECOMMEND_TIMEOUT_MS,
        payload: {
            products: items.map(({ product, sellerHistory }) => ({
                ...toMLProduct(product),
                seller_history: sellerHistory || {}
            }))
        }
    });

    const verdicts = new Map();
    for (const result of data?.results || []) {
        const verdict = toFraudVerdict(result);
        if (verdict && result.product_id) verdicts.set(String(result.product_id), verdict);
    }
    return verdicts;
}

/** Used by GET /api/health. Never throws. */
async function health() {
    try {
        const data = await request(PATHS.health, { method: 'GET', timeoutMs: 2000 });
        return { reachable: true, ...data };
    } catch (err) {
        return { reachable: false, error: err.message };
    }
}

module.exports = {
    predictPrice,
    recommend,
    fraudCheck,
    fraudCheckBatch,
    health,
    toMLProduct,
    toFraudVerdict,
    CANDIDATE_FIELDS,
    PATHS
};
