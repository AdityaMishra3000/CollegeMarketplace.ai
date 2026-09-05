/**
 * Fill in fraud verdicts for listings that do not have one.
 *
 * Replaces analyzeExistingProducts.js, which re-declared its own copies of the
 * schemas and issued one ML request per product. This uses the real models and
 * the ML service's batch endpoint through fraudService.
 *
 *   node scripts/backfillFraud.js
 *   node scripts/backfillFraud.js --limit 200
 */

const db = require('../src/config/db');
const fraudService = require('../src/services/fraudService');

function parseLimit() {
    const index = process.argv.indexOf('--limit');
    if (index === -1) return undefined;
    const value = Number.parseInt(process.argv[index + 1], 10);
    return Number.isFinite(value) && value > 0 ? value : undefined;
}

async function main() {
    await db.connect();

    const limit = parseLimit();
    const summary = await fraudService.backfill(limit ? { limit } : {});

    console.log('\n🤖 Fraud backfill');
    console.log(`  products needing analysis : ${summary.pending}`);
    console.log(`  analyzed                  : ${summary.analyzed}`);
    console.log(`  flagged                   : ${summary.flagged}`);
    console.log(`  ML round trips            : ${summary.batches}`);
    if (summary.failed > 0) console.log(`  failed                    : ${summary.failed}`);
    console.log('');
}

main()
    .then(async () => {
        await db.disconnect();
        process.exit(0);
    })
    .catch(async (err) => {
        console.error('❌ Backfill failed:', err.message);
        await db.disconnect().catch(() => {});
        process.exit(1);
    });
