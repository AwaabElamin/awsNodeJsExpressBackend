const crypto = require('crypto');
const { GetObjectCommand, PutObjectCommand, S3Client } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const maxPhotoBytes = 10 * 1024 * 1024;
const extensionByType = new Map([
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/webp', 'webp']
]);

const s3 = new S3Client({
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1'
});

function getBucket() {
    const bucket = process.env.AUTOHUB_S3_BUCKET;
    if (!bucket) {
        throw new Error('AUTOHUB_S3_BUCKET is required for AutoHub photo uploads.');
    }
    return bucket;
}

async function createPhotoUpload(ownerId, contentType, size) {
    const extension = extensionByType.get(String(contentType || '').toLowerCase());
    const fileSize = Number(size);
    if (!extension || !Number.isSafeInteger(fileSize) || fileSize < 1 || fileSize > maxPhotoBytes) {
        throw new Error('Choose a JPEG, PNG, or WebP image up to 10 MB.');
    }

    const ownerKey = String(ownerId);
    const key = `autohub/${ownerKey}/${crypto.randomUUID()}.${extension}`;
    const command = new PutObjectCommand({
        Bucket: getBucket(),
        Key: key,
        ContentType: contentType,
        ContentLength: fileSize,
        ServerSideEncryption: 'AES256'
    });
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
    return { key, uploadUrl, expiresIn: 300 };
}

async function getPhotoUrl(key, ownerId) {
    if (typeof key !== 'string' || !key) return '';
    if (/^https?:\/\//i.test(key)) return key;

    const expectedPrefix = `autohub/${String(ownerId)}/`;
    if (!key.startsWith(expectedPrefix)) return '';

    const command = new GetObjectCommand({ Bucket: getBucket(), Key: key });
    return getSignedUrl(s3, command, { expiresIn: 3600 });
}

module.exports = { createPhotoUpload, getPhotoUrl, maxPhotoBytes };
