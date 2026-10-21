const crypto = require('crypto');
const path = require('path');
const dotenv = require('dotenv');

module.exports = function configureLocalEnvironment() {
    dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

    const mongoUri = process.env.LOCAL_MONGODB_URI || 'mongodb://127.0.0.1:27018/awaab_local_users';
    let parsedUri;
    try {
        parsedUri = new URL(mongoUri);
    } catch (_) {
        throw new Error('LOCAL_MONGODB_URI must point to the isolated local MongoDB container.');
    }

    if (
        parsedUri.protocol !== 'mongodb:' ||
        !['127.0.0.1', 'localhost'].includes(parsedUri.hostname) ||
        parsedUri.port !== '27018' ||
        parsedUri.pathname !== '/awaab_local_users' ||
        parsedUri.username ||
        parsedUri.password
    ) {
        throw new Error('Refusing to start locally: MongoDB must be 127.0.0.1:27018/awaab_local_users.');
    }

    process.env.MONGODB_URI = mongoUri;
    process.env.MONGODB_URI_USERS = mongoUri;
    process.env.MONGODB_DB_RESUME = 'awaab_local_resume';
    process.env.MONGODB_DB_CARSHOP = 'awaab_local_carshop';
    process.env.MONGODB_DB_DELIVERY = 'awaab_local_delivery';
    process.env.MONGODB_DB_GROCERIES = 'awaab_local_groceries';
    process.env.MONGODB_DB_PROPERTY_MANAGEMENT = 'awaab_local_property_management';
    process.env.PORT = '3001';
    process.env.FRONTEND_URL = 'http://127.0.0.1:5173';
    process.env.JWT_SECRET = process.env.LOCAL_JWT_SECRET || crypto.randomBytes(32).toString('hex');
    process.env.AUTOHUB_S3_BUCKET = '';
    process.env.LOCAL_PROFILE_PHOTO_UPLOAD_DISABLED = 'true';

    for (const key of ['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM']) {
        process.env[key] = '';
    }

    return { mongoUri };
};
