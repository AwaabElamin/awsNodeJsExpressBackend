const path = require('path');
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

async function main() {
    const emailArgument = process.argv.find(argument => argument.startsWith('--email='));
    if (!emailArgument) throw new Error('Supply --email=<existing verified Client email>. Dry-run by default; --apply writes.');
    const email = emailArgument.slice('--email='.length).trim().toLowerCase();
    const uri = process.env.MONGODB_URI_USERS;
    if (!uri) throw new Error('MONGODB_URI_USERS is required.');
    const usersDb = decodeURIComponent(new URL(uri).pathname.slice(1).split('/')[0]);
    if (!usersDb) throw new Error('Users database must be specified in the connection URI.');
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const users = client.db(usersDb).collection('users');
        const owner = await users.findOne({ email, emailVerified: true, role: { $in: ['Client', 'Admin'] } });
        if (!owner) throw new Error('A verified Client or Admin account is required.');
        const products = client.db(process.env.MONGODB_DB_GROCERIES || 'Groceries').collection('products');
        const samples = [
            {
                title: '[SAMPLE] Classic potato chips', category: 'Pantry', unit: '13 oz bag', price: 3.45,
                country: 'Saudi Arabia', state: 'Riyadh',
                mainPhoto: 'https://i5.walmartimages.com/seo/Lay-s-Classic-Potato-Snack-Chips-Party-Size-13-oz-Bag_066afffd-49e9-4d1c-abb4-3cdce85da3f0.43865a58381c82680d373ec7449460e4.jpeg'
            },
            {
                title: '[SAMPLE] Beef rib roast', category: 'Meat & poultry', unit: 'per package', price: 69.66,
                country: 'United Arab Emirates', state: 'Dubai',
                mainPhoto: 'https://i5.walmartimages.com/seo/Beef-Choice-Angus-Prime-Rib-Roast-Bone-In-2-75-9-1-lb_f43fe09d-ab6f-4893-8083-810f7f1bb1be.b6ea5ff6fcfbc1d90577a374044d3078.jpeg'
            }
        ];
        const missing = [];
        for (const sample of samples) {
            if (!await products.findOne({ ownerId: owner._id, title: sample.title })) missing.push(sample);
        }
        console.log(`${process.argv.includes('--apply') ? 'Apply' : 'Dry-run'}: ${missing.length} new sample grocery listings; other products are preserved.`);
        if (!process.argv.includes('--apply')) return;
        const session = client.startSession();
        try {
            await session.withTransaction(async () => {
                const result = await users.updateOne(
                    { _id: owner._id, emailVerified: true, role: { $in: ['Client', 'Admin'] } },
                    { $addToSet: { platforms: 'groceries' } }, { session }
                );
                if (result.matchedCount !== 1) throw new Error('Seller account changed; no samples were written.');
                const now = new Date();
                for (const sample of missing) {
                    await products.updateOne({ ownerId: owner._id, title: sample.title }, { $setOnInsert: {
                        ...sample, ownerId: owner._id, email: owner.email, photos: [sample.mainPhoto],
                        ingredients: { ingredients: '', activeIngredientName: '' },
                        aboutItem: { nutritionFacts: '', productDetails: 'Demonstration listing, not a real offer.' },
                        aboutBrand: { brandName: '' }, specifications: '', customerRatingReviews: [],
                        createdAt: now, updatedAt: now
                    } }, { upsert: true, session });
                }
            });
        } finally { await session.endSession(); }
        console.log('Sample groceries saved; grocery membership enabled for the existing seller.');
    } finally { await client.close(); }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
