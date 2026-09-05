/**
 * Create/update the indexes declared on the models.
 *
 * Index builds are a deliberate operation, not something that should happen
 * implicitly on every production boot, so server.js only auto-syncs outside
 * production. Run this once after deploying a schema change.
 *
 *   node scripts/syncIndexes.js
 */

const mongoose = require('mongoose');
const db = require('../src/config/db');

require('../src/models/User');
require('../src/models/Product');

async function main() {
    await db.connect();

    for (const [name, model] of Object.entries(mongoose.models)) {
        const dropped = await model.syncIndexes();
        const indexes = await model.collection.indexes();
        console.log(`\n${name}`);
        if (dropped.length > 0) console.log(`  removed stale: ${dropped.join(', ')}`);
        for (const index of indexes) {
            console.log(`  ${index.name}  ${JSON.stringify(index.key)}`);
        }
    }
    console.log('');
}

main()
    .then(async () => {
        await db.disconnect();
        process.exit(0);
    })
    .catch(async (err) => {
        console.error('❌ Index sync failed:', err.message);
        await db.disconnect().catch(() => {});
        process.exit(1);
    });
