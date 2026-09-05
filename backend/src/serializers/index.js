/**
 * Response serializers.
 *
 * The API previously returned whatever `populate('seller', 'name email course')`
 * produced, which meant every anonymous marketplace request carried the email of
 * every seller, and the product detail endpoint also handed out their phone
 * number. That is a scrapeable directory of students.
 *
 * All product/user responses now go through these functions, so what leaves the
 * server is an explicit allow-list rather than a side effect of a query.
 *
 * Rules:
 *   - lists never contain contact details, for anyone
 *   - contact details appear only on the single-product endpoint, only for
 *     authenticated callers
 *   - admin responses include email (moderation needs it) but never a password
 */

function sellerSummary(seller) {
    if (!seller || typeof seller !== 'object') return null;
    return {
        _id: String(seller._id ?? seller),
        name: seller.name ?? null,
        course: seller.course ?? null
    };
}

function fraudSummary(aiFraud) {
    if (!aiFraud || !aiFraud.risk_level) return null;
    return {
        risk_score: aiFraud.risk_score ?? 0,
        risk_level: aiFraud.risk_level,
        flags: aiFraud.flags ?? [],
        recommendation: aiFraud.recommendation ?? '',
        is_flagged: Boolean(aiFraud.is_flagged),
        analyzed_at: aiFraud.analyzed_at ?? null
    };
}

/** Shared fields — safe for anonymous callers. */
function productBase(product) {
    return {
        _id: String(product._id),
        title: product.title,
        description: product.description,
        category: product.category,
        condition: product.condition,
        price: product.price,
        quantity: product.quantity,
        status: product.status,
        imageUrl: product.imageUrl || '',
        images: product.images || [],
        isActive: product.isActive,
        isSold: product.isSold,
        views: product.views ?? 0,
        isFlagged: Boolean(product.isFlagged),
        // The safety badge is a user-facing feature, so the verdict is public.
        aiFraud: fraudSummary(product.aiFraud),
        createdAt: product.createdAt,
        seller: sellerSummary(product.seller)
    };
}

/** Marketplace / dashboard / recommendation cards. */
function productCard(product) {
    return productBase(product);
}

/**
 * Single product page. `viewer` is `req.user` (undefined when anonymous).
 * Contact details require a signed-in caller.
 */
function productDetail(product, { viewer } = {}) {
    const payload = productBase(product);
    if (!viewer) return payload;

    const seller = product.seller;
    payload.seller = {
        ...payload.seller,
        email: seller?.email ?? null,
        phone: seller?.phone ?? null
    };
    payload.sellerPhone = product.sellerPhone ?? null;
    return payload;
}

/** Admin moderation table. */
function adminProduct(product) {
    const payload = productBase(product);
    payload.seller = { ...payload.seller, email: product.seller?.email ?? null };
    payload.sellerPhone = product.sellerPhone ?? null;
    return payload;
}

/** The signed-in user's own record, and the shape the auth routes return. */
function userSelf(user) {
    return {
        id: String(user._id),
        _id: String(user._id),
        name: user.name,
        email: user.email,
        phone: user.phone,
        course: user.course,
        year: user.year,
        role: user.role,
        createdAt: user.createdAt
    };
}

/** Admin user list. Identical today, kept separate so the two can diverge. */
function adminUser(user) {
    return userSelf(user);
}

module.exports = {
    productCard,
    productDetail,
    adminProduct,
    userSelf,
    adminUser,
    sellerSummary,
    fraudSummary
};
