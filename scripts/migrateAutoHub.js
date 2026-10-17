require('dotenv').config();
const { MongoClient } = require('mongodb');

const batchSize = 400;
const applyChanges = process.argv.includes('--apply');

function getDatabaseName(uri, variableName) {
    let parsed;
    try {
        parsed = new URL(uri);
    } catch {
        throw new Error(`${variableName} must be a valid MongoDB URI.`);
    }

    const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, '').split('/')[0] || '');
    if (!databaseName) {
        throw new Error(`${variableName} must include a database name in its path.`);
    }

    return databaseName;
}

function getMongoHost(uri, variableName) {
    try {
        return new URL(uri).host.toLowerCase();
    } catch {
        throw new Error(`${variableName} must be a valid MongoDB URI.`);
    }
}

function getMongoUri(variableName) {
    const uri = process.env[variableName];
    if (!uri) {
        throw new Error(`${variableName} is required. Supply rotated credentials through the current shell environment.`);
    }
    try {
        const parsed = new URL(uri);
        if (decodeURIComponent(parsed.username).toLowerCase() === 'root'
            && decodeURIComponent(parsed.password) === '123') {
            throw new Error(`${variableName} uses the compromised legacy MongoDB credential. Refusing to connect.`);
        }
    } catch (error) {
        if (error instanceof Error && error.message.includes('compromised legacy')) {
            throw error;
        }
        throw new Error(`${variableName} must be a valid MongoDB URI.`);
    }

    return uri;
}

function chunks(values) {
    const result = [];
    for (let index = 0; index < values.length; index += batchSize) {
        result.push(values.slice(index, index + batchSize));
    }
    return result;
}

