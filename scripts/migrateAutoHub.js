require('dotenv').config();
const { MongoClient } = require('mongodb');

const applyChanges = process.argv.includes('--apply');
const platformId = 'auto';

function getMongoUri(variableName, fallback = '') {
    const uri = process.env[variableName] || fallback;
    if (!uri) {
        throw new Error(`${variableName} is required. Supply rotated credentials through the current shell environment.`);
    }

    let parsed;
    try {
        parsed = new URL(uri);
    } catch {
        throw new Error(`${variableName} must be a valid MongoDB URI.`);
    }

    if (decodeURIComponent(parsed.username).toLowerCase() === 'root'
        && decodeURIComponent(parsed.password) === '123') {
        throw new Error(`${variableName} uses the compromised legacy MongoDB credential. Refusing to connect.`);
    }

    return { uri, parsed };
}

function normalizeEmail(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function main() {
    if (process.argv.includes('--help')) {
        console.log('Usage: npm run migrate:autohub [-- --apply]');
        console.log('Dry-run is the default. This backfills owner IDs and platform access on the already-copied databases; it does not copy records.');
        return;
    }

    const usersConnection = getMongoUri('MONGODB_URI_USERS');
    const usersDatabaseName = decodeURIComponent(usersConnection.parsed.pathname.replace(/^\/+/, '').split('/')[0] || '');
    const carshopDatabaseName = process.env.MONGODB_DB_CARSHOP || 'CarShop';

    if (!usersDatabaseName || !carshopDatabaseName) {
        throw new Error('Both the users and CarShop database names must be configured.');
    }

    const client = new MongoClient(usersConnection.uri);

    try {
        await client.connect();

        const usersCollection = client.db(usersDatabaseName).collection('users');
        const vehiclesCollection = client.db(carshopDatabaseName).collection('usedcars');
        const vehicles = await vehiclesCollection.find({}, {
            projection: { _id: 1, email: 1, ownerId: 1 }
        }).toArray();
        const emails = [...new Set(vehicles.map((vehicle) => normalizeEmail(vehicle.email)).filter(Boolean))];
        const users = await usersCollection.find(
            {
                email: { $in: emails.map((email) => new RegExp(`^${escapeRegex(email)}$`, 'i')) },
                emailVerified: { $ne: false }
            },
            { projection: { _id: 1, email: 1, emailVerified: 1, platforms: 1 } }
        ).toArray();
        const usersByEmail = new Map(users.map((user) => [normalizeEmail(user.email), user]));
        const ownerIdsToEnable = new Map();
        const ownerIdBackfills = [];
        let missingEmail = 0;
        let missingOrUnverifiedAccount = 0;
        let ownerIdConflicts = 0;
        let alreadyLinked = 0;

        for (const vehicle of vehicles) {
            const email = normalizeEmail(vehicle.email);
            if (!email) {
                missingEmail += 1;
                continue;
            }

            const user = usersByEmail.get(email);
            if (!user) {
                missingOrUnverifiedAccount += 1;
                continue;
            }

            if (vehicle.ownerId && String(vehicle.ownerId) !== String(user._id)) {
                ownerIdConflicts += 1;
                continue;
            }

            ownerIdsToEnable.set(String(user._id), user._id);
            if (!vehicle.ownerId) {
                ownerIdBackfills.push({
                    updateOne: {
                        filter: { _id: vehicle._id, ownerId: null, email: vehicle.email },
                        update: { $set: { ownerId: user._id, email } }
                    }
                });
            } else {
                alreadyLinked += 1;
            }
        }

        const alreadyEnabled = users.filter((user) =>
            ownerIdsToEnable.has(String(user._id)) && Array.isArray(user.platforms) && user.platforms.includes(platformId)
        ).length;
        const platformMembershipsToAdd = Math.max(0, ownerIdsToEnable.size - alreadyEnabled);

        console.log(`Mode: ${applyChanges ? 'APPLY' : 'DRY RUN'}`);
        console.log(`Shared users database: ${usersDatabaseName}`);
        console.log(`Copied CarShop database: ${carshopDatabaseName}`);
        console.log(`Vehicles scanned: ${vehicles.length}`);
        console.log(`Verified Awaaab owners matched: ${ownerIdsToEnable.size}`);
        console.log(`Vehicle owner IDs to backfill: ${ownerIdBackfills.length}`);
        console.log(`Vehicles already linked by owner ID: ${alreadyLinked}`);
        console.log(`Platform memberships to add: ${platformMembershipsToAdd}`);
        console.log(`Vehicles with no owner email: ${missingEmail}`);
        console.log(`Vehicles with missing or unverified Awaaab owner: ${missingOrUnverifiedAccount}`);
        console.log(`Existing owner ID conflicts: ${ownerIdConflicts}`);

        if (!applyChanges) {
            console.log('No data was written. Review these counts, then rerun with --apply to backfill owner IDs and platform membership.');
            return;
        }

        if (missingEmail || missingOrUnverifiedAccount || ownerIdConflicts) {
            throw new Error('Unsafe backfill plan: resolve all missing owners, unverified accounts, and owner ID conflicts first. No writes were made.');
        }

        if (ownerIdsToEnable.size) {
            await usersCollection.updateMany(
                { _id: { $in: [...ownerIdsToEnable.values()] }, emailVerified: { $ne: false } },
                { $addToSet: { platforms: platformId } }
            );
        }
        if (ownerIdBackfills.length) {
            await vehiclesCollection.bulkWrite(ownerIdBackfills, { ordered: true });
        }

        console.log(`Platform memberships added: ${platformMembershipsToAdd}`);
        console.log(`Vehicle owner IDs backfilled: ${ownerIdBackfills.length}`);
        console.log('Copied vehicle documents were not duplicated.');
    } finally {
        await client.close();
    }
}

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
