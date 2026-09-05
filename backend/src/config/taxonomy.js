/**
 * CANONICAL PRODUCT TAXONOMY — single source of truth.
 *
 * Categories and conditions used to be declared independently in the frontend,
 * the seed script and the ML service, and the three disagreed (`like_new` vs
 * `like-new`, `appliances` vs `clothing`). That drift silently mispriced
 * listings and mis-flagged them as fraud.
 *
 * Everything now derives from this file:
 *   - the Mongoose schema enums (writes with unknown values are rejected)
 *   - request validation (unknown values return 400, not a silent fallback)
 *   - GET /api/meta/taxonomy (so any client, including a future ML service,
 *     can read the vocabulary instead of hardcoding it)
 *
 * The frontend mirrors this in frontend/src/lib/taxonomy.js. That mirror is
 * asserted to be identical by backend/tests/taxonomy.contract.test.js, so
 * editing one without the other fails the test suite instead of production.
 */

const CATEGORIES = [
    { value: 'electronics', label: 'Electronics' },
    { value: 'textbooks', label: 'Textbooks' },
    { value: 'furniture', label: 'Furniture' },
    { value: 'appliances', label: 'Appliances' },
    { value: 'clothing', label: 'Clothing' },
    { value: 'sports', label: 'Sports & Fitness' },
    { value: 'other', label: 'Other' }
];

/**
 * `rank` orders conditions worst -> best. The ML service needs an ordering to
 * measure condition proximity; exposing it here means the ordering is part of
 * the published contract rather than a list re-typed inside the model.
 */
const CONDITIONS = [
    { value: 'new', label: 'New', rank: 4 },
    { value: 'like_new', label: 'Like New', rank: 3 },
    { value: 'good', label: 'Good', rank: 2 },
    { value: 'fair', label: 'Fair', rank: 1 },
    { value: 'poor', label: 'Poor', rank: 0 }
];

/**
 * Values that existed in the database before the taxonomy was unified.
 * Accepted on write and normalized; never emitted. Reject-unknown still
 * applies to anything not listed here.
 */
const LEGACY_CATEGORY_ALIASES = Object.freeze({});
const LEGACY_CONDITION_ALIASES = Object.freeze({
    'like-new': 'like_new',
    likenew: 'like_new'
});

const CATEGORY_VALUES = CATEGORIES.map((c) => c.value);
const CONDITION_VALUES = CONDITIONS.map((c) => c.value);

const CATEGORY_LABELS = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));
const CONDITION_LABELS = Object.fromEntries(CONDITIONS.map((c) => [c.value, c.label]));
const CONDITION_RANKS = Object.fromEntries(CONDITIONS.map((c) => [c.value, c.rank]));

/** Map a possibly-legacy value onto its canonical form. Unknown values pass
 *  through unchanged so the validation layer can reject them explicitly. */
function normalizeCategory(value) {
    if (typeof value !== 'string') return value;
    const key = value.trim().toLowerCase();
    return LEGACY_CATEGORY_ALIASES[key] || key;
}

function normalizeCondition(value) {
    if (typeof value !== 'string') return value;
    const key = value.trim().toLowerCase();
    return LEGACY_CONDITION_ALIASES[key] || key;
}

const isCategory = (value) => CATEGORY_VALUES.includes(value);
const isCondition = (value) => CONDITION_VALUES.includes(value);

module.exports = {
    CATEGORIES,
    CONDITIONS,
    CATEGORY_VALUES,
    CONDITION_VALUES,
    CATEGORY_LABELS,
    CONDITION_LABELS,
    CONDITION_RANKS,
    LEGACY_CATEGORY_ALIASES,
    LEGACY_CONDITION_ALIASES,
    normalizeCategory,
    normalizeCondition,
    isCategory,
    isCondition
};