function normalizeEmail(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

async function collectExistingCars(collection, ids) {
    const existingCars = new Map();
    for (const idBatch of chunks(ids)) {
        const rows = await collection.find(
            { _id: { $in: idBatch } },
            { projection: { _id: 1, email: 1 } }
        ).toArray();
        for (const row of rows) {
            existingCars.set(String(row._id), row);
        }
    }
    return existingCars;
}

async function collectAwaaabUsers(collection, emails) {
    const usersByEmail = new Map();
    for (const emailBatch of chunks(emails)) {
        const rows = await collection.find(
            { email: { $in: emailBatch }, emailVerified: { $ne: false } },
            { projection: { email: 1, firstname: 1, lastname: 1 } }
        ).toArray();
        for (const row of rows) {
            const email = normalizeEmail(row.email);
            if (email) usersByEmail.set(email, row);
        }
    }
    return usersByEmail;
}

async function collectExistingProfiles(collection, emails) {
    const existingEmails = new Set();
    for (const emailBatch of chunks(emails)) {
        const rows = await collection.find(
            { email: { $in: emailBatch } },
            { projection: { email: 1 } }
        ).toArray();
        for (const row of rows) {
            const email = normalizeEmail(row.email);
            if (email) existingEmails.add(email);
        }
    }
    return existingEmails;
}

async function main() {
    if (process.argv.includes('--help')) {
        console.log('Usage: npm run migrate:autohub [-- --apply]');
        console.log('Dry-run is the default. --apply writes only after all ownership and ID checks pass.');
        return;
    }

    const sourceUri = getMongoUri('AUTOHUB_SOURCE_MONGODB_URI');
    const usersUri = getMongoUri('MONGODB_URI_USERS');
    const targetUri = getMongoUri('MONGODB_URI_CARSHOP');
    const sourceDatabaseName = getDatabaseName(sourceUri, 'AUTOHUB_SOURCE_MONGODB_URI');
    const usersDatabaseName = getDatabaseName(usersUri, 'MONGODB_URI_USERS');
    const targetDatabaseName = getDatabaseName(targetUri, 'MONGODB_URI_CARSHOP');
    if (getMongoHost(sourceUri, 'AUTOHUB_SOURCE_MONGODB_URI') === getMongoHost(targetUri, 'MONGODB_URI_CARSHOP')
        && sourceDatabaseName === targetDatabaseName) {
        throw new Error('Source and target resolve to the same MongoDB host/database. Refusing to run.');
    }

    const clients = [new MongoClient(sourceUri), new MongoClient(usersUri), new MongoClient(targetUri)];
    try {
        await Promise.all(clients.map((client) => client.connect()));

        const sourceCars = await clients[0].db(sourceDatabaseName).collection('usedCars')
            .find({}, {
                projection: {
                    _id: 1,
                    make: 1,
                    model: 1,
                    color: 1,
                    year: 1,
                    description: 1,
                    mainImage: 1,
                    imagesFolder: 1,
                    email: 1
                }
            })
            .toArray();

        const ownerEmails = [...new Set(sourceCars.map((car) => normalizeEmail(car.email)).filter(Boolean))];
        const usersCollection = clients[1].db(usersDatabaseName).collection('users');
        const targetDb = clients[2].db(targetDatabaseName);
        const targetCarsCollection = targetDb.collection('usedCars');
        const targetProfilesCollection = targetDb.collection('autoUsers');

        const usersByEmail = await collectAwaaabUsers(usersCollection, ownerEmails);
        const eligibleCars = [];
        let missingOwner = 0;
        let unverifiedOrUnknownOwner = 0;

        for (const sourceCar of sourceCars) {
            const email = normalizeEmail(sourceCar.email);
            if (!email) {
                missingOwner += 1;
                continue;
            }
            if (!usersByEmail.has(email)) {
                unverifiedOrUnknownOwner += 1;
                continue;
            }
            eligibleCars.push({
                _id: sourceCar._id,
                make: sourceCar.make,
                model: sourceCar.model,
                color: sourceCar.color,
                year: sourceCar.year,
                description: sourceCar.description,
                mainImage: sourceCar.mainImage,
                imagesFolder: sourceCar.imagesFolder,
                email
            });
        }

        const existingCars = await collectExistingCars(
            targetCarsCollection,
            eligibleCars.map((car) => car._id)
        );
        const carsToInsert = [];
        let alreadyPresent = 0;
        let ownerConflicts = 0;

        for (const car of eligibleCars) {
            const existing = existingCars.get(String(car._id));
            if (!existing) {
                carsToInsert.push(car);
            } else if (normalizeEmail(existing.email) === car.email) {
                alreadyPresent += 1;
            } else {
                ownerConflicts += 1;
            }
        }

        const ownersToProvision = [...new Set(carsToInsert.map((car) => car.email))];
        const existingProfileEmails = await collectExistingProfiles(targetProfilesCollection, ownersToProvision);
        const profilesWithLegacyPasswords = await targetProfilesCollection.countDocuments({ password: { $exists: true } });
        const profilesToInsert = ownersToProvision
            .filter((email) => !existingProfileEmails.has(email))
            .map((email) => {
                const user = usersByEmail.get(email);
                return {
                    email,
                    firstname: user.firstname || '',
                    lastname: user.lastname || '',
                    userRole: 'Employee',
                    status: 1
                };
            });

        console.log(`Mode: ${applyChanges ? 'APPLY' : 'DRY RUN'}`);
        console.log(`Source database: ${sourceDatabaseName}`);
        console.log(`Awaaab users database: ${usersDatabaseName}`);
        console.log(`Target database: ${targetDatabaseName}`);
        console.log(`Source vehicles: ${sourceCars.length}`);
        console.log(`Vehicles ready to insert: ${carsToInsert.length}`);
        console.log(`Existing same-owner vehicles left unchanged: ${alreadyPresent}`);
        console.log(`Vehicles without an owner email: ${missingOwner}`);
        console.log(`Vehicles whose owner has no verified Awaaab account: ${unverifiedOrUnknownOwner}`);
        console.log(`Vehicle ID owner conflicts: ${ownerConflicts}`);
        console.log(`AutoHub profiles ready to create: ${profilesToInsert.length}`);
        console.log(`Existing AutoHub profiles with legacy passwords to remove: ${profilesWithLegacyPasswords}`);

        if (!applyChanges) {
            console.log('No data was written. Review the counts and database names, then rerun with --apply to commit the migration.');
            return;
        }

        if (missingOwner || unverifiedOrUnknownOwner || ownerConflicts) {
            throw new Error('Unsafe migration plan: resolve all missing owners, account mismatches, and ID conflicts before applying. No writes were made.');
        }

        const passwordCleanup = await targetProfilesCollection.updateMany(
            { password: { $exists: true } },
            { $unset: { password: '' } }
        );
        if (profilesToInsert.length) {
            await targetProfilesCollection.insertMany(profilesToInsert, { ordered: true });
        }
        if (carsToInsert.length) {
            await targetCarsCollection.insertMany(carsToInsert, { ordered: true });
        }

        console.log(`Created AutoHub profiles: ${profilesToInsert.length}`);
        console.log(`Copied vehicles: ${carsToInsert.length}`);
        console.log(`Removed legacy AutoHub passwords: ${passwordCleanup.modifiedCount}`);
    } finally {
        await Promise.all(clients.map((client) => client.close()));
    }
}

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
