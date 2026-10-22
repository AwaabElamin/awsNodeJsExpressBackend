const assert = require('node:assert/strict');
const { test } = require('node:test');

test('AutoHub and Groceries persist two-way chat and enforce account ownership', {
    skip: process.env.CHAT_DB_TEST !== '1'
}, async () => {
    require('dotenv').config();
    const mongoose = require('mongoose');
    const DB = require('../lib/db');
    const uri = process.env.MONGODB_URI_USERS;
    assert.ok(uri, 'MONGODB_URI_USERS is required for the opt-in persistence test');
    const ownerId = new mongoose.Types.ObjectId();
    const visitorId = new mongoose.Types.ObjectId();
    const strangerId = new mongoose.Types.ObjectId();
    const account = { _id: visitorId, email: `chat-test-${visitorId}@example.invalid` };
    const records = [];
    try {
        await DB.connect(uri);
        await DB.createConnection('carshop', uri, { dbName: process.env.MONGODB_DB_CARSHOP || 'CarShop' });
        await DB.createConnection('groceries', uri, { dbName: process.env.MONGODB_DB_GROCERIES || 'Groceries' });
        const auto = require('../models/autoMessage');
        const grocery = require('../models/groceryMessage');
        const autoRecord = await auto.createConversation({
            vehicleId: new mongoose.Types.ObjectId(), vehicleLabel: '[TEST] Chat persistence',
            ownerId, visitorId, visitorName: 'Test Visitor', visitorEmail: account.email,
            visitorTokenHash: 'test-only-not-used-for-account-access',
            messages: [{ sender: 'visitor', body: 'Initial question' }]
        });
        records.push([DB.getConnection('carshop').model('autoMessages'), autoRecord._id]);
        const groceryRecord = await grocery.create({
            productId: new mongoose.Types.ObjectId(), vehicleLabel: '[TEST] Chat persistence',
            ownerId, visitorId, visitorName: 'Test Visitor', visitorEmail: account.email,
            messages: [{ sender: 'visitor', body: 'Initial question' }]
        });
        records.push([DB.getConnection('groceries').model('GroceryMessage'), groceryRecord._id]);

        for (const [model, id] of records) {
            const isAuto = model.modelName === 'autoMessages';
            const deniedOwner = isAuto
                ? await auto.appendOwnerMessage(id, strangerId, 'Not allowed')
                : await grocery.appendMessage(id, strangerId, 'owner', 'Not allowed');
            assert.equal(deniedOwner, null);
            const deniedVisitor = isAuto
                ? await auto.appendForAccount(id, { _id: strangerId, email: 'stranger@example.invalid' }, 'Not allowed')
                : await grocery.appendMessage(id, strangerId, 'visitor', 'Not allowed');
            assert.equal(deniedVisitor, null);
            const reply = isAuto
                ? await auto.appendOwnerMessage(id, ownerId, 'Seller response')
                : await grocery.appendMessage(id, ownerId, 'owner', 'Seller response');
            assert.equal(reply.visitorUnreadCount, 1);
            const read = isAuto ? await auto.readForAccount(id, account) : await grocery.markVisitorRead(id, visitorId);
            assert.equal(read.visitorUnreadCount, 0);
            assert.equal(read.messages[1].body, 'Seller response');
            if (isAuto) await auto.appendForAccount(id, account, 'Visitor follow-up');
            else await grocery.appendMessage(id, visitorId, 'visitor', 'Visitor follow-up');
            const stored = await model.findById(id).lean().exec();
            assert.deepEqual(stored.messages.map(message => message.body), [
                'Initial question', 'Seller response', 'Visitor follow-up'
            ]);
            assert.equal(stored.ownerUnreadCount, 2);
            const listed = isAuto ? await auto.listForVisitor(account) : await grocery.listForVisitor(visitorId);
            assert.ok(listed.some(item => String(item._id) === String(id)));
            if (isAuto) {
                await model.updateOne({ _id: id }, { $unset: { visitorId: '' } });
                assert.ok(await auto.readForAccount(id, account), 'Legacy chat is recovered by immutable account email');
            }
        }
    } finally {
        try {
            for (const [model, id] of records) {
                const deleted = await model.deleteOne({ _id: id });
                assert.equal(deleted.deletedCount, 1, 'Only the exact temporary test conversation is removed');
            }
        } finally { await DB.disconnectAll(); }
    }
});
