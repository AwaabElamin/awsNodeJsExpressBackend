const path = require('path');
const { MongoClient } = require('mongodb');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const apply = process.argv.includes('--apply');
const emailArgument = process.argv.find((argument) => argument.startsWith('--email='));
const email = emailArgument ? emailArgument.slice('--email='.length).trim().toLowerCase() : '';
const samples = [
    {
        make: 'Toyota',
        model: 'Camry SE',
        color: 'Silver',
        year: '2021',
        country: 'Saudi Arabia',
        state: 'Riyadh',
        description: '[SAMPLE] 2021 Toyota Camry SE listing. Sample details only; confirm condition and availability with the owner.',
        mainImage: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=70'
    },
    {
        make: 'Honda',
        model: 'CR-V EX',
        color: 'Blue',
        year: '2022',
        country: 'United Arab Emirates',
        state: 'Dubai',
        description: '[SAMPLE] 2022 Honda CR-V EX listing. Sample details only; confirm condition and availability with the owner.',
        mainImage: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=70'
    },
    {
        make: 'Nissan',
        model: 'Altima SV',
        color: 'White',
        year: '2020',
        country: 'Saudi Arabia',
        state: 'Makkah',
        description: '[SAMPLE] 2020 Nissan Altima SV listing. Sample details only; confirm condition and availability with the owner.',
        mainImage: 'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=1200&q=70'
    },
    {
        make: 'Ford',
        model: 'Mustang EcoBoost',
        color: 'Red',
        year: '2019',
        country: 'United Arab Emirates',
        state: 'Abu Dhabi',
        description: '[SAMPLE] 2019 Ford Mustang EcoBoost listing. Sample details only; confirm condition and availability with the owner.',
        mainImage: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=70'
    }
];

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function main() {
    if (process.argv.includes('--help')) {
        console.log('Usage: node scripts/seedSampleAutoCars.js --email=<client-email> [--apply]');
        console.log('Dry-run is the default. Existing sample listings are skipped.');
        return;
    }
    if (!email || !email.includes('@')) {
        throw new Error('Provide a valid client email with --email=<client-email>.');
    }

    const uri = process.env.MONGODB_URI_USERS;
    if (!uri) {
        throw new Error('MONGODB_URI_USERS is required.');
    }

    const parsedUri = new URL(uri);
    const usersDatabaseName = decodeURIComponent(parsedUri.pathname.replace(/^\/+/, '').split('/')[0] || '');
    const carshopDatabaseName = process.env.MONGODB_DB_CARSHOP || 'CarShop';
    if (!usersDatabaseName) {
        throw new Error('The users database name must be present in MONGODB_URI_USERS.');
    }

    const client = new MongoClient(uri);
    try {
        await client.connect();
        const users = client.db(usersDatabaseName).collection('users');
        const cars = client.db(carshopDatabaseName).collection('usedcars');
        const user = await users.findOne(
            { email: { $regex: new RegExp(`^${escapeRegex(email)}$`, 'i') } },
            { projection: { _id: 1, email: 1, emailVerified: 1, platforms: 1 } }
        );
        if (!user) {
            throw new Error('No client account matched the supplied email.');
        }
        if (user.emailVerified === false) {
            throw new Error('The client account is not verified; no listings were written.');
        }
        if (!Array.isArray(user.platforms) || !user.platforms.includes('auto')) {
            throw new Error('The client account does not have AutoHub enabled; no listings were written.');
        }

        let inserted = 0;
        let skipped = 0;
        console.log(`${apply ? 'APPLY' : 'DRY RUN'}: ${carshopDatabaseName}.usedcars`);
        for (const sample of samples) {
            const exists = await cars.findOne({
                ownerId: user._id,
                description: sample.description
            }, { projection: { _id: 1 } });
            if (exists) {
                skipped += 1;
                console.log(`skip   ${sample.year} ${sample.make} ${sample.model}`);
                continue;
            }
            if (apply) {
                await cars.insertOne({
                    ...sample,
                    photos: [],
                    imagesFolder: '',
                    ownerId: user._id,
                    email: user.email.trim().toLowerCase()
                });
            }
            inserted += 1;
            console.log(`${apply ? 'insert' : 'would insert'} ${sample.year} ${sample.make} ${sample.model}`);
        }
        console.log(`Listings ${apply ? 'inserted' : 'to insert'}: ${inserted}; already present: ${skipped}.`);
    } finally {
        await client.close();
    }
}

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
