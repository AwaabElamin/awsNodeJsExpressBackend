const assert = require('node:assert/strict');
const { test } = require('node:test');
function mock(name, exports) {
    const filename = require.resolve(name);
    require.cache[filename] = { id: filename, filename, loaded: true, exports };
}
let created;
let savedProduct;
let inboxOwner;
let appended;
mock('../models/users', {
    findPlatformOwnerById: async () => ({ _id: 'seller' }),
    getPublicSellerProfiles: async (ids, emails, platform) => {
        assert.equal(platform, 'groceries');
        assert.deepEqual(ids, ['seller']);
        assert.ok(emails.includes('legacy@example.invalid'));
        return [
            { _id: 'seller', firstname: 'Actual', lastname: 'Seller', email: 'actual@example.invalid' },
            { _id: 'legacy', firstname: 'Legacy', lastname: 'Seller', email: 'legacy@example.invalid' }
        ];
    }
});
mock('../models/groceryProduct', {
    getContactTarget: async () => ({ _id: '66df353d38a9a756b1b85ec4', title: 'Sample rice', ownerId: 'seller' }),
    getPublicProducts: async () => [
        { _id: 'one', title: 'Rice', ownerId: 'seller', email: 'outdated@example.invalid' },
        { _id: 'two', title: 'Beans', email: 'legacy@example.invalid' },
        { _id: 'three', title: 'Missing seller' }
    ],
    addProduct: async (data, ownerId) => { savedProduct = { ...data, ownerId }; return savedProduct; }
});
mock('../models/groceryMessage', {
    create: async (data) => { created = data; },
    listForOwner: async (ownerId) => { inboxOwner = ownerId; return []; },
    markOwnerRead: async () => null,
    appendMessage: async (id, accountId, sender, body) => {
        appended = { id, accountId, sender, body };
        return accountId === 'stranger' ? null : { _id: id, messages: [{ sender, body }] };
    },
    markVisitorRead: async (id, visitorId) => visitorId === 'stranger' ? null : { _id: id, messages: [] },
    listForVisitor: async (visitorId) => { inboxOwner = visitorId; return []; }
});
const messages = require('../controllers/groceryMessages');
const groceries = require('../controllers/groceries');
function response() {
    return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}
test('public grocery listings show actual seller profiles without exposing owner IDs or stored emails', async () => {
    const res = response();
    await groceries.listPublic({}, res, assert.ifError);
    const [owned, legacy, missing] = res.body.data;
    assert.equal(owned.sellerName, 'Actual Seller');
    assert.equal(owned.sellerEmail, 'actual@example.invalid');
    assert.equal(legacy.sellerName, 'Legacy Seller');
    assert.equal(missing.sellerName, '');
    assert.equal(missing.sellerEmail, '');
    for (const product of res.body.data) {
        assert.equal('ownerId' in product, false);
        assert.equal('email' in product, false);
    }
});
test('anonymous grocery inquiry is rejected', async () => {
    const res = response();
    await messages.create({}, res, assert.ifError);
    assert.equal(res.statusCode, 401);
});
test('registered visitor inquiry uses authenticated identity and stored product owner', async () => {
    const res = response();
    await messages.create({
        account: { _id: 'visitor', firstname: 'Registered', lastname: 'Visitor', email: 'visitor@example.invalid' },
        body: { productId: '66df353d38a9a756b1b85ec4', message: 'Available?', ownerId: 'fake', visitorEmail: 'fake@example.invalid' }
    }, res, assert.ifError);
    assert.equal(res.statusCode, 201);
    assert.equal(created.ownerId, 'seller');
    assert.equal(created.visitorId, 'visitor');
    assert.equal(created.visitorEmail, 'visitor@example.invalid');
});
test('grocery inbox lookup cannot read another seller inquiry', async () => {
    const res = response();
    await messages.get({ params: { id: '66df353d38a9a756b1b85ec4' }, account: { _id: 'other' } }, res, assert.ifError);
    assert.equal(res.statusCode, 404);
});
test('inbox lists only the authenticated seller and Visitors cannot provision seller access', async () => {
    const inbox = response();
    await messages.list({ account: { _id: 'authenticated-owner' }, query: { ownerId: 'fake' } }, inbox, assert.ifError);
    assert.equal(inboxOwner, 'authenticated-owner');
    const setup = response();
    await groceries.provisionUser({ account: { role: 'Visitors' } }, setup, assert.ifError);
    assert.equal(setup.statusCode, 403);
});
test('invalid product IDs and blank or oversized inquiries are rejected before writing', async () => {
    for (const body of [
        { productId: 'bad', message: 'Available?' },
        { productId: '66df353d38a9a756b1b85ec4', message: ' ' },
        { productId: '66df353d38a9a756b1b85ec4', message: 'x'.repeat(2001) }
    ]) {
        const res = response();
        await messages.create({ account: { _id: 'visitor' }, body }, res, assert.ifError);
        assert.equal(res.statusCode, 400);
    }
});
test('product creation requires country/state and binds seller from authentication', async () => {
    const body = { title: 'Rice', category: 'Pantry', unit: '1kg', price: 5, mainPhoto: 'https://example.invalid/rice.jpg' };
    for (const location of [{}, { country: 'Saudi Arabia', state: ' ' }, { country: 'x'.repeat(101), state: 'Dubai' }]) {
        const res = response();
        await groceries.create({ body: { ...body, ...location } }, res, assert.ifError);
        assert.equal(res.statusCode, 400);
    }
    const res = response();
    await groceries.create({
        body: { ...body, country: 'Saudi Arabia', state: 'Riyadh', ownerId: 'fake' },
        autoUser: { id: 'seller', email: 'seller@example.invalid' }
    }, res, assert.ifError);
    assert.equal(res.statusCode, 201);
    assert.equal(savedProduct.ownerId, 'seller');
    assert.equal(savedProduct.country, 'Saudi Arabia');
});
test('grocery owner and visitor replies bind sender and participant to the signed-in account', async () => {
    for (const [handler, sender] of [[messages.replyAsOwner, 'owner'], [messages.replyAsVisitor, 'visitor']]) {
        const res = response();
        await handler({
            params: { id: '66df353d38a9a756b1b85ec4' }, account: { _id: sender },
            body: { message: ' Saved message ', sender: 'fake', accountId: 'fake' }
        }, res, assert.ifError);
        assert.equal(res.statusCode, 200);
        assert.equal(appended.sender, sender);
        assert.equal(appended.accountId, sender);
        assert.equal(appended.body, 'Saved message');
        const denied = response();
        await handler({ params: { id: '66df353d38a9a756b1b85ec4' }, account: { _id: 'stranger' }, body: { message: 'No access' } }, denied, assert.ifError);
        assert.equal(denied.statusCode, 404);
    }
});
test('grocery visitor reads and lists use the signed-in account, not a browser token', async () => {
    const res = response();
    await messages.listForVisitor({ account: { _id: 'visitor' } }, res, assert.ifError);
    assert.equal(inboxOwner, 'visitor');
    const denied = response();
    await messages.getForVisitor({ params: { id: '66df353d38a9a756b1b85ec4' }, account: { _id: 'stranger' } }, denied, assert.ifError);
    assert.equal(denied.statusCode, 404);
});
