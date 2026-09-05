/**
 * Normalize legacy taxonomy values on existing documents.
 *
 * The database currently holds a mix of `like-new` (60 listings, from the old
 * seed script) and `like_new` (created through the UI), plus categories the
 * frontend could not offer. Those documents still read fine but now fail schema
 * validation on any save, and they render with raw labels.
 *
 * Dry run by default — nothing is written unless --apply is passed.
 *
 *   node scripts/migrateTaxonomy.js            # report only
 *   node scripts/migrateTaxonomy.js --apply    # write the changes
 */

const db = require('../src/config/db');
const { Product } = require('../src/models/Product');
const { User } = require('../src/models/User');
const {
    CATEGORY_VALUES,
    CONDITION_VALUES,
    LEGACY_CATEGORY_ALIASES,
    LEGACY_CONDITION_ALIASES
} = require('../src/config/taxonomy');
const { EMAIL_PATTERN } = require('../src/models/User');

const apply = process.argv.includes('--apply');

async function distinctCounts(field) {
    const rows = await Product.aggregate([
        { $group: { _id: `$${field}`, n: { $sum: 1 } } },
        { $sort: { n: -1 } }
    ]);
    return rows.map((r) => ({ value: r._id, count: r.n }));
}

async function migrateField(field, aliases, validValues) {
    const before = await distinctCounts(field);
    const renamable = before.filter((row) => aliases[row.value]);
    const unknown = before.filter((row) => !aliases[row.value] && !validValues.includes(row.value));

    for (const row of renamable) {
        const target = aliases[row.value];
        console.log(`  ${field}: "${row.value}" -> "${target}" (${row.count} documents)`);
        if (apply) {
            const { modifiedCount } = await Product.updateMany(
                { [field]: row.value },
                { $set: { [field]: target } }
            );
            console.log(`      updated ${modifiedCount}`);
        }
    }

    if (renamable.length === 0) console.log(`  ${field}: nothing to rename`);

    // Values with no known canonical equivalent are reported, never guessed at.
    for (const row of unknown) {
        console.log(
            `  ⚠️  ${field}: "${row.value}" (${row.count} documents) is not on the taxonomy ` +
                'and has no known alias — decide manually'
        );
    }

    return { renamed: renamable, unknown };
}

async function main() {
    await db.connect();

    console.log(`\n${apply ? '✏️  APPLYING' : '🔍 DRY RUN'} taxonomy migration\n`);

    console.log('Products');
    const conditions = await migrateField('condition', LEGACY_CONDITION_ALIASES, CONDITION_VALUES);
    const categories = await migrateField('category', LEGACY_CATEGORY_ALIASES, CATEGORY_VALUES);

    // Informational only: changing someone's email would break their login.
    const badEmails = await User.countDocuments({ email: { $not: EMAIL_PATTERN } });
    console.log('\nUsers');
    if (badEmails > 0) {
        console.log(
            `  ⚠️  ${badEmails} account(s) have an email the current schema would reject ` +
                '(.edu.in required). They can still sign in; re-seed to replace them.'
        );
    } else {
        console.log('  all emails satisfy the current schema');
    }

    console.log('\nAfter:');
    console.log('  conditions:', (await distinctCounts('condition')).map((r) => `${r.value}=${r.count}`).join(' '));
    console.log('  categories:', (await distinctCounts('category')).map((r) => `${r.value}=${r.count}`).join(' '));

    const outstanding = conditions.unknown.length + categories.unknown.length;
    if (!apply && (conditions.renamed.length > 0 || categories.renamed.length > 0)) {
        console.log('\nRe-run with --apply to write these changes.');
    }
    if (outstanding > 0) {
        console.log(`\n${outstanding} value(s) need a manual decision.`);
    }
    console.log('');
}

main()
    .then(async () => {
        await db.disconnect();
        process.exit(0);
    })
    .catch(async (err) => {
        console.error('❌ Migration failed:', err.message);
        await db.disconnect().catch(() => {});
        process.exit(1);
    });
