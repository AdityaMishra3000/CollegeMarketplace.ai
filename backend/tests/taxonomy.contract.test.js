const fs = require('fs');
const path = require('path');
const {
    CATEGORIES,
    CONDITIONS,
    CATEGORY_VALUES,
    CONDITION_VALUES
} = require('../src/config/taxonomy');

/**
 * THE CONTRACT TEST.
 *
 * The category/condition vocabulary is declared in three places that cannot
 * import each other: the backend config (source of truth), a dependency-free
 * frontend mirror, and the Python ML service's lookup tables.
 *
 * They used to disagree — `like_new` vs `like-new`, `appliances` vs `clothing` —
 * and nothing failed. Listings were mispriced and mis-flagged instead. This test
 * is what makes that class of drift loud: change one copy without the others and
 * `npm test` fails.
 */

const REPO_ROOT = path.resolve(__dirname, '../..');
const FRONTEND_TAXONOMY = path.join(REPO_ROOT, 'frontend/src/lib/taxonomy.js');
const FRONTEND_API_CLIENT = path.join(REPO_ROOT, 'frontend/src/api/client.js');
const ML_SERVER = path.join(REPO_ROOT, 'ml_service/ml_server.py');

/**
 * Evaluate the frontend mirror.
 *
 * It is deliberately free of imports and contains only literals, so stripping
 * `export ` and evaluating it is sufficient — and far more reliable than
 * scraping values with a regex.
 */
function loadFrontendTaxonomy() {
    const source = fs.readFileSync(FRONTEND_TAXONOMY, 'utf8');
    expect(source).not.toMatch(/^\s*import\s/m); // must stay dependency-free
    const body = source.replace(/^export\s+const/gm, 'const');
    // eslint-disable-next-line no-new-func
    return new Function(`${body}; return { CATEGORIES, CONDITIONS };`)();
}

/** Read the keys of CATEGORY_BASE_PRICES out of the Python source. */
function loadMlTaxonomy() {
    const source = fs.readFileSync(ML_SERVER, 'utf8');
    const start = source.indexOf('CATEGORY_BASE_PRICES = {');
    expect(start).toBeGreaterThan(-1);
    const block = source.slice(start, source.indexOf('\n}', start));

    const categories = [];
    const conditionSets = [];
    for (const line of block.split('\n').slice(1)) {
        const match = line.match(/^\s*"([a-z_]+)":\s*\{(.+)\},?\s*$/);
        if (!match) continue;
        categories.push(match[1]);
        conditionSets.push([...match[2].matchAll(/"([a-z_]+)":/g)].map((m) => m[1]));
    }
    return { categories, conditionSets };
}

describe('taxonomy contract', () => {
    test('backend taxonomy is internally consistent', () => {
        expect(CATEGORY_VALUES.length).toBeGreaterThan(0);
        expect(new Set(CATEGORY_VALUES).size).toBe(CATEGORY_VALUES.length);
        expect(new Set(CONDITION_VALUES).size).toBe(CONDITION_VALUES.length);
        // Values are used as object keys, query params and Python dict keys.
        for (const value of [...CATEGORY_VALUES, ...CONDITION_VALUES]) {
            expect(value).toMatch(/^[a-z][a-z_]*$/);
        }
        // Ranks must be a total order so condition proximity is well defined.
        const ranks = CONDITIONS.map((c) => c.rank);
        expect(new Set(ranks).size).toBe(ranks.length);
    });

    test('frontend mirror matches the backend exactly', () => {
        const frontend = loadFrontendTaxonomy();

        expect(frontend.CATEGORIES).toEqual(CATEGORIES);
        expect(frontend.CONDITIONS).toEqual(CONDITIONS);
    });

    test('ML service knows every category and condition', () => {
        const ml = loadMlTaxonomy();

        expect([...ml.categories].sort()).toEqual([...CATEGORY_VALUES].sort());

        // Every category must price every condition; a missing key is what made
        // the service silently fall back to `good`.
        for (const [index, conditions] of ml.conditionSets.entries()) {
            expect([...conditions].sort()).toEqual([...CONDITION_VALUES].sort());
            expect(ml.categories[index]).toBeTruthy();
        }
    });

    test('ML condition ladder matches the backend ranking', () => {
        const source = fs.readFileSync(ML_SERVER, 'utf8');
        const match = source.match(/CONDITION_LADDER\s*=\s*\[([^\]]+)\]/);
        expect(match).toBeTruthy();

        const ladder = [...match[1].matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);
        const expected = [...CONDITIONS].sort((a, b) => a.rank - b.rank).map((c) => c.value);
        expect(ladder).toEqual(expected);
    });
});

/**
 * The frontend's fallback API base URL must stay same-origin.
 *
 * It used to default to `http://localhost:5000/api`. That is an absolute origin
 * which can never match the origin the page is served from, so opening the site
 * under any other hostname (marketplace.io, a LAN address) turned every request
 * cross-origin and it failed on the CORS allowlist. `/api` is proxied to the
 * backend by both the Vite dev server and nginx, so it works under any hostname.
 */
describe('frontend API routing', () => {
    test('the default base URL is relative, not a hardcoded origin', () => {
        const source = fs.readFileSync(FRONTEND_API_CLIENT, 'utf8');
        const fallback = source.match(/VITE_API_BASE_URL\s*\|\|\s*'([^']+)'/);

        expect(fallback).toBeTruthy();
        expect(fallback[1]).toBe('/api');
        expect(fallback[1]).not.toMatch(/^https?:\/\//);
    });
});
