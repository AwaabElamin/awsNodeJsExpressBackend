const mongoose = require('mongoose');
const DB = require('../lib/db');

const deliveryModels = new Map();

function getDeliveryModel(collectionName) {
    if (typeof collectionName !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(collectionName)) {
        throw new Error('A valid Delivery collection name is required.');
    }

    const connection = DB.getConnection('delivery');
    if (!connection) {
        throw new Error("The 'delivery' MongoDB connection is not available.");
    }

    if (!deliveryModels.has(collectionName)) {
        const schema = new mongoose.Schema({}, {
            collection: collectionName,
            strict: false,
            minimize: false
        });
        deliveryModels.set(
            collectionName,
            DB.getModel('delivery', `Delivery_${collectionName}`, schema)
        );
    }

    return deliveryModels.get(collectionName);
}

async function listDeliveryCollections() {
    const connection = DB.getConnection('delivery');
    if (!connection) {
        throw new Error("The 'delivery' MongoDB connection is not available.");
    }

    const collections = await connection.db.listCollections({}, { nameOnly: true }).toArray();
    return collections
        .map((collection) => collection.name)
        .filter((name) => !name.startsWith('system.'));
}

module.exports = { getDeliveryModel, listDeliveryCollections };
