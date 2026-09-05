const mlClient = require('./mlClient');
const { Product } = require('../models/Product');
const { User } = require('../models/User');
const { accountAgeDays } = require('../utils/helpers');

/**
 * Fraud analysis: ML call + persistence of the verdict.
 *
 * The verdict is cached on the product document. That single decision is what
 * removes the fan-out the admin dashboard used to cause: the moderation table
 * reads `product.aiFraud` straight out of the list response instead of asking
 * for a fresh analysis per row.
 */

/** Seller signals the fraud model takes into account. */
async function sellerHistoryFor(product) {
    let createdAt = product?.seller?.createdAt;

    // `seller` may be an ObjectId (not populated) — one lookup, projected.
    if (!createdAt && product?.seller) {
        const sellerId = product.seller._id || product.seller;
        const seller = await User.findById(sellerId).select('createdAt').lean();
        createdAt = seller?.createdAt;
    }

    return {
        // The ML service treats a missing age as "established account".
        account_age_days: accountAgeDays(createdAt) ?? 999,
        report_count: 0
    };
}

async function persistVerdict(productId, verdict) {
    await Product.updateOne(
        { _id: productId },
        { $set: { aiFraud: verdict, isFlagged: verdict.is_flagged } }
    );
}

/**
 * Analyze one product and store the result.
 * Returns the verdict, or null when the ML service could not produce one.
 */
async function analyze(product) {
    const verdict = await mlClient.fraudCheck({
        product,
        sellerHistory: await sellerHistoryFor(product)
    });

    if (!verdict) {
        console.warn(`[fraud] unusable ML verdict for product ${product._id}`);
        return null;
    }

    await persistVerdict(product._id, verdict);
    return verdict;
}

/**
 * Analyze without blocking the caller.
 *
 * Listing creation used to await the ML round trip, so posting an item was as
 * slow as the ML service and failed with it. Analysis now runs after the
 * response is sent; anything that slips through is picked up lazily by
 * `getOrAnalyze` or in bulk by `backfill`.
 */
function queue(product) {
    setImmediate(() => {
        analyze(product).catch((err) => {
            console.error(`[fraud] background analysis failed for ${product._id}: ${err.message}`);
        });
    });
}

/** Cached verdict if present, otherwise analyze once and cache it. */
async function getOrAnalyze(product) {
    if (product.aiFraud?.risk_level) return product.aiFraud;
    return analyze(product);
}

/** Drop a stale verdict after the seller edits the listing's content. */
async function invalidate(productId) {
    await Product.updateOne(
        { _id: productId },
        { $set: { aiFraud: {}, isFlagged: false } }
    );
}

const BACKFILL_BATCH = 100;

/**
 * Analyze every product that has no verdict yet, in batches, using the ML
 * service's batch endpoint — one HTTP round trip and one bulkWrite per batch
 * instead of one of each per product.
 */
async function backfill({ limit = 1000 } = {}) {
    const pending = await Product.find({
        $or: [{ 'aiFraud.risk_level': null }, { 'aiFraud.risk_level': { $exists: false } }]
    })
        .select([...mlClient.CANDIDATE_FIELDS, 'seller'].join(' '))
        // One join for the whole batch instead of a seller lookup per product.
        .populate('seller', 'createdAt')
        .limit(limit)
        .lean();

    const summary = { pending: pending.length, analyzed: 0, flagged: 0, batches: 0, failed: 0 };

    for (let i = 0; i < pending.length; i += BACKFILL_BATCH) {
        const batch = pending.slice(i, i + BACKFILL_BATCH);
        summary.batches += 1;

        let verdicts;
        try {
            verdicts = await mlClient.fraudCheckBatch(
                batch.map((product) => ({
                    product,
                    sellerHistory: {
                        account_age_days: accountAgeDays(product.seller?.createdAt) ?? 999,
                        report_count: 0
                    }
                }))
            );
        } catch (err) {
            console.error(`[fraud] backfill batch failed: ${err.message}`);
            summary.failed += batch.length;
            continue;
        }

        const operations = [];
        for (const [productId, verdict] of verdicts) {
            operations.push({
                updateOne: {
                    filter: { _id: productId },
                    update: { $set: { aiFraud: verdict, isFlagged: verdict.is_flagged } }
                }
            });
            if (verdict.is_flagged) summary.flagged += 1;
        }

        if (operations.length > 0) {
            await Product.bulkWrite(operations, { ordered: false });
            summary.analyzed += operations.length;
        }
    }

    return summary;
}

module.exports = { analyze, queue, getOrAnalyze, invalidate, backfill, sellerHistoryFor };
