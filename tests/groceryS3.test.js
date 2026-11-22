const assert = require('node:assert/strict');
const { test } = require('node:test');
process.env.AWS_ACCESS_KEY_ID = 'test';
process.env.AWS_SECRET_ACCESS_KEY = 'test';
process.env.AUTOHUB_S3_BUCKET = 'example-test-bucket';
const { createPhotoUpload, getPhotoUrl } = require('../lib/autoHubS3');

test('grocery presigning uses scoped keys and supports signed reads', async () => {
    const upload = await createPhotoUpload('seller', 'image/png', 123, 'groceries');
    assert.match(upload.key, /^autohub\/seller\/groceries\/[0-9a-f-]+\.png$/);
    assert.equal(upload.expiresIn, 300);
    assert.match(upload.uploadUrl, /X-Amz-Signature=/i);
    assert.match(await getPhotoUrl(upload.key, 'seller', 'groceries'), /X-Amz-Signature=/i);
    assert.equal(await getPhotoUrl(upload.key, 'other', 'groceries'), '');
    assert.equal(await getPhotoUrl('https://example.invalid/a.jpg', 'seller', 'groceries'), 'https://example.invalid/a.jpg');
});
test('presigning rejects unsupported types and sizes', async () => {
    for (const [type, size] of [['image/gif', 1], ['image/png', 0], ['image/png', 10 * 1024 * 1024 + 1]]) {
        await assert.rejects(createPhotoUpload('seller', type, size, 'groceries'), /Choose a JPEG/);
    }
});
