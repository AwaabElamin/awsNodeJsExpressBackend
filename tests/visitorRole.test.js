const assert = require('node:assert/strict');
const { test } = require('node:test');
function mockModule(name, exports) {
    const filename = require.resolve(name);
    require.cache[filename] = { id: filename, filename, loaded: true, exports };
}
let account;
let created;
let upgrades = 0;
let profileFields;
mockModule('../models/users', {
    create: async (user) => { created = user; return { _id: 'new-user' }; },
    findByEmail: async () => account,
    updateProfile: async (id, fields) => {
        assert.equal(id, 'visitor-id');
        profileFields = fields;
        return { ...account, ...fields };
    },
    createWorkspace: async (email) => { assert.equal(email, 'visitor@example.invalid'); upgrades++; return { role: 'Client' }; }
});
mockModule('../lib/mailer', { sendVerificationEmail: async () => {} });
const controller = require('../controllers/users');
const requirePlatform = require('../middleware/requirePlatform');
function response() {
    return {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };
}
test('public registration ignores submitted role and creates Visitors', async () => {
    const res = response();
    await controller.create({ body: { user: {
        email: 'visitor@example.invalid', password: 'test-only-password', role: 'Admin',
        firstname: 'Test', lastname: 'Visitor'
    } } }, res);
    assert.equal(res.statusCode, 201);
    assert.equal(created.role, 'Visitors');
});
test('verified Visitors explicitly upgrade to Client; existing Clients stay unchanged', async () => {
    account = { role: 'Visitors', emailVerified: true };
    upgrades = 0;
    const req = { user: { email: 'visitor@example.invalid' } };
    const res = response();
    await controller.createWorkspace(req, res, assert.ifError);
    assert.equal(res.body.data.role, 'Client');
    assert.equal(upgrades, 1);
    account = { role: 'Client', emailVerified: true };
    await controller.createWorkspace(req, response(), assert.ifError);
    assert.equal(upgrades, 1);
});
test('unverified visitors cannot upgrade', async () => {
    account = { role: 'Visitors', emailVerified: false };
    const res = response();
    await controller.createWorkspace({ user: { email: 'visitor@example.invalid' } }, res, assert.ifError);
    assert.equal(res.statusCode, 403);
});
test('Visitors cannot access seller platform even if platform flag exists', () => {
    const res = response();
    let nextCalled = false;
    requirePlatform('auto')({ account: { role: 'Visitors', platforms: ['auto'] } }, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
});
test('Visitors can edit their own profile without changing role or email', async () => {
    account = { _id: 'visitor-id', role: 'Visitors', email: 'visitor@example.invalid' };
    const res = response();
    await controller.updateProfile({
        user: { email: account.email },
        body: { firstname: 'Updated', lastname: 'Visitor', phone: '123', role: 'Admin', _id: 'other' }
    }, res, assert.ifError);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(profileFields, { firstname: 'Updated', lastname: 'Visitor', phone: '123' });
    assert.equal(res.body.data.email, 'visitor@example.invalid');
});
test('profile update explicitly rejects email changes', async () => {
    const res = response();
    await controller.updateProfile({
        user: { email: 'visitor@example.invalid' },
        body: { email: 'other@example.invalid', firstname: 'Changed' }
    }, res, assert.ifError);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /Email address cannot be changed/);
});
