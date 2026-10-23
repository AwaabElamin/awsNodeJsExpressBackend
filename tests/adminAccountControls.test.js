const assert = require('node:assert/strict');
const { test } = require('node:test');
const mongoose = require('mongoose');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-secret';

function mockModule(name, exports) {
    const filename = require.resolve(name);
    require.cache[filename] = { id: filename, filename, loaded: true, exports };
}

const ids = {
    client: new mongoose.Types.ObjectId(),
    visitor: new mongoose.Types.ObjectId(),
    admin: new mongoose.Types.ObjectId(),
    warning: new mongoose.Types.ObjectId(),
    thread: new mongoose.Types.ObjectId()
};
const accounts = {
    client: { _id: ids.client, email: 'client@example.invalid', role: 'Client', emailVerified: true, isActive: true, warnings: [], password: 'hash' },
    visitor: { _id: ids.visitor, email: 'visitor@example.invalid', role: 'Visitors', emailVerified: true, isActive: true, warnings: [] },
    admin: { _id: ids.admin, email: 'admin@local.invalid', role: 'Admin', emailVerified: true, isActive: true }
};
const calls = { setActive: [], warnings: [], removed: [], deletedThreads: [] };

const managed = (id) => Object.values(accounts).find((account) => String(account._id) === String(id) && account.role !== 'Admin') || null;

mockModule('../models/users', {
    findByEmail: async (email) => Object.values(accounts).find((account) => account.email === email) || null,
    findByLoginId: async (loginId) => Object.values(accounts).find((account) => account.email === loginId) || null,
    getManagedAccountForAdmin: async (id) => managed(id),
    setActiveForAdmin: async (id, isActive) => { const account = managed(id); if (account) { calls.setActive.push({ id, isActive }); account.isActive = isActive; } return account; },
    addWarningForAdmin: async (id, message) => { const account = managed(id); if (account) { calls.warnings.push(message); account.warnings.push({ _id: ids.warning, message, createdAt: new Date() }); } return account; },
    removeWarningForAdmin: async (id, warningId) => { const account = managed(id); if (!account) return null; const before = account.warnings.length; account.warnings = account.warnings.filter((w) => String(w._id) !== String(warningId)); if (before === account.warnings.length) return null; calls.removed.push(warningId); return account; }
});
mockModule('../models/autoUsedCar', {
    getCarsForOwner: async (ownerId) => String(ownerId) === String(ids.client) ? [{ _id: 'car-1', make: 'Toyota', model: 'Camry', year: '2020', price: 15000, country: 'USA', state: 'TX' }] : []
});
mockModule('../models/groceryProduct', {
    getProductsForOwner: async (ownerId) => String(ownerId) === String(ids.client) ? [{ _id: 'prod-1', title: 'Apples', category: 'Fruit', unit: 'kg', price: 3, country: 'USA', state: 'TX' }] : []
});
mockModule('../models/autoMessage', {
    listForAccountAdmin: async (account) => [{
        _id: ids.thread, vehicleId: 'car-1', vehicleLabel: '2020 Toyota Camry', ownerId: ids.client, visitorId: ids.visitor,
        visitorName: 'Visitor', visitorEmail: 'visitor@example.invalid',
        messages: [{ sender: 'visitor', body: 'Is it available?', createdAt: new Date('2026-01-01') }, { sender: 'owner', body: 'Yes', createdAt: new Date('2026-01-02') }],
        lastMessageAt: new Date('2026-01-02')
    }].filter((thread) => String(thread.ownerId) === String(account._id) || String(thread.visitorId) === String(account._id)),
    getByIdAdmin: async (id) => String(id) === String(ids.thread) ? { _id: ids.thread, messages: [], vehicleLabel: '2020 Toyota Camry' } : null,
    deleteByIdAdmin: async (id) => { if (String(id) !== String(ids.thread)) return null; calls.deletedThreads.push(id); return { _id: id }; }
});
mockModule('../models/groceryMessage', {
    listForAccountAdmin: async () => [],
    getByIdAdmin: async () => null,
    deleteByIdAdmin: async () => null
});
mockModule('../lib/mailer', { sendVerificationEmail: async () => {} });
mockModule('bcrypt', { compareSync: () => true, hashSync: () => 'hash' });

const JwtManager = require('../jwt/jwtManager');
const auth = require('../controllers/auth');
const requireAutoUser = require('../middleware/requireAutoUser');
const adminUsers = require('../controllers/adminUsers');

function response() {
    return {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };
}
const bearer = (email) => ({ authorization: `Bearer ${new JwtManager().generate({ email })}` });

test('deactivated accounts cannot sign in', async () => {
    accounts.client.isActive = false;
    const res = response();
    await auth.login({ body: { email: accounts.client.email, password: 'x' } }, res);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.code, 'ACCOUNT_DEACTIVATED');
    accounts.client.isActive = true;
    const ok = response();
    await auth.login({ body: { email: accounts.client.email, password: 'x' } }, ok);
    assert.equal(ok.body.status, 'success');
});

