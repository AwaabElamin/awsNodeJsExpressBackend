// Inserts sample vacant properties into the property-management database.
// Dry run by default; pass --apply to write. Existing names are skipped, so it is safe to re-run.
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const apply = process.argv.includes('--apply');
const uri = process.env.MONGODB_URI_USERS || process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_PROPERTY_MANAGEMENT || 'PropertyManagement';

// Stored type/status values stay in Arabic to match the existing data and backend filters.
const photo = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=70`;
const samples = [
  {
    name: 'Sample - Modern 2BR Apartment',
    address: 'Olaya District, Riyadh',
    type: 'سكني',
    sub_type: 'Apartment',
    price: 3500,
    area: 120,
    bedrooms: 2,
    bathrooms: 2,
    image_url: photo('photo-1545324418-cc1a3fa10c00'),
  },
  {
    name: 'Sample - Family Villa with Garden',
    address: 'Al Nakheel, Riyadh',
    type: 'سكني',
    sub_type: 'Villa',
    price: 9500,
    area: 420,
    bedrooms: 5,
    bathrooms: 4,
    image_url: photo('photo-1564013799919-ab600027ffc6'),
  },
  {
    name: 'Sample - Prime Retail Shop',
    address: 'King Fahd Road, Riyadh',
    type: 'تجاري',
    sub_type: 'Shop',
    price: 7000,
    area: 85,
    bathrooms: 1,
    image_url: photo('photo-1441986300917-64674bd600d8'),
  },
  {
    name: 'Sample - Office Suite',
    address: 'Business District, Riyadh',
    type: 'تجاري',
    sub_type: 'Office',
    price: 5200,
    area: 140,
    bathrooms: 2,
    image_url: photo('photo-1497366216548-37526070297c'),
  },
];

async function main() {
  if (!uri) throw new Error('Set MONGODB_URI_USERS.');
  const client = await MongoClient.connect(uri);
  try {
    const col = client.db(dbName).collection('properties');
    console.log(`${apply ? 'APPLY' : 'DRY RUN'}: ${dbName}.properties`);
    for (const sample of samples) {
      if (await col.findOne({ name: sample.name })) {
        console.log(`skip   ${sample.name}`);
        continue;
      }
      if (apply) {
        await col.insertOne({ ...sample, status: 'شاغر', units: 1, ownerships: [], created_at: new Date(), updatedAt: new Date() });
      }
      console.log(`${apply ? 'insert' : 'would insert'} ${sample.name}`);
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
