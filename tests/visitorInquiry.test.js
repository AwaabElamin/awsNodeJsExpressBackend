const assert = require('node:assert/strict');
const { test } = require('node:test');
function mockModule(name, exports) {
    const filename = require.resolve(name);
    require.cache[filename] = { id: filename, filename, loaded: true, exports };
}
let created;
mockModule('../models/users', { findPlatformOwnerById: async () => ({ _id: 'seller' }) });
mockModule('../models/autoUsedCar', {
    getContactTarget: async () => ({ _id: '66df353d38a9a756b1b85ec4', ownerId: 'seller', make: 'Toyota' })
});
mockModule('../models/autoMessage', {
    createConversation: async (data) => { created = data; return { _id: 'inquiry', ...data }; },
    appendForAccount: async () => null
});
const controller = require('../controllers/autoMessages');
function response() {
    return {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };
}
test('anonymous visitor cannot send inquiry', async () => {
    const res = response();
    await controller.startConversation({ body: {} }, res, assert.ifError);
    assert.equal(res.statusCode, 401);
});
test('registered Visitors can message with identity bound to account, not supplied sender', async () => {
    const res = response();
    await controller.startConversation({
        account: { role: 'Visitors', firstname: 'Registered', lastname: 'Visitor', email: 'real@example.invalid' },
        body: { vehicleId: '66df353d38a9a756b1b85ec4', visitorName: 'Fake', visitorEmail: 'fake@example.invalid', message: 'Available?' }
    }, res, assert.ifError);
    assert.equal(res.statusCode, 201);
    assert.equal(created.visitorName, 'Registered Visitor');
    assert.equal(created.visitorEmail, 'real@example.invalid');
});
test('conversation token alone cannot send as another visitor', async () => {
    const res = response();
    await controller.replyAsVisitor({
        params: { id: '66df353d38a9a756b1b85ec4' },
        account: { email: 'real@example.invalid' },
        headers: { 'x-auto-conversation-token': 'token' },
        body: { message: 'Follow-up' }
    }, res, assert.ifError);
    assert.equal(res.statusCode, 404);
});
