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
                title: 'Classic potato chips', category: 'Pantry', unit: '13 oz bag', price: 3.45,
                country: 'Saudi Arabia', state: 'Riyadh',
                mainPhoto: 'https://i5.walmartimages.com/seo/Lay-s-Classic-Potato-Snack-Chips-Party-Size-13-oz-Bag_066afffd-49e9-4d1c-abb4-3cdce85da3f0.43865a58381c82680d373ec7449460e4.jpeg'
            },
            {
                title: 'Beef rib roast', category: 'Meat & poultry', unit: 'per package', price: 69.66,
                country: 'United Arab Emirates', state: 'Dubai',
                mainPhoto: 'https://i5.walmartimages.com/seo/Beef-Choice-Angus-Prime-Rib-Roast-Bone-In-2-75-9-1-lb_f43fe09d-ab6f-4893-8083-810f7f1bb1be.b6ea5ff6fcfbc1d90577a374044d3078.jpeg'
            },
            {
                title: 'Fresh red apples', category: 'Fruit & vegetables', unit: '1 kg', price: 4.25,
                country: 'Saudi Arabia', state: 'Riyadh',
                mainPhoto: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=800&q=80'
            },
            {
                title: 'Ripe bananas', category: 'Fruit & vegetables', unit: '1 kg', price: 2.75,
                country: 'United Arab Emirates', state: 'Dubai',
                mainPhoto: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=800&q=80'
            },
            {
                title: 'Fresh oranges', category: 'Fruit & vegetables', unit: '1 kg', price: 3.50,
                country: 'Saudi Arabia', state: 'Makkah',
                mainPhoto: 'https://images.unsplash.com/photo-1547514701-42782101795e?auto=format&fit=crop&w=800&q=80'
            },
            {
                title: 'Vine tomatoes', category: 'Fruit & vegetables', unit: '500 g', price: 2.25,
                country: 'United Arab Emirates', state: 'Abu Dhabi',
                mainPhoto: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=800&q=80'
            },
            {
                title: 'Fresh carrots', category: 'Fruit & vegetables', unit: '1 kg', price: 2.10,
                country: 'Saudi Arabia', state: 'Eastern Province',
                mainPhoto: 'https://images.unsplash.com/photo-1445282768818-728615cc910a?auto=format&fit=crop&w=800&q=80'
            },
            {
                title: 'Whole milk', category: 'Dairy & eggs', unit: '1 litre', price: 1.95,
                country: 'United Arab Emirates', state: 'Sharjah',
                mainPhoto: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=800&q=80'
            },
            {
                title: 'Farm eggs', category: 'Dairy & eggs', unit: '12 eggs', price: 3.80,
                country: 'Saudi Arabia', state: 'Madinah',
                mainPhoto: 'https://images.unsplash.com/photo-1518569656558-1f25e69d93d7?auto=format&fit=crop&w=800&q=80'
            },
            {
                title: 'Whole wheat bread', category: 'Bakery', unit: '600 g loaf', price: 2.90,
                country: 'United Arab Emirates', state: 'Ajman',
                mainPhoto: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80'
            },
            {
                title: 'Long grain rice', category: 'Pantry', unit: '2 kg bag', price: 5.40,
                country: 'Saudi Arabia', state: 'Riyadh',
                mainPhoto: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80'
            },
            {
                title: 'Roasted coffee beans', category: 'Beverages', unit: '250 g bag', price: 7.50,
                country: 'United Arab Emirates', state: 'Dubai',
                mainPhoto: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=800&q=80'
            }
        ];
        const missing = [];
        for (const sample of samples) {
            if (!await products.findOne({ ownerId: owner._id, title: { $in: [sample.title, `[SAMPLE] ${sample.title}`] } })) missing.push(sample);
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
