const assert = require('node:assert/strict');
const { test } = require('node:test');
const { randomUUID } = require('node:crypto');

test('payment and seller onboarding records persist with account-scoped idempotency', {
    skip: process.env.PAYMENT_DB_TEST !== '1'
}, async () => {
    require('dotenv').config();
    const mongoose = require('mongoose');
    const DB = require('../lib/db');
    const buyerId = new mongoose.Types.ObjectId();
    const sellerId = new mongoose.Types.ObjectId();
    const requestKey = randomUUID();
    let Payment, Seller;
    let paymentId, sellerRecordId;
    try {
        await DB.connect(process.env.MONGODB_URI_USERS);
        ({ Payment, Seller } = require('../models/payment'));
        await Promise.all([Payment.init(), Seller.init()]);
        const seller = await Seller.create({ ownerId: sellerId, trackingId: randomUUID() });
        sellerRecordId = seller._id;
        assert.equal(seller.ready, false);
        const record = {
            buyerId, sellerId, requestKey, merchantId: 'TEST_ONLY_NO_PAYPAL_CALL',
            listingId: new mongoose.Types.ObjectId(), platform: 'groceries',
            label: '[TEST] Database payment persistence', amountCents: 345
        };
        const payment = await Payment.create(record);
        paymentId = payment._id;
        const stored = await Payment.findOne({ buyerId, requestKey }).lean();
        assert.equal(stored.amountCents, 345);
        assert.equal(stored.currency, 'USD');
        assert.equal(stored.environment, 'sandbox');
        assert.equal(stored.status, 'CREATING');
        assert.equal(await Payment.findOne({ _id: paymentId, buyerId: new mongoose.Types.ObjectId() }), null);
        await assert.rejects(Payment.create(record), error => error.code === 11000);
        await assert.rejects(Seller.create({ ownerId: sellerId, trackingId: randomUUID() }), error => error.code === 11000);
    } finally {
        try {
            if (paymentId) assert.equal((await Payment.deleteOne({ _id: paymentId, buyerId })).deletedCount, 1);
            if (sellerRecordId) assert.equal((await Seller.deleteOne({ _id: sellerRecordId, ownerId: sellerId })).deletedCount, 1);
        } finally { await DB.disconnectAll(); }
    }
});
