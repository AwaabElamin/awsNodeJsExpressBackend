const assert = require('node:assert/strict');
const { test } = require('node:test');
function mock(name, exports) {
    const filename = require.resolve(name);
    require.cache[filename] = { id: filename, filename, loaded: true, exports };
}
const owner = 'seller';
const key = 'autohub/seller/groceries/12345678-1234-1234-1234-123456789abc.jpg';
const otherKey = 'autohub/other/groceries/12345678-1234-1234-1234-123456789abc.jpg';
let saved;
mock('../models/users', { getPublicSellerProfiles: async () => [] });
mock('../models/groceryProduct', {
    addProduct: async (data, ownerId) => { saved = { ...data, ownerId }; return saved; },
    updateProduct: async (id, ownerId, email, data) => { saved = { ...data, ownerId }; return saved; },
    getProductsForOwner: async () => [saved],
    getPublicProducts: async () => [saved]
});
mock('../lib/autoHubS3', {
    createPhotoUpload: async (id, type, size, namespace) => ({ key: namespace + '/' + id, type, size }),
    getPhotoUrl: async (value, id, namespace) => value.startsWith('http') ? value : 'signed:' + namespace + ':' + id + ':' + value
});
const groceries = require('../controllers/groceries');
const body = { title: 'Rice', category: 'Pantry', unit: '1kg', price: 5, country: 'US', state: 'TX', mainPhoto: key, photos: [key, 'https://example.invalid/photo.jpg'] };
const req = (input = body) => ({ body: input, autoUser: { id: owner, email: 'seller@example.invalid' } });
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } });

test('grocery upload URL is scoped to the authenticated owner and namespace', async () => {
    const res = response();
    await groceries.createPhotoUploadUrl(req({ contentType: 'image/png', size: 10, ownerId: 'other' }), res, assert.ifError);
    assert.equal(res.body.data.key, 'groceries/seller');
});
test('create and update store keys, return signed images, and preserve URL fallback', async () => {
    for (const handler of [groceries.create, groceries.update]) {
        const res = response();
        await handler(req(body), res, assert.ifError);
        assert.equal(saved.mainPhoto, key);
        assert.deepEqual(saved.photos, body.photos);
        assert.equal(res.body.data.mainPhotoKey, key);
        assert.equal(res.body.data.mainPhoto, 'signed:groceries:seller:' + key);
        assert.equal(res.body.data.photos[1], body.photos[1]);
    }
    const mine = response();
    await groceries.listMine(req(), mine, assert.ifError);
    assert.deepEqual(mine.body.data[0].photoKeys, body.photos);
    const publicResponse = response();
    await groceries.listPublic({}, publicResponse, assert.ifError);
    const product = publicResponse.body.data[0];
    assert.equal(product.mainPhoto, 'signed:groceries:seller:' + key);
    assert.equal(product.photos[1], body.photos[1]);
    assert.equal('mainPhotoKey' in product, false);
    assert.equal('photoKeys' in product, false);
    assert.equal('ownerId' in product, false);
});
test('foreign, malformed and excessive keys are rejected, not silently discarded', async () => {
    for (const input of [
        { ...body, mainPhoto: otherKey },
        { ...body, photos: [otherKey] },
        { ...body, photos: ['autohub/seller/groceries/../secret.jpg'] },
        { ...body, photos: Array(21).fill(key) }
    ]) {
        const res = response();
        await groceries.create(req(input), res, assert.ifError);
        assert.equal(res.statusCode, 400);
    }
});

test('grocery platform guard denies visitors and accounts without access', () => {
    const guard = require('../middleware/requirePlatform')('groceries');
    for (const account of [{ role: 'Visitors', platforms: ['groceries'] }, { role: 'Client', platforms: [] }, null]) {
        const res = response();
        let allowed = false;
        guard({ account }, res, () => { allowed = true; });
        assert.equal(allowed, false);
        assert.equal(res.statusCode, 403);
    }
    let allowed = false;
    guard({ account: { role: 'Client', platforms: ['groceries'] } }, response(), () => { allowed = true; });
    assert.equal(allowed, true);
});
