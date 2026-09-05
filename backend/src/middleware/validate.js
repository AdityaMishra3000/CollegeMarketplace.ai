const { body, param, query, validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');
const {
    CATEGORY_VALUES,
    CONDITION_VALUES,
    normalizeCategory,
    normalizeCondition
} = require('../config/taxonomy');
const { EMAIL_PATTERN, PHONE_PATTERN } = require('../models/User');
const { MAX_PAGE_SIZE } = require('../utils/helpers');

/**
 * Request validation.
 *
 * This is where the frontend/backend contract is enforced. An unknown category
 * or condition produces a 400 that names the offending field and lists the
 * accepted values, instead of reaching the ML service and being silently
 * treated as "other" / "good" — which is exactly how the old taxonomy drift
 * mispriced listings without anyone noticing.
 */

/** Terminal middleware for every validation chain. */
function runValidation(req, _res, next) {
    const result = validationResult(req);
    if (result.isEmpty()) return next();

    const errors = result.array({ onlyFirstError: true }).map((e) => ({
        field: e.path,
        message: e.msg
    }));

    return next(
        ApiError.badRequest(errors[0].message, { code: 'VALIDATION_FAILED', errors })
    );
}

const withValidation = (...chains) => [...chains, runValidation];

// ── Reusable fragments ────────────────────────────────────────────────────

const objectId = (name, location = param) =>
    location(name).isMongoId().withMessage(`${name} must be a valid id`);

/** Normalizes legacy aliases first, then rejects anything off-taxonomy. */
const categoryField = (field, { optional = false } = {}) => {
    let chain = body(field);
    chain = optional ? chain.optional() : chain.exists().withMessage('category is required');
    return chain
        .customSanitizer(normalizeCategory)
        .isIn(CATEGORY_VALUES)
        .withMessage(`category must be one of: ${CATEGORY_VALUES.join(', ')}`);
};

const conditionField = (field, { optional = false } = {}) => {
    let chain = body(field);
    chain = optional ? chain.optional() : chain.exists().withMessage('condition is required');
    return chain
        .customSanitizer(normalizeCondition)
        .isIn(CONDITION_VALUES)
        .withMessage(`condition must be one of: ${CONDITION_VALUES.join(', ')}`);
};

/** Accepts `9876543210`, `+91 9876543210`, `+919876543210`. */
const normalizePhone = (value) => {
    if (typeof value !== 'string') return value;
    const compact = value.replace(/[\s-]/g, '');
    if (!compact) return compact;
    return compact.startsWith('+91') ? compact : `+91${compact.replace(/^0+/, '')}`;
};

const phoneField = (field, { location = body, optional = true } = {}) => {
    const chain = optional ? location(field).optional({ values: 'falsy' }) : location(field).exists();
    return chain
        .customSanitizer(normalizePhone)
        .matches(PHONE_PATTERN)
        .withMessage('Phone must be 10 digits, optionally prefixed with +91');
};

/** Stored image URLs are rendered by the browser; only http(s) is allowed. */
const imageUrl = (chain) =>
    chain
        .isURL({ protocols: ['http', 'https'], require_protocol: true })
        .withMessage('images must be http(s) URLs')
        .isLength({ max: 2000 })
        .withMessage('image URL is too long');

// ── Auth ──────────────────────────────────────────────────────────────────

const MIN_PASSWORD_LENGTH = 8;

const register = withValidation(
    body('name').isString().trim().isLength({ min: 2, max: 80 }).withMessage('name is required'),
    body('email')
        .isString()
        .trim()
        .toLowerCase()
        .matches(EMAIL_PATTERN)
        .withMessage('Must use a valid .edu.in email address'),
    // There was previously no password policy at all.
    body('password')
        .isString()
        .isLength({ min: MIN_PASSWORD_LENGTH, max: 128 })
        .withMessage(`password must be at least ${MIN_PASSWORD_LENGTH} characters`),
    // Required, because it becomes the contact number on every listing this
    // user creates. It used to be optional and silently defaulted to a shared
    // placeholder number.
    phoneField('phone', { optional: false }),
    body('course').optional().isString().trim().isLength({ max: 80 }),
    body('year').optional().isString().trim().isLength({ max: 20 })
);

const login = withValidation(
    body('email').isString().trim().toLowerCase().notEmpty().withMessage('email is required'),
    body('password').isString().notEmpty().withMessage('password is required')
);

// ── Products ──────────────────────────────────────────────────────────────

const productBody = ({ optional }) => [
    body('title')
        [optional ? 'optional' : 'exists']()
        .isString()
        .trim()
        .isLength({ min: 3, max: 140 })
        .withMessage('title must be 3-140 characters'),
    body('description')
        [optional ? 'optional' : 'exists']()
        .isString()
        .trim()
        .isLength({ min: 10, max: 4000 })
        .withMessage('description must be 10-4000 characters'),
    categoryField('category', { optional }),
    conditionField('condition', { optional }),
    body('price')
        [optional ? 'optional' : 'exists']()
        .isFloat({ min: 0, max: 10_000_000 })
        .withMessage('price must be between 0 and 10,000,000')
        .toFloat(),
    body('quantity')
        .optional()
        .isInt({ min: 0, max: 1000 })
        .withMessage('quantity must be between 0 and 1000')
        .toInt(),
    body('images').optional().isArray({ max: 8 }).withMessage('images must be an array (max 8)'),
    imageUrl(body('images.*')),
    imageUrl(body('imageUrl').optional({ values: 'falsy' })),
    phoneField('sellerPhone')
];

const createProduct = withValidation(...productBody({ optional: false }));
const updateProduct = withValidation(objectId('id'), ...productBody({ optional: true }));
const productId = withValidation(objectId('id'));
const sellerId = withValidation(objectId('userId'));
/** AI routes name the path param `productId`. */
const recommendationTarget = withValidation(objectId('productId'));

// ── List / query params ───────────────────────────────────────────────────

const SORT_OPTIONS = ['newest', 'oldest', 'price_asc', 'price_desc', 'popular'];

const pagination = [
    query('page').optional().isInt({ min: 1, max: 10_000 }).withMessage('page must be >= 1').toInt(),
    query('limit')
        .optional()
        .isInt({ min: 1, max: MAX_PAGE_SIZE })
        .withMessage(`limit must be between 1 and ${MAX_PAGE_SIZE}`)
        .toInt()
];

/**
 * Optional taxonomy filter.
 *
 * `all` and `''` are the frontend's "no filter" sentinels and are erased here so
 * the route never has to know about them. Anything else must be on-taxonomy
 * (legacy aliases are normalized first).
 */
const optionalTaxonomyQuery = (field, values, normalize) =>
    query(field)
        .customSanitizer((value) => {
            if (value === undefined || value === '' || value === 'all') return undefined;
            return normalize(value);
        })
        .custom((value) => {
            if (value === undefined || values.includes(value)) return true;
            throw new Error(`${field} must be "all" or one of: ${values.join(', ')}`);
        });

const listProducts = withValidation(
    ...pagination,
    optionalTaxonomyQuery('category', CATEGORY_VALUES, normalizeCategory),
    optionalTaxonomyQuery('condition', CONDITION_VALUES, normalizeCondition),
    query('minPrice').optional({ values: 'falsy' }).isFloat({ min: 0 }).toFloat(),
    query('maxPrice').optional({ values: 'falsy' }).isFloat({ min: 0 }).toFloat(),
    // Bounded so a pathological term cannot be handed to the regex matcher.
    query('search').optional({ values: 'falsy' }).isString().trim().isLength({ max: 80 }),
    query('sort').optional({ values: 'falsy' }).isIn(SORT_OPTIONS).withMessage(
        `sort must be one of: ${SORT_OPTIONS.join(', ')}`
    ),
    query('flagged').optional({ values: 'falsy' }).isBoolean().toBoolean()
);

const listPaginated = withValidation(...pagination);

/** Public seller listing: id in the path plus pagination. */
const sellerProducts = withValidation(objectId('userId'), ...pagination);

/** Admin moderation list: pagination plus an optional flagged-only filter. */
const adminProducts = withValidation(
    ...pagination,
    query('flagged').optional({ values: 'falsy' }).isBoolean().toBoolean(),
    query('sort').optional({ values: 'falsy' }).isIn(SORT_OPTIONS)
);

// ── AI routes ─────────────────────────────────────────────────────────────

const predictPrice = withValidation(
    body('title').isString().trim().isLength({ min: 1, max: 140 }).withMessage('title is required'),
    body('description')
        .isString()
        .trim()
        .isLength({ min: 1, max: 4000 })
        .withMessage('description is required'),
    categoryField('category'),
    conditionField('condition')
);

/** Ad-hoc fraud check for a listing that has not been created yet. */
const fraudCheckDraft = withValidation(
    body('title').isString().trim().isLength({ min: 1, max: 140 }),
    body('description').isString().trim().isLength({ min: 1, max: 4000 }),
    categoryField('category'),
    conditionField('condition'),
    body('price').isFloat({ min: 0, max: 10_000_000 }).toFloat()
);

module.exports = {
    runValidation,
    withValidation,
    normalizePhone,
    SORT_OPTIONS,
    MIN_PASSWORD_LENGTH,
    register,
    login,
    createProduct,
    updateProduct,
    productId,
    sellerId,
    recommendationTarget,
    sellerProducts,
    adminProducts,
    listProducts,
    listPaginated,
    predictPrice,
    fraudCheckDraft
};