test('existing tokens are rejected once an account is deactivated', async () => {
    accounts.client.isActive = false;
    const res = response();
    let nextCalled = false;
    await auth.authorize({ headers: bearer(accounts.client.email) }, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);

    const messaging = response();
    await requireAutoUser({ headers: bearer(accounts.client.email) }, messaging, () => { nextCalled = true; });
    assert.equal(messaging.statusCode, 403);
    assert.equal(messaging.body.code, 'ACCOUNT_DEACTIVATED');
    assert.equal(nextCalled, false);

    accounts.client.isActive = true;
    const req = { headers: bearer(accounts.client.email) };
    await auth.authorize(req, response(), () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(req.user.email, accounts.client.email);
});

test('admin overview returns listings and conversations for a client', async () => {
    const res = response();
    await adminUsers.getAccountOverview({ params: { id: String(ids.client) } }, res, assert.ifError);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.account.email, accounts.client.email);
    assert.equal(res.body.data.listings.cars.length, 1);
    assert.equal(res.body.data.listings.products.length, 1);
    assert.equal(res.body.data.conversations.length, 1);
    assert.equal(res.body.data.conversations[0].accountSide, 'owner');
    assert.equal(res.body.data.conversations[0].messageCount, 2);
    assert.equal(res.body.data.conversations[0].lastMessage.body, 'Yes');
});

test('admin overview works for visitors from the visitor side and never for Admin', async () => {
    const res = response();
    await adminUsers.getAccountOverview({ params: { id: String(ids.visitor) } }, res, assert.ifError);
    assert.equal(res.body.data.listings.cars.length, 0);
    assert.equal(res.body.data.conversations[0].accountSide, 'visitor');

    const adminRes = response();
    await adminUsers.getAccountOverview({ params: { id: String(ids.admin) } }, adminRes, assert.ifError);
    assert.equal(adminRes.statusCode, 404);
});

test('admin can deactivate and reactivate clients and visitors but not Admin', async () => {
    const res = response();
    await adminUsers.setAccountStatus({ params: { id: String(ids.visitor) }, body: { isActive: false } }, res, assert.ifError);
    assert.equal(res.body.data.isActive, false);
    await adminUsers.setAccountStatus({ params: { id: String(ids.visitor) }, body: { isActive: true } }, response(), assert.ifError);
    assert.deepEqual(calls.setActive.map((call) => call.isActive), [false, true]);

    const bad = response();
    await adminUsers.setAccountStatus({ params: { id: String(ids.client) }, body: { isActive: 'no' } }, bad, assert.ifError);
    assert.equal(bad.statusCode, 400);

    const adminRes = response();
    await adminUsers.setAccountStatus({ params: { id: String(ids.admin) }, body: { isActive: false } }, adminRes, assert.ifError);
    assert.equal(adminRes.statusCode, 404);
    assert.equal(accounts.admin.isActive, true);
});

test('admin warnings are validated, stored, and removable', async () => {
    const empty = response();
    await adminUsers.addWarning({ params: { id: String(ids.client) }, body: { message: '   ' } }, empty, assert.ifError);
    assert.equal(empty.statusCode, 400);

    const res = response();
    await adminUsers.addWarning({ params: { id: String(ids.client) }, body: { message: '  Please remove duplicate listings.  ' } }, res, assert.ifError);
    assert.equal(res.statusCode, 201);
    assert.deepEqual(calls.warnings, ['Please remove duplicate listings.']);
    assert.equal(res.body.data.warnings.length, 1);

    const removed = response();
    await adminUsers.removeWarning({ params: { id: String(ids.client), warningId: String(ids.warning) } }, removed, assert.ifError);
    assert.equal(removed.statusCode, 200);
    assert.equal(removed.body.data.warnings.length, 0);

    const missing = response();
    await adminUsers.removeWarning({ params: { id: String(ids.client), warningId: String(ids.warning) } }, missing, assert.ifError);
    assert.equal(missing.statusCode, 404);
});

test('admin can read and delete conversations on known platforms only', async () => {
    const res = response();
    await adminUsers.getConversation({ params: { platform: 'auto', conversationId: String(ids.thread) } }, res, assert.ifError);
    assert.equal(res.body.data.platform, 'auto');

    const unknown = response();
    await adminUsers.getConversation({ params: { platform: 'property', conversationId: String(ids.thread) } }, unknown, assert.ifError);
    assert.equal(unknown.statusCode, 404);

    const deleted = response();
    await adminUsers.deleteConversation({ params: { platform: 'auto', conversationId: String(ids.thread) } }, deleted, assert.ifError);
    assert.equal(deleted.statusCode, 200);
    assert.deepEqual(calls.deletedThreads, [String(ids.thread)]);
});
