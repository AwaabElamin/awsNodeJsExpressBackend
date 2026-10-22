const path = require('path');
const express = require('express');
const { MongoClient } = require('mongodb');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const uri = process.env.MONGODB_URI_USERS;
const usersDatabaseName = uri
    ? decodeURIComponent(new URL(uri).pathname.replace(/^\/+/, '').split('/')[0] || '')
    : '';
const carshopDatabaseName = process.env.MONGODB_DB_CARSHOP || 'CarShop';
const port = 3002;
const frontendOrigin = 'http://127.0.0.1:5173';

async function start() {
    if (!uri) {
        throw new Error('MONGODB_URI_USERS is required in the backend .env file.');
    }
    if (!usersDatabaseName) {
        throw new Error('The users database name must be present in MONGODB_URI_USERS.');
    }

    const client = new MongoClient(uri, { readPreference: 'primary' });
    await client.connect();

    const users = client.db(usersDatabaseName).collection('users');
    const cars = client.db(carshopDatabaseName).collection('usedcars');
    const app = express();

    app.use((req, res, next) => {
        res.set('Access-Control-Allow-Origin', frontendOrigin);
        res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') {
            return res.sendStatus(204);
        }
        return next();
    });

    app.get(['/auto/seller-details', '/groceries/seller-details'], async (req, res, next) => {
        try {
            const collection = req.path.startsWith('/groceries/')
                ? client.db(process.env.MONGODB_DB_GROCERIES || 'Groceries').collection('products')
                : cars;
            const listings = await collection.find({}, {
                projection: { _id: 1, ownerId: 1, email: 1 }
            }).toArray();
            const ownerIds = listings.map((listing) => listing.ownerId).filter(Boolean);
            const emails = [...new Set(listings
                .map((listing) => typeof listing.email === 'string' ? listing.email.trim().toLowerCase() : '')
                .filter(Boolean))];
            const accounts = await users.find({
                $or: [
                    { _id: { $in: ownerIds } },
                    { email: { $in: emails } }
                ]
            }, {
                projection: { _id: 1, email: 1, firstname: 1, lastname: 1 }
            }).toArray();

            const accountById = new Map(accounts.map((account) => [String(account._id), account]));
            const accountByEmail = new Map(accounts.map((account) => [
                String(account.email || '').trim().toLowerCase(),
                account
            ]));
            const data = {};

            for (const listing of listings) {
                const account = (listing.ownerId && accountById.get(String(listing.ownerId)))
                    || accountByEmail.get(String(listing.email || '').trim().toLowerCase());
                const sellerName = account
                    ? [account.firstname, account.lastname].filter((part) => typeof part === 'string' && part.trim()).join(' ').trim()
                    : '';
                const sellerEmail = account?.email || listing.email || '';
                if (sellerName || sellerEmail) {
                    data[String(listing._id)] = { sellerName, sellerEmail };
                }
            }

            return res.json({ status: 'success', data });
        } catch (error) {
            return next(error);
        }
    });

    app.use((error, req, res, next) => {
        console.error('Local AutoHub seller lookup failed:', error.message);
        return res.status(500).json({ status: 'error', message: 'Unable to read seller details from the configured database.' });
    });

    const server = app.listen(port, '127.0.0.1', () => {
        console.log(`Read-only local AutoHub seller lookup listening at http://127.0.0.1:${port}`);
    });
    server.on('close', () => client.close().catch((error) => {
        console.error('Could not close MongoDB connection:', error.message);
    }));
}

start().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
