const assert = require('node:assert/strict');
const { test } = require('node:test');

function mockModule(name, exports) {
    const filename = require.resolve(name);
    require.cache[filename] = { id: filename, filename, loaded: true, exports };
}

let conversation;
mockModule('../models/users', {});
mockModule('../models/autoUsedCar', {});
mockModule('../models/autoMessage', {
    appendOwnerMessage: async (id, ownerId, body) => {
        assert.equal(id, '66df353d38a9a756b1b85ec4');
        assert.equal(ownerId, 'owner');
        if (!conversation) return null;
        conversation.messages.push({ sender: 'owner', body });
        return conversation;
    },
    readForAccount: async () => conversation
});
const controller = require('../controllers/autoMessages');
const req = () => ({
    params: { id: '66df353d38a9a756b1b85ec4' },
    account: { _id: 'owner' },
    body: { message: 'Saved chat reply.' },
    headers: { 'x-auto-conversation-token': 'token' }
});
function response() {
    return {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };
}

test('owner replies are saved and returned as in-app chat', async () => {
    conversation = { messages: [] };
    const res = response();
    await controller.replyAsOwner(req(), res, assert.ifError);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data.messages, [{ sender: 'owner', body: 'Saved chat reply.' }]);
});

test('another owner cannot reply to a conversation', async () => {
    conversation = null;
    const res = response();
    await controller.replyAsOwner(req(), res, assert.ifError);
    assert.equal(res.statusCode, 404);
});

test('emailed history is excluded from visitor threads', async () => {
    conversation = {
        messages: [
            { sender: 'visitor', body: 'Available?' },
            { sender: 'owner', body: 'Emailed history', delivery: 'email' }
        ]
    };
    const res = response();
    await controller.getForVisitor(req(), res, assert.ifError);
    assert.deepEqual(res.body.data.messages, [{ sender: 'visitor', body: 'Available?' }]);
});
