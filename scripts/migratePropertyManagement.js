// Copies data from the standalone property-management database into the
// Awaab property-management database. Defaults to a dry run; pass --apply to write.
//
//   SOURCE_MONGODB_URI=mongodb://.../amlak MONGODB_URI_USERS=... \
//     node scripts/migratePropertyManagement.js [--apply]
//
// Existing target documents are never overwritten (matching _id or unique key is skipped),
// so the script can be re-run safely. Property-admin users are not copied because
// the Awaab Admin account replaces them.
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const apply = process.argv.includes('--apply');
const sourceUri = process.env.SOURCE_MONGODB_URI;
const targetUri = process.env.MONGODB_URI_USERS || process.env.MONGODB_URI;
const targetDbName = process.env.MONGODB_DB_PROPERTY_MANAGEMENT || 'PropertyManagement';

async function main() {
  if (!sourceUri || !targetUri) {
    throw new Error('Set SOURCE_MONGODB_URI (include the database name) and MONGODB_URI_USERS.');
  }

  const source = await MongoClient.connect(sourceUri);
  const target = await MongoClient.connect(targetUri);
  try {
    const sourceDb = source.db();
    const targetDb = target.db(targetDbName);
    if (sourceDb.databaseName === targetDb.databaseName && sourceUri === targetUri) {
      throw new Error('Source and target are the same database.');
    }

    console.log(`${apply ? 'APPLY' : 'DRY RUN'}: ${sourceDb.databaseName} -> ${targetDb.databaseName}`);
    const collections = await sourceDb.listCollections({}, { nameOnly: true }).toArray();

    for (const { name } of collections) {
      if (name.startsWith('system.')) continue;
      const filter = name === 'users' ? { role: { $ne: 'admin' } } : {};
      const docs = await sourceDb.collection(name).find(filter).toArray();
      let inserted = 0;
      let skipped = 0;

      for (const doc of docs) {
        if (!apply) {
          inserted += 1;
          continue;
        }
        try {
          await targetDb.collection(name).insertOne(doc);
          inserted += 1;
        } catch (error) {
          if (error.code !== 11000) throw error;
          skipped += 1;
        }
      }
      console.log(`${name}: ${apply ? 'copied' : 'would copy'} ${inserted}, skipped ${skipped}`);
    }

    console.log('Done. Copy the source uploads folder into the new uploads directory so image URLs keep working.');
  } finally {
    await source.close();
    await target.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
